/** Upload bounds include room for high-density displays. Never crop or upscale. */
export const IMAGE_UPLOAD_PROFILES = {
  avatar: { maxWidth: 512, maxHeight: 512, quality: 0.8 },
  providerLogo: { maxWidth: 512, maxHeight: 512, quality: 0.85 },
  providerBanner: { maxWidth: 1920, maxHeight: 960, quality: 0.8 },
  courseThumbnail: { maxWidth: 1280, maxHeight: 720, quality: 0.8 },
  editor: { maxWidth: 1920, maxHeight: 1920, quality: 0.85 },
  qa: { maxWidth: 1280, maxHeight: 1280, quality: 0.78 },
  chat: { maxWidth: 2048, maxHeight: 2048, quality: 0.88 },
  resource: { maxWidth: 2560, maxHeight: 2560, quality: 0.9 },
} as const;

export type ImageUploadProfile = keyof typeof IMAGE_UPLOAD_PROFILES;

export interface PreparedQaImageResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  savedPercent: number;
}

const QA_MAX_RAW_BYTES = 15 * 1024 * 1024; // 15 MB đầu vào tối đa
const QA_MAX_GIF_BYTES = 3 * 1024 * 1024;  // 3 MB cho GIF
const QA_TARGET_BYTES = 380 * 1024;        // Mục tiêu ~380 KB để Q&A luôn nhẹ mượt

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function encodeCanvasBlob(
  canvas: HTMLCanvasElement,
  mime: "image/webp" | "image/jpeg",
  quality: number,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("Không nén được ảnh. Vui lòng thử lại.")),
      mime,
      quality,
    );
  });
}

/**
 * Compress display images before building the request. Preserve transparency and
 * the original aspect ratio. GIF/SVG and non-image attachments pass through so
 * animations, vectors and downloadable documents retain their original content.
 * Decode/encode failures stop the upload instead of silently sending a huge file.
 */
export async function prepareImageUpload(
  file: File,
  profile: ImageUploadProfile,
): Promise<File> {
  if (!file.type.startsWith("image/") || /^image\/(gif|svg\+xml)$/i.test(file.type)) return file;

  const bounds = IMAGE_UPLOAD_PROFILES[profile];
  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement("canvas");
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Không đọc được ảnh. Vui lòng chọn ảnh khác."));
      image.src = sourceUrl;
    });
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height) throw new Error("Kích thước ảnh không hợp lệ.");
    const scale = Math.min(1, bounds.maxWidth / width, bounds.maxHeight / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await encodeCanvasBlob(canvas, "image/webp", bounds.quality);
    // Some browsers fall back to PNG when WebP encoding is unavailable.
    // Keep the smaller original only when it already satisfies the dimensions.
    if (scale === 1 && blob.size >= file.size) return file;
    const extension = blob.type === "image/webp" ? "webp" : "png";
    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}.${extension}`, {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
    image.onload = null;
    image.onerror = null;
    // Release the canvas backing store after each file in a batch.
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Nén ảnh thích ứng chuyên dụng cho Hỏi đáp Realtime:
 * - Chặn file không phải ảnh hoặc SVG, chặn file đầu vào > 15MB.
 * - Tự động resize (tối đa 1280px) và nén đa vòng về mục tiêu <= 380KB để không làm nặng/vỡ Q&A.
 */
export async function prepareQaImageUpload(file: File): Promise<PreparedQaImageResult> {
  if (!file.type.startsWith("image/") || /^image\/svg\+xml$/i.test(file.type)) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WebP, AVIF hoặc GIF.");
  }
  if (file.size > QA_MAX_RAW_BYTES) {
    throw new Error("Ảnh gốc vượt quá 15MB. Vui lòng chọn ảnh nhẹ hơn.");
  }

  if (/^image\/gif$/i.test(file.type)) {
    if (file.size > QA_MAX_GIF_BYTES) {
      throw new Error("Ảnh GIF vượt quá 3MB. Vui lòng chọn ảnh nhẹ hơn.");
    }
    return {
      file,
      originalBytes: file.size,
      compressedBytes: file.size,
      width: 0,
      height: 0,
      savedPercent: 0,
    };
  }

  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement("canvas");
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Không đọc được ảnh. Vui lòng chọn ảnh khác."));
      image.src = sourceUrl;
    });

    const { naturalWidth: rawW, naturalHeight: rawH } = image;
    if (!rawW || !rawH) throw new Error("Kích thước ảnh không hợp lệ.");

    const attempts: Array<{ maxDim: number; quality: number }> = [
      { maxDim: IMAGE_UPLOAD_PROFILES.qa.maxWidth, quality: IMAGE_UPLOAD_PROFILES.qa.quality },
      { maxDim: IMAGE_UPLOAD_PROFILES.qa.maxWidth, quality: 0.66 },
      { maxDim: 960, quality: 0.62 },
      { maxDim: 960, quality: 0.52 },
    ];

    let bestBlob: Blob | null = null;
    let bestWidth = rawW;
    let bestHeight = rawH;

    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.maxDim / rawW, attempt.maxDim / rawH);
      const targetW = Math.max(1, Math.round(rawW * scale));
      const targetH = Math.max(1, Math.round(rawH * scale));
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, targetW, targetH);

      let blob = await encodeCanvasBlob(canvas, "image/webp", attempt.quality);
      // Nếu trình duyệt không hỗ trợ WebP và rơi về PNG cồng kềnh, chuyển sang JPEG nhẹ
      if (blob.type !== "image/webp") {
        blob = await encodeCanvasBlob(canvas, "image/jpeg", Math.min(0.82, attempt.quality + 0.04));
      }

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
        bestWidth = targetW;
        bestHeight = targetH;
      }

      if (blob.size <= QA_TARGET_BYTES) {
        break;
      }
    }

    if (!bestBlob) {
      throw new Error("Không nén được ảnh. Vui lòng thử lại.");
    }

    const withinBounds =
      rawW <= IMAGE_UPLOAD_PROFILES.qa.maxWidth && rawH <= IMAGE_UPLOAD_PROFILES.qa.maxHeight;
    if (withinBounds && bestBlob.size >= file.size) {
      return {
        file,
        originalBytes: file.size,
        compressedBytes: file.size,
        width: rawW,
        height: rawH,
        savedPercent: 0,
      };
    }

    const ext =
      bestBlob.type === "image/webp"
        ? "webp"
        : bestBlob.type === "image/jpeg"
          ? "jpg"
          : "png";
    const stem = file.name.replace(/\.[^.]+$/, "") || "qa-image";
    const compressedFile = new File([bestBlob], `${stem}.${ext}`, {
      type: bestBlob.type,
      lastModified: file.lastModified,
    });

    const savedPercent =
      file.size > 0 ? Math.max(0, Math.round((1 - compressedFile.size / file.size) * 100)) : 0;

    return {
      file: compressedFile,
      originalBytes: file.size,
      compressedBytes: compressedFile.size,
      width: bestWidth,
      height: bestHeight,
      savedPercent,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
    image.onload = null;
    image.onerror = null;
    canvas.width = 0;
    canvas.height = 0;
  }
}

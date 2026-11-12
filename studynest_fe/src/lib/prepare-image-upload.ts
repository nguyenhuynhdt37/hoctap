/** Upload bounds include room for high-density displays. Never crop or upscale. */
export const IMAGE_UPLOAD_PROFILES = {
  avatar: { maxWidth: 512, maxHeight: 512, quality: 0.8 },
  providerLogo: { maxWidth: 512, maxHeight: 512, quality: 0.85 },
  providerBanner: { maxWidth: 1920, maxHeight: 960, quality: 0.8 },
  courseThumbnail: { maxWidth: 1280, maxHeight: 720, quality: 0.8 },
  editor: { maxWidth: 1920, maxHeight: 1920, quality: 0.85 },
  chat: { maxWidth: 2048, maxHeight: 2048, quality: 0.88 },
  resource: { maxWidth: 2560, maxHeight: 2560, quality: 0.9 },
} as const;

export type ImageUploadProfile = keyof typeof IMAGE_UPLOAD_PROFILES;

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

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Không nén được ảnh. Vui lòng thử lại.")),
        "image/webp",
        bounds.quality,
      );
    });
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

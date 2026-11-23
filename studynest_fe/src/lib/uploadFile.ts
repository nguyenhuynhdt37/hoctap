import { type ImageUploadProfile, prepareImageUpload } from "@/lib/prepare-image-upload";
import api from "@/lib/utils/fetcher/client/axios";

export interface UploadFileOptions {
  profile?: ImageUploadProfile;
  skipPrepare?: boolean;
}

export async function uploadFile(
  file: File,
  folder?: string,
  bucket?: string,
  options?: UploadFileOptions,
): Promise<string> {
  const formData = new FormData();
  const payload = options?.skipPrepare
    ? file
    : await prepareImageUpload(file, options?.profile ?? "editor");
  formData.append("file", payload);
  if (folder) formData.append("folder", folder);
  if (bucket) formData.append("bucket", bucket);

  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

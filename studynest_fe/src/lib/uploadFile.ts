import api from "@/lib/utils/fetcher/client/axios";

export async function uploadFile(
  file: File,
  folder?: string,
  bucket?: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) formData.append("folder", folder);
  if (bucket) formData.append("bucket", bucket);

  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

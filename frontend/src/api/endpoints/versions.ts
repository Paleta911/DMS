// Versions API endpoint: download specific document version with original filename
import { http } from "../http";

// Download version as blob; preserves original filename from content-disposition header
export async function downloadVersion(id: number) {
  const response = await http.get(`/versions/${id}/download`, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"];
  return { blob: response.data as Blob, disposition };
}

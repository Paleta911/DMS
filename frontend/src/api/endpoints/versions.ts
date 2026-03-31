import { http } from '../http';

export async function downloadVersion(id: number) {
  const response = await http.get(`/versions/${id}/download`, {
    responseType: 'blob',
  });
  const disposition = response.headers['content-disposition'];
  return { blob: response.data as Blob, disposition };
}

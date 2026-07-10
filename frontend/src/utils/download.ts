// Browser file download utilities: create blob/file and trigger client-side download
// Automatically cleans up object URLs to prevent memory leaks

// Download any blob as file; creates temporary URL and simulates user download click
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Download plain text or custom MIME type as file
export function downloadText(
  content: string,
  filename: string,
  type = "text/plain;charset=utf-8",
) {
  downloadBlob(new Blob([content], { type }), filename);
}

// Download object as formatted JSON file (2-space indentation)
export function downloadJson(value: unknown, filename: string) {
  downloadText(
    JSON.stringify(value, null, 2),
    filename,
    "application/json;charset=utf-8",
  );
}

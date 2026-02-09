export async function downloadDriveFile(
  fileId: string,
  accessToken: string,
): Promise<Blob> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Drive download failed (${response.status}).`);
  }

  return response.blob();
}

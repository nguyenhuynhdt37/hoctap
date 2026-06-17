/**
 * Convert Google Drive URL to embeddable format
 * Handles both /uc?id= and /file/d/ formats
 */
export const getGoogleDriveImageUrl = (url: string): string => {
  if (!url || !url.includes("drive.google.com")) {
    return url;
  }

  // Extract file ID from different Google Drive URL formats
  let fileId: string | null = null;

  // Format 1: /uc?id=xxx
  const ucMatch = url.match(/\/uc\?id=([a-zA-Z0-9-_]+)/);
  if (ucMatch) {
    fileId = ucMatch[1];
  }

  // Format 2: /file/d/xxx
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (fileMatch) {
    fileId = fileMatch[1];
  }

  // If file ID found, convert to thumbnail format (most reliable)
  if (fileId) {
    // Use thumbnail API which is more reliable than /uc?id=
    // Try multiple sizes for better compatibility
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  // Fallback: try export=view format
  if (ucMatch) {
    return url.replace("/uc?id=", "/uc?export=view&id=");
  }

  return url;
};

import { BASE_URL } from '../services/api'

/**
 * Chuyển đổi đường dẫn tương đối (ví dụ: /uploads/...) thành URL đầy đủ.
 */
export function getFullImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return convertGoogleDriveUrl(path)

  // Lấy domain từ BASE_URL (bỏ đoạn /api/v1)
  const domain = BASE_URL.replace('/api/v1', '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  return `${domain}${cleanPath}`
}

/**
 * Convert Google Drive URL sang direct download link.
 * Drive share URL: https://drive.google.com/file/d/FILE_ID/view
 * Direct URL: https://drive.google.com/uc?export=view&id=FILE_ID
 */
function convertGoogleDriveUrl(url: string): string {
  // Check nếu là Google Drive URL
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (driveMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`
  }

  // Check nếu là Google Drive thumbnail URL
  const thumbnailMatch = url.match(/lh3\.googleusercontent\.com\/([^?]+)/)
  if (thumbnailMatch) {
    // Return nguyên URL vì đã là direct link
    return url
  }

  return url
}

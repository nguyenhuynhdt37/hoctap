export const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "Đang cập nhật";
  }
};

export const formatDuration = (seconds: number) => {
  if (!seconds) return "Đang cập nhật";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}g ${minutes}p`;
  }
  return `${minutes} phút`;
};

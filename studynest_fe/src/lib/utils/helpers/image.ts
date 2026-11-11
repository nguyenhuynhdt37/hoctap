/** Stored assets use stable application URLs; external image URLs pass through. */
export const getImageUrl = (url: string): string => url;

/** React's delegated error handler must not retry the same broken image forever. */
export const handleImageError = (event: { currentTarget: HTMLImageElement }) => {
  const fallback = "/logo/studynest-logo.svg";
  const image = event.currentTarget;
  if (image.getAttribute("src") !== fallback) image.src = fallback;
};

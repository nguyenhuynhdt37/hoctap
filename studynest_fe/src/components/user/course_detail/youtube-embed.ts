export const toYoutubeEmbedUrl = (source: string): string => {
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (videoIdPattern.test(source)) return `https://www.youtube.com/embed/${source}`;

  try {
    const url = new URL(source);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return "";

    const [, route, id] = url.pathname.split("/");
    const isYouTube = ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname);
    let videoId: string | null = null;
    if (url.hostname === "youtu.be") videoId = route;
    if (isYouTube && route === "watch") videoId = url.searchParams.get("v");
    if (isYouTube && ["embed", "shorts", "v"].includes(route)) videoId = id;
    if (!videoId || !videoIdPattern.test(videoId)) return "";

    const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
    for (const option of ["start", "end", "autoplay", "rel", "controls", "mute"]) {
      const value = url.searchParams.get(option);
      if (value && /^\d+$/.test(value)) embed.searchParams.set(option, value);
    }
    return embed.href;
  } catch {
    return "";
  }
};

export function getYouTubeEmbedUrl(url: string | null): string | undefined {
  if (!url) return undefined
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : url
}

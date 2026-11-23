import type { LearningPath } from "@/types/learning-paths";

export function getPathThumbnail(path?: LearningPath) {
  return path?.thumbnail_url?.trim() || path?.stages
    ?.flatMap((stage) => stage.groups)
    .flatMap((group) => group.options)
    .find((option) => option.thumbnail?.trim())?.thumbnail;
}

"use client";

import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/utils/helpers/image";
import Image from "next/image";
import { useState } from "react";

export const mayPortrait = "/images/learning-hub/may-cloud.jpg";
export const academyCover = "/images/learning-hub/academy-cover.webp";
export const pathCover = "/images/learning-hub/welcome-cover.webp";

const optimizedOrigins = new Set((process.env.NEXT_PUBLIC_OPTIMIZED_STUDY_IMAGE_ORIGINS ?? "").split(","));

function resolveSource(src?: string | null) {
  const value = src?.trim();
  if (!value) return null;
  const url = getImageUrl(value);
  if (url.startsWith("/") && !/^\/[\/\\]/.test(url)) return { url, unoptimized: false };
  try {
    const remote = new URL(url);
    if (["http:", "https:"].includes(remote.protocol) && !remote.username && !remote.password) {
      // Legacy asset URLs can still render directly without widening the optimizer's allowlist.
      return { url: remote.href, unoptimized: !optimizedOrigins.has(remote.origin) };
    }
  } catch {
    // Malformed image metadata uses the brand fallback.
  }
  return null;
}

export function StudyImage({ src, alt = "", sizes, fallback = academyCover, className, imageClassName, priority = false }: {
  src?: string | null;
  alt?: string;
  sizes: string;
  fallback?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const candidate = resolveSource(src);
  const image = candidate?.url !== failedSource ? candidate : null;

  return (
    <span className={cn("relative block overflow-hidden rounded-2xl bg-primary-light", className)}>
      <Image
        key={image?.url ?? fallback}
        src={image?.url ?? fallback}
        alt={image ? alt : ""}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={image?.unoptimized}
        className={cn("object-cover", image && imageClassName)}
        onError={image ? () => setFailedSource(image.url) : undefined}
      />
    </span>
  );
}

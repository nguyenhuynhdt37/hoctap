import Image from "next/image";

export function MayMascot({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/videos/studynest/scene-mascot.jpg"
      alt=""
      width={1920}
      height={1080}
      priority={priority}
      sizes="(min-width: 1024px) 420px, 300px"
      className={className}
    />
  );
}

import Image from "next/image";

const VIDEO_SRC = "/videos/auth/auth-bg.mp4";
const VIDEO_MOBILE_SRC = "/videos/auth/auth-bg-mobile.mp4";
const POSTER_SRC = "/videos/auth/auth-poster.jpg";

const ScenicVideo = ({ className }: { className?: string }) => (
  <div className={className}>
    <Image
      src={POSTER_SRC}
      alt=""
      fill
      className="object-cover"
      sizes="(min-width: 1024px) 55vw, 100vw"
      priority
    />
    <video
      className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      autoPlay
      muted
      loop
      playsInline
      poster={POSTER_SRC}
      aria-hidden="true"
    >
      <source src={VIDEO_MOBILE_SRC} type="video/mp4" media="(max-width: 767px)" />
      <source src={VIDEO_SRC} type="video/mp4" />
    </video>
  </div>
);

interface AuthScenicLayoutProps {
  children: React.ReactNode;
}

const AuthScenicLayout = ({ children }: AuthScenicLayoutProps) => {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-primary-light lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(400px,0.92fr)]">
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <ScenicVideo className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b3348]/30 via-[#356FA7]/10 to-[#1b3348]/50" />
      </div>
      <section className="relative z-10 hidden lg:block lg:min-h-dvh">
        <div className="relative z-10 flex h-full min-h-dvh flex-col justify-end p-10 pb-24 xl:p-14 xl:pb-28">
          <div className="max-w-md text-white">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Học viện trên mây
            </p>
            <h2 className="font-display text-4xl leading-tight xl:text-5xl">
              Khơi nguồn tri thức từ những tầng mây sáng.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">
              Mây Mây đồng hành cùng học sinh từ những bài học đầu tiên đến các
              kỳ thi lớn.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-20 sm:px-8 lg:py-10">
        <div className="w-full max-w-md [&>*]:border-white/70 [&>*]:bg-surface/85 [&>*]:shadow-lg [&>*]:backdrop-blur-2xl">
          {children}
        </div>
      </section>
    </div>
  );
};

export default AuthScenicLayout;

"use client";

import { Alert, Card } from "@/components/ui";
import { ChevronRight, Code, HelpCircle, Video } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const LessonsCreate = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const lessonTypes = [
    {
      id: "video",
      title: "Bài học Video",
      description: "Tạo bài học bằng video từ YouTube hoặc upload file video",
      icon: Video,
      iconBg: "bg-primary-light border border-primary-pastel text-primary",
    },
    {
      id: "code",
      title: "Bài học Code",
      description: "Tạo bài học lập trình với code editor và test cases",
      icon: Code,
      iconBg: "bg-info-bg border border-info-border text-info-foreground",
    },
    {
      id: "quiz",
      title: "Bài Quiz",
      description: "Tạo câu hỏi trắc nghiệm để kiểm tra kiến thức",
      icon: HelpCircle,
      iconBg: "bg-warning-bg border border-warning-border text-warning-foreground",
    },
  ];

  const handleSelectType = (type: string) => {
    const params = new URLSearchParams();
    if (sectionId) params.set("section_id", sectionId);
    if (courseId) params.set("course_id", courseId);

    switch (type) {
      case "video":
        router.push(`/lecturer/lessons/create/video?${params.toString()}`);
        break;
      case "code":
        router.push(`/lecturer/lessons/create/code?${params.toString()}`);
        break;
      case "quiz":
        router.push(`/lecturer/lessons/create/quizzes?${params.toString()}`);
        break;
      default:
        break;
    }
  };

  if (!sectionId || !courseId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Alert variant="destructive" title="Thiếu thông tin">
            Thiếu thông tin section_id hoặc course_id. Vui lòng quay lại trang
            trước.
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-2">
            Tạo bài học mới
          </h1>
          <p className="text-muted-foreground">
            Chọn loại bài học bạn muốn tạo cho khóa học
          </p>
        </div>

        {/* Lesson Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {lessonTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className="bg-surface rounded-2xl border border-border p-6 text-left transition-all duration-300 hover:shadow-md hover:border-primary-pastel hover:-translate-y-0.5 group cursor-pointer"
              >
                <div
                  className={`w-14 h-14 ${type.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {type.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {type.description}
                </p>
                <div className="mt-4 flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                  <span>Chọn loại này</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Box */}
        <Card variant="pastel-blue" className="mt-8 p-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                Thông tin quan trọng
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mỗi loại bài học có các tính năng và yêu cầu khác nhau. Bạn có
                thể tạo nhiều loại bài học khác nhau trong cùng một khóa học để
                tạo trải nghiệm học tập phong phú cho học viên.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LessonsCreate;

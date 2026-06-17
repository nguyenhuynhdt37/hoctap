"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { HiCode, HiQuestionMarkCircle, HiVideoCamera } from "react-icons/hi";

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
      icon: HiVideoCamera,
      color: "from-green-500 to-emerald-600",
      hoverColor: "hover:from-green-600 hover:to-emerald-700",
    },
    {
      id: "code",
      title: "Bài học Code",
      description: "Tạo bài học lập trình với code editor và test cases",
      icon: HiCode,
      color: "from-green-500 to-emerald-600",
      hoverColor: "hover:from-green-600 hover:to-emerald-700",
    },
    {
      id: "quiz",
      title: "Bài Quiz",
      description: "Tạo câu hỏi trắc nghiệm để kiểm tra kiến thức",
      icon: HiQuestionMarkCircle,
      color: "from-green-500 to-emerald-600",
      hoverColor: "hover:from-green-600 hover:to-emerald-700",
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 font-medium">
              Thiếu thông tin section_id hoặc course_id. Vui lòng quay lại trang
              trước.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Tạo bài học mới
          </h1>
          <p className="text-gray-600">
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
                className={`bg-white rounded-xl border border-gray-200 p-6 text-left transition-all duration-300 hover:shadow-lg hover:scale-105 group cursor-pointer`}
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${type.color} ${type.hoverColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md`}
                >
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {type.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {type.description}
                </p>
                <div className="mt-4 flex items-center text-green-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                  <span>Chọn loại này</span>
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <h4 className="font-semibold text-green-900 mb-1">
                Thông tin quan trọng
              </h4>
              <p className="text-sm text-green-800 leading-relaxed">
                Mỗi loại bài học có các tính năng và yêu cầu khác nhau. Bạn có
                thể tạo nhiều loại bài học khác nhau trong cùng một khóa học để
                tạo trải nghiệm học tập phong phú cho học viên.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonsCreate;

"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import useSWR from "swr";
import { HiBadgeCheck, HiBookOpen, HiUsers, HiStar } from "react-icons/hi";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

interface TopInstructorItem {
  id: string;
  name: string;
  avatar: string | null;
  student_count: number;
  course_count: number;
  rating_avg: number;
  evaluated_count: number;
}

const InstructorsSection = () => {
  const router = useRouter();
  const { data, isLoading } = useSWR<TopInstructorItem[]>(
    "/users/instructors/top",
    fetcher,
    { revalidateOnFocus: false }
  );

  const instructors = data?.slice(0, 4) || [];

  if (!isLoading && instructors.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
      <div className="absolute top-20 left-20 w-48 h-48 bg-green-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-56 h-56 bg-emerald-200/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-3">
            Giảng viên hàng đầu
          </h2>
          <p className="text-emerald-600 font-medium flex items-center justify-center gap-2">
            <span className="text-green-500">👨‍🏫</span>
            Học từ những chuyên gia có kinh nghiệm thực tế
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-green-100 rounded-xl p-6 text-center animate-pulse"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4" />
                <div className="h-4 bg-green-100 rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-green-100 rounded w-1/2 mx-auto mb-4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {instructors.map((instructor) => (
              <div
                key={instructor.id}
                onClick={() => router.push(`/instructors/${instructor.id}`)}
                className="group bg-white rounded-xl p-6 text-center hover:shadow-2xl hover:shadow-green-100/50 transition-all duration-300 border border-green-100 hover:border-green-300 hover:-translate-y-2 cursor-pointer"
              >
                <div className="relative mb-4 inline-block">
                  <div className="w-20 h-20 rounded-full ring-4 ring-green-100 group-hover:ring-green-300 transition-all duration-300 overflow-hidden">
                    <img
                      src={getGoogleDriveImageUrl(instructor.avatar || "")}
                      alt={instructor.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          instructor.name
                        )}&background=00bba7&color=fff&size=80`;
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <div className="w-7 h-7 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <HiBadgeCheck className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors">
                  {instructor.name}
                </h3>

                {instructor.rating_avg > 0 && (
                  <div className="flex items-center justify-center gap-1 mb-4">
                    <HiStar className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      {instructor.rating_avg.toFixed(1)}
                    </span>
                  </div>
                )}

                <div className="space-y-2 text-xs text-gray-600 mb-4">
                  <div className="flex items-center justify-center gap-1">
                    <HiUsers className="w-4 h-4 text-green-500" />
                    <span className="font-semibold">
                      {instructor.student_count.toLocaleString()}
                    </span>
                    <span>học viên</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <HiBookOpen className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold">{instructor.course_count}</span>
                    <span>khóa học</span>
                  </div>
                </div>

                <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 rounded-lg text-sm font-bold transition-all duration-300 shadow-md hover:shadow-xl">
                  Xem khóa học
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default InstructorsSection;


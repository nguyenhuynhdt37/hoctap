"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
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
    <section className="py-16 bg-[#F6FAFF] relative overflow-hidden border-b border-[#E7EEF7]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#3D4A5A] tracking-tight mb-2">
            Giảng viên hàng đầu
          </h2>
          <p className="text-[#6F7C8C] text-sm font-medium">
            Học từ những chuyên gia có kinh nghiệm thực tế
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-[#E7EEF7] rounded-[20px] p-6 text-center animate-pulse"
              >
                <div className="w-20 h-20 bg-[#E8F2FA] rounded-full mx-auto mb-4" />
                <div className="h-4 bg-[#E8F2FA] rounded-lg w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-[#E8F2FA]/70 rounded-lg w-1/2 mx-auto mb-4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {instructors.map((instructor) => (
              <div
                key={instructor.id}
                onClick={() => router.push(`/instructors/${instructor.id}`)}
                className="group bg-white rounded-[20px] p-6 text-center hover:shadow-md transition-all duration-200 border border-[#E7EEF7] hover:border-[#BFD7ED] hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative mb-4 inline-block">
                    <div className="w-20 h-20 rounded-full ring-4 ring-[#E8F2FA] group-hover:ring-[#BFD7ED] transition-all duration-200 overflow-hidden bg-[#E8F2FA]">
                      <img
                        src={getImageUrl(instructor.avatar || "")}
                        alt={instructor.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            instructor.name
                          )}&background=E8F2FA&color=356FA7&size=80`;
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <div className="w-6 h-6 bg-[#356FA7] rounded-full flex items-center justify-center ring-2 ring-white">
                        <HiBadgeCheck className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-[#3D4A5A] mb-3 group-hover:text-[#356FA7] transition-colors">
                    {instructor.name}
                  </h3>

                  {instructor.rating_avg > 0 && (
                    <div className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF9F6] border border-[#F8E9C9] mb-4">
                      <HiStar className="w-4 h-4 text-[#D99B26]" />
                      <span className="text-xs font-semibold text-[#3D4A5A]">
                        {instructor.rating_avg.toFixed(1)}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-[#6F7C8C] mb-5">
                    <div className="flex items-center justify-center gap-1.5">
                      <HiUsers className="w-4 h-4 text-[#356FA7]" />
                      <span className="font-semibold text-[#3D4A5A]">
                        {instructor.student_count.toLocaleString()}
                      </span>
                      <span>học viên</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <HiBookOpen className="w-4 h-4 text-[#356FA7]" />
                      <span className="font-semibold text-[#3D4A5A]">
                        {instructor.course_count}
                      </span>
                      <span>khóa học</span>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-[#E8F2FA] group-hover:bg-[#356FA7] text-[#356FA7] group-hover:text-white py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer">
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

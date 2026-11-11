"use client";

import { Badge, Button, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRouter } from "next/navigation";
import { HiBadgeCheck, HiBookOpen, HiStar, HiUsers } from "react-icons/hi";
import useSWR from "swr";

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
    <section className="py-16 bg-background relative overflow-hidden border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
            Giảng viên hàng đầu
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Học từ những chuyên gia có kinh nghiệm thực tế
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="text-center">
                <Skeleton variant="circle" className="w-20 h-20 mx-auto mb-4" />
                <Skeleton variant="text" className="w-3/4 mx-auto mb-2" />
                <Skeleton variant="text" className="h-3 w-1/2 mx-auto mb-4" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {instructors.map((instructor) => (
              <Card
                key={instructor.id}
                interactive
                onClick={() => router.push(`/instructors/${instructor.id}`)}
                className="group text-center flex flex-col justify-between"
              >
                <div>
                  <div className="relative mb-4 inline-block">
                    <div className="w-20 h-20 rounded-full ring-4 ring-primary-light group-hover:ring-primary-pastel transition-all duration-200 overflow-hidden bg-primary-light">
                      <img
                        src={getImageUrl(instructor.avatar || "")}
                        alt={instructor.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (
                            e.target as HTMLImageElement
                          ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            instructor.name
                          )}&size=80`;
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center ring-2 ring-surface">
                        <HiBadgeCheck className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {instructor.name}
                  </h3>

                  {instructor.rating_avg > 0 && (
                    <div className="mb-4">
                      <Badge
                        variant="warning"
                        size="sm"
                        icon={<HiStar className="w-3.5 h-3.5" />}
                      >
                        {instructor.rating_avg.toFixed(1)}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-muted-foreground mb-5">
                    <div className="flex items-center justify-center gap-1.5">
                      <HiUsers className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {instructor.student_count.toLocaleString()}
                      </span>
                      <span>học viên</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <HiBookOpen className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {instructor.course_count}
                      </span>
                      <span>khóa học</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="pastel"
                  fullWidth
                  className="group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                >
                  Xem khóa học
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default InstructorsSection;

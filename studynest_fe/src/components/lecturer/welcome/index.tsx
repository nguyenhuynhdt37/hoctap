"use client";

import { Badge, Button, Card } from "@/components/ui";
import { useRouter } from "next/navigation";
import { CircleDollarSign, Play, Users, Video } from "lucide-react";
import { BecomeLecturerAction } from "./become";

const LecturerWelcome = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-grow">
        <section className="relative min-h-[90vh] bg-gradient-to-br from-primary-light via-background to-secondary-light/40 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-16 right-16 w-72 h-72 bg-primary-pastel/30 rounded-full blur-3xl" />
            <div className="absolute bottom-16 left-16 w-80 h-80 bg-secondary-pastel/25 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center min-h-[90vh]">
            <div className="w-full">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <Badge
                  variant="default"
                  size="md"
                  dot
                  className="bg-surface/90 uppercase tracking-wider shadow-2xs"
                >
                  Trở thành giảng viên ngay hôm nay
                </Badge>

                <div className="space-y-5">
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground">
                    <span>Trở thành giảng viên</span>
                    <br />
                    <span className="text-primary">
                      Chia sẻ kiến thức và kiếm thu nhập
                    </span>
                  </h1>

                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                    Tạo khóa học và chia sẻ kiến thức trên Mây Mây. Xem rõ
                    điều kiện đăng ký và chính sách doanh thu trước khi bắt đầu.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center pt-2">
                  <BecomeLecturerAction />

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => router.push("/lecturer/courses/create")}
                    className="px-7 border-primary-pastel text-primary hover:bg-primary-light"
                  >
                    <Play className="h-5 w-5" />
                    Tạo khóa học
                  </Button>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
                <Card className="group hover:shadow-md hover:border-primary-pastel hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4">
                    <Video className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Tạo khóa học dễ dàng
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Công cụ tạo nội dung trực quan, hỗ trợ video, quiz, tài liệu
                  </p>
                </Card>

                <Card className="group hover:shadow-md hover:border-primary-pastel hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-12 h-12 bg-secondary-light rounded-xl flex items-center justify-center mb-4">
                    <CircleDollarSign className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Thu nhập hấp dẫn
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Doanh thu được tính theo chính sách hiện hành và hiển thị
                    trong ví giảng viên sau khi đơn hàng hoàn tất.
                  </p>
                </Card>

                <Card className="group hover:shadow-md hover:border-primary-pastel hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-12 h-12 bg-accent/60 rounded-xl flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Quản lý học viên
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Theo dõi học viên và hoạt động khóa học trong trang quản lý.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LecturerWelcome;

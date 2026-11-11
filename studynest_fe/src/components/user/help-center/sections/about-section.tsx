import { Card } from "@/components/ui";

export function AboutSection() {
  return (
    <div className="space-y-7 text-foreground">
      <div>
        <h3 className="font-display text-2xl font-semibold">Về Mây Mây</h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Mây Mây là nền tảng để học viên tìm khóa học, theo dõi tiến độ và học
          theo lộ trình phù hợp. Danh mục khóa học được cập nhật khi nội dung đã
          sẵn sàng công khai.
        </p>
      </div>

      <section aria-labelledby="about-mission">
        <h4 id="about-mission" className="mb-3 text-lg font-semibold">
          Mục tiêu của chúng tôi
        </h4>
        <p className="leading-relaxed text-muted-foreground">
          Giúp học sinh và gia đình tìm nội dung học tập theo cấp học, lớp và
          môn một cách rõ ràng. Thông tin về từng khóa, giảng viên và giá được
          hiển thị trước khi người học đăng ký.
        </p>
      </section>

      <section aria-labelledby="about-features">
        <h4 id="about-features" className="mb-4 text-lg font-semibold">
          Bạn có thể làm gì trên Mây Mây?
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Tìm khóa học", "Lọc khóa theo lớp, môn và mục tiêu học tập."],
            ["Theo dõi lộ trình", "Xem các chặng học và tiến độ của khóa đã đăng ký."],
            ["Học theo bài", "Truy cập nội dung và bài luyện tập trong khóa đã sở hữu."],
            ["Quản lý quyền lợi", "Xem lịch sử đăng ký và đơn hàng trong tài khoản."],
          ].map(([title, description]) => (
            <Card key={title} className="rounded-2xl border-border bg-surface p-5">
              <h5 className="font-semibold text-foreground">{title}</h5>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

import CatalogAdminNav from "@/components/admin/catalog/catalog-nav";
import CourseAssignment from "@/components/admin/catalog/course-assignment";
export default function Page() {
  return (
    <main className="space-y-6 p-4 text-foreground sm:p-8">
      <CatalogAdminNav />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Phân loại khóa học</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tìm khóa theo tên để gán môn, lớp và đơn vị. Sau đó tuyển chọn khóa
          vào lộ trình hoặc combo.
        </p>
      </header>
      <CourseAssignment />
    </main>
  );
}

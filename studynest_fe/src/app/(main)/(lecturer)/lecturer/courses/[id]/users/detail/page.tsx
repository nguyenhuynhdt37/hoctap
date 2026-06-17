import LecturerStudentDetails from "@/components/lecturer/courses/users/details";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { StudentDetailResponse } from "@/types/lecturer/student-detail";
import { cookies } from "next/headers";
import Link from "next/link";

interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function Page({ params, searchParams }: PageProps) {
  const paramsData = await params;
  const searchParamsData = await searchParams;
  const cookieStore = await cookies();
  const res = await fetcher<StudentDetailResponse>(
    `/lecturer/courses/${paramsData.id}/students/${searchParamsData.user_id}`,
    cookieStore,
    { headers: { accept: "application/json" } }
  );
  if (!res.ok) {
    let message = "Không thể tải dữ liệu học viên";
    try {
      const err = await res.json();
      const normalize = (val: any): string => {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (Array.isArray(val)) {
          // Pydantic style: array of {msg, loc, ...}
          const msgs = val
            .map((v) =>
              typeof v === "string"
                ? v
                : v?.msg || v?.message || JSON.stringify(v)
            )
            .filter(Boolean)
            .join("; ");
          return msgs;
        }
        if (typeof val === "object") {
          // Try common fields
          if (val.msg || val.message) return String(val.msg || val.message);
          return JSON.stringify(val);
        }
        return String(val);
      };
      const detailText = normalize(err?.detail);
      const messageText = normalize(err?.message);
      message =
        detailText || messageText || `${message} (mã lỗi ${res.status})`;
    } catch {}
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 py-6 md:py-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Lỗi tải dữ liệu
            </h1>
            <p className="text-gray-700">{message}</p>
            <div className="mt-4">
              <Link
                href={`/lecturer/courses/${params.id}/users`}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                Quay lại danh sách học viên
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const data: StudentDetailResponse = await res.json();
  return (
    <LecturerStudentDetails
      params={{ id: paramsData.id, userId: searchParamsData.user_id as string }}
      data={data}
    />
  );
}

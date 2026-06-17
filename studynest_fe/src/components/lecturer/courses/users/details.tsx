"use client";

import { StudentDetailResponse } from "@/types/lecturer/student-detail";
import Link from "next/link";

export default function LecturerStudentDetails({
  params,
  data,
}: {
  params: { id: string; userId: string };
  data: StudentDetailResponse;
}) {
  const progressPercent = Math.min(
    100,
    Math.max(0, data.progress?.progress_percent || 0)
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value));
    } catch {
      return "—";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 py-6 md:py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900">
                Học viên: {data.student.fullname}
              </h1>
              <p className="text-gray-600 mt-1">
                Khóa học:{" "}
                <span className="font-semibold">{data.course.title}</span>
              </p>
            </div>
            <Link
              href={`/lecturer/courses/${params.id}/users`}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Tiến độ khóa học
            </div>
            <div className="flex items-center gap-3">
              <div className="w-full max-w-[260px] h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-green-600"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-lg font-bold text-gray-900">
                {progressPercent.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {data.progress.completed_lessons}/{data.course.total_lessons} bài
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Đăng ký & hoạt động
            </div>
            <div className="text-sm text-gray-700">
              <div>Đăng ký: {formatDateTime(data.student.enrolled_at)}</div>
              <div>
                Hoạt động cuối: {formatDateTime(data.student.last_activity)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Giá trị thanh toán
            </div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(data.purchase?.price_paid || 0)}
            </div>
            {data.purchase && (
              <p className="text-xs text-gray-500 mt-1">
                Gốc: {formatCurrency(data.purchase.original_price || 0)} • Giảm:{" "}
                <span className="text-red-600 font-semibold">
                  -{formatCurrency(data.purchase.discount_amount || 0)}
                </span>
                {data.purchase.discount_code
                  ? ` • Mã: ${data.purchase.discount_code}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {data.progress?.current_lesson && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Bài học hiện tại</div>
                <div className="text-lg font-semibold text-gray-900">
                  {data.progress.current_lesson.title}
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">
                Vị trí: {data.progress.current_lesson.position}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Bài học
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Vị trí
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Hoàn thành lúc
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.lessons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-600"
                    >
                      Không có dữ liệu bài học
                    </td>
                  </tr>
                ) : (
                  data.lessons.map((l) => (
                    <tr key={l.lesson_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {l.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{l.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {l.position}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            l.is_completed
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {l.is_completed ? "Đã hoàn thành" : "Chưa hoàn thành"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {formatDateTime(l.completed_at)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

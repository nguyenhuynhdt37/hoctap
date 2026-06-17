"use client";

import { CourseListPanel } from "./course-list-panel";

export default function CoursesMeSection() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Khóa học của tôi
          </h1>
          <p className="text-gray-600">
            Theo dõi và tiếp tục những khóa học bạn đã sở hữu
          </p>
        </div>
        <CourseListPanel />
      </div>
    </div>
  );
}

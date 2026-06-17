"use client";

import { useState } from "react";
import InstructorDetail from "./detail";
import InstructorCourses from "./courses";

interface InstructorTabsProps {
  instructorId: string;
}

const InstructorTabs = ({ instructorId }: InstructorTabsProps) => {
  const [activeTab, setActiveTab] = useState<"detail" | "courses">("detail");

  return (
    <div>
      <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-0">
            <button
              onClick={() => setActiveTab("detail")}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === "detail"
                  ? "border-green-500 text-green-600 bg-white"
                  : "border-transparent text-gray-600 hover:text-green-600 hover:bg-white/50"
              }`}
            >
              Chi tiết giảng viên
            </button>
            <button
              onClick={() => setActiveTab("courses")}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === "courses"
                  ? "border-green-500 text-green-600 bg-white"
                  : "border-transparent text-gray-600 hover:text-green-600 hover:bg-white/50"
              }`}
            >
              Khóa học
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "detail" && (
          <InstructorDetail instructorId={instructorId} />
        )}
        {activeTab === "courses" && (
          <InstructorCourses instructorId={instructorId} />
        )}
      </div>
    </div>
  );
};

export default InstructorTabs;

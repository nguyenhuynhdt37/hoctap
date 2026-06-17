"use client";

import {
  HiBookOpen,
  HiEmojiHappy,
  HiGlobe,
  HiUsers,
} from "react-icons/hi";

const stats = [
  { number: "500K+", label: "Học viên", icon: HiUsers },
  { number: "10K+", label: "Khóa học", icon: HiBookOpen },
  { number: "50+", label: "Quốc gia", icon: HiGlobe },
  { number: "98%", label: "Hài lòng", icon: HiEmojiHappy },
];

const StatsSection = () => {
  return (
    <section className="py-16 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-3">
            StudyNest trong con số
          </h2>
          <p className="text-emerald-600 font-medium">
            Cộng đồng học tập lớn nhất Việt Nam
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-xl border-2 border-green-200">
                  <IconComponent className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-sm font-semibold text-gray-600">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;


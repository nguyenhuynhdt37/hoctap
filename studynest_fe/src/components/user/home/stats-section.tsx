"use client";

import {
  HiBookOpen,
  HiEmojiHappy,
  HiGlobe,
  HiUsers,
} from "react-icons/hi";

const stats = [
  {
    number: "500K+",
    label: "Học viên",
    icon: HiUsers,
    iconBg: "bg-[#E8F2FA] text-[#356FA7] border-[#BFD7ED]/60",
  },
  {
    number: "10K+",
    label: "Khóa học",
    icon: HiBookOpen,
    iconBg: "bg-[#FCE8EF] text-[#8A3B58] border-[#F7C9D9]/60",
  },
  {
    number: "50+",
    label: "Quốc gia",
    icon: HiGlobe,
    iconBg: "bg-[#E3D5F5]/60 text-[#593E7A] border-[#E3D5F5]",
  },
  {
    number: "98%",
    label: "Hài lòng",
    icon: HiEmojiHappy,
    iconBg: "bg-[#F8E9C9]/70 text-[#7A5618] border-[#F8E9C9]",
  },
];

const StatsSection = () => {
  return (
    <section className="py-16 bg-white border-b border-[#E7EEF7]/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#3D4A5A] tracking-tight mb-2">
            StudyNest trong con số
          </h2>
          <p className="text-[#6F7C8C] text-sm font-medium">
            Cộng đồng học tập lớn nhất Việt Nam
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className="text-center group bg-[#F6FAFF]/60 hover:bg-white rounded-[20px] p-6 border border-[#E7EEF7] hover:border-[#BFD7ED] transition-all duration-200 hover:shadow-sm"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-transform duration-200 group-hover:scale-105 ${stat.iconBg}`}
                >
                  <IconComponent className="h-7 w-7" />
                </div>
                <div className="font-display text-3xl font-bold text-[#3D4A5A] mb-1">
                  {stat.number}
                </div>
                <div className="text-sm font-medium text-[#6F7C8C]">
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

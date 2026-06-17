"use client";

import { useState } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";

interface FaqItem {
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    question: "Làm thế nào để đăng ký khóa học?",
    answer:
      "Bạn có thể đăng ký khóa học bằng cách tìm khóa học bạn muốn, nhấn vào nút 'Đăng ký ngay' hoặc 'Mua ngay', sau đó hoàn tất thanh toán. Đối với khóa học miễn phí, bạn chỉ cần nhấn 'Đăng ký ngay' là có thể bắt đầu học ngay.",
  },
  {
    question: "Tôi có thể hoàn tiền nếu không hài lòng?",
    answer:
      "Có, chúng tôi cung cấp chính sách hoàn tiền trong vòng 30 ngày kể từ ngày mua. Bạn chỉ cần liên hệ với bộ phận hỗ trợ và chúng tôi sẽ xử lý yêu cầu hoàn tiền của bạn.",
  },
  {
    question: "Làm thế nào để truy cập khóa học đã mua?",
    answer:
      "Sau khi thanh toán thành công, bạn có thể truy cập khóa học từ trang 'Học tập của tôi' trong menu tài khoản. Tất cả khóa học bạn đã đăng ký sẽ được lưu tại đó.",
  },
  {
    question: "Tôi có thể học trên thiết bị di động không?",
    answer:
      "Có, StudyNest hoàn toàn tương thích với thiết bị di động. Bạn có thể truy cập và học trên điện thoại, máy tính bảng thông qua trình duyệt web hoặc ứng dụng di động.",
  },
  {
    question: "Chứng chỉ có giá trị như thế nào?",
    answer:
      "Chứng chỉ hoàn thành khóa học của StudyNest được công nhận bởi nhiều nhà tuyển dụng và tổ chức giáo dục. Chứng chỉ được cấp sau khi bạn hoàn thành tất cả bài học và đạt điểm số yêu cầu.",
  },
  {
    question: "Làm thế nào để liên hệ với giảng viên?",
    answer:
      "Bạn có thể đặt câu hỏi cho giảng viên thông qua phần Q&A trong mỗi khóa học. Giảng viên sẽ phản hồi trong vòng 24-48 giờ.",
  },
  {
    question: "Tôi quên mật khẩu, làm sao để lấy lại?",
    answer:
      "Bạn có thể nhấn vào 'Quên mật khẩu' trên trang đăng nhập, nhập email của bạn, và chúng tôi sẽ gửi link đặt lại mật khẩu qua email.",
  },
  {
    question: "Khóa học có thời hạn không?",
    answer:
      "Sau khi đăng ký, bạn có quyền truy cập trọn đời vào khóa học. Bạn có thể học bất cứ lúc nào, không giới hạn thời gian.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Câu hỏi thường gặp
        </h3>
        <p className="text-gray-600 mb-6">
          Tìm câu trả lời nhanh cho các câu hỏi phổ biến nhất
        </p>
      </div>

      <div className="space-y-3">
        {faqData.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                {isOpen ? (
                  <HiChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <HiChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


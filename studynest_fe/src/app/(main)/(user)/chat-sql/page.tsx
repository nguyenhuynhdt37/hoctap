import { Metadata } from "next";
import ChatSql from "@/components/user/chat-sql";

export const metadata: Metadata = {
  title: "Trợ lý dữ liệu AI | StudyNest",
  description: "Hỏi đáp về khóa học, tiến độ học tập và dữ liệu của bạn",
};

export default function ChatSqlPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Trợ lý dữ liệu AI
          </h1>
          <p className="text-gray-500 mt-1">
            Hỏi đáp bằng ngôn ngữ tự nhiên về khóa học và tiến độ của bạn
          </p>
        </div>

        {/* Chat Container */}
        <div className="h-[calc(100vh-200px)] min-h-[500px]">
          <ChatSql />
        </div>
      </div>
    </div>
  );
}

import ChatSql from "@/components/user/chat-sql";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trợ lý Mây Mây AI | Mây Mây",
  description:
    "Trò chuyện cùng Mây Mây AI về lộ trình khóa học, tiến độ học tập và dữ liệu của bạn",
};

export default function ChatSqlPage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-1">
            Trợ lý học tập thông minh
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Trợ lý Mây Mây AI
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hỏi đáp tự nhiên cùng Mây Mây về khóa học và tiến độ học tập của bạn
          </p>
        </div>

        <div className="h-[calc(100vh-210px)] min-h-[520px]">
          <ChatSql />
        </div>
      </div>
    </div>
  );
}

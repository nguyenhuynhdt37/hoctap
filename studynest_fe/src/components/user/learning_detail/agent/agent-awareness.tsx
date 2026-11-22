"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useLearningAgent } from "./agent-context";
import type { ScreenActionResult, ScreenContextSnapshot } from "./contracts";
import api from "@/lib/utils/fetcher/client/axios";

const TAB_LABEL: Record<string, string> = {
  lesson: "Bài giảng",
  notes: "Ghi chú",
  tools: "Công cụ",
  overview: "Tổng quan",
};
const QUIZ_LABEL: Record<string, string> = {
  answering: "Đang làm câu hỏi",
  answered: "Đã chọn đáp án",
  submitting: "Đang nộp câu hỏi",
  results: "Kết quả câu hỏi",
};
const SOURCE_LABEL: Record<string, string> = {
  authorized_domain: "Thông tin bài học",
  client_screen: "Màn hình hiện tại",
  owned_thread: "Hội thoại của bạn",
};
const PANEL_LABEL: Record<string, string> = {
  notes: "ghi chú",
  sidebar: "mục lục",
  chat: "khung chat",
  editor: "editor",
};

export function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

export function contextChips(
  lessonTitle: string,
  screen: Partial<ScreenContextSnapshot> | undefined,
  sources: string[],
  busy: boolean,
) {
  const chips: string[] = [];
  const title = lessonTitle.trim();
  if (title) chips.push(title);
  const tab = screen?.active_tab ? TAB_LABEL[screen.active_tab] : undefined;
  if (tab) chips.push(tab);
  const time = screen?.video ? formatClock(screen.video.current_time) : null;
  if (time)
    chips.push(
      screen?.video?.is_playing ? `Video ${time}` : `Video dừng ${time}`,
    );
  if (screen?.editor)
    chips.push(screen.editor.is_dirty ? "Code chưa lưu" : "Code");
  if (
    screen?.editor?.selection &&
    screen.editor.selection.end > screen.editor.selection.start
  )
    chips.push("Đoạn đang chọn");
  const quiz = screen?.quiz?.state ? QUIZ_LABEL[screen.quiz.state] : undefined;
  if (quiz) chips.push(quiz);
  for (const source of sources) {
    const label = SOURCE_LABEL[source];
    if (label && !chips.includes(label)) chips.push(label);
  }
  if (busy) chips.push("Đang xử lý");
  return chips;
}

export function screenControlText(
  capabilities: string[],
  last: ScreenActionResult | null,
  allowNotes = true,
) {
  if (last) {
    if (!last.verified)
      return last.error || "Chưa thực hiện được thao tác trên màn hình.";
    const panel =
      typeof last.arguments.panel === "string"
        ? PANEL_LABEL[last.arguments.panel]
        : undefined;
    const tab =
      typeof last.arguments.tab === "string"
        ? TAB_LABEL[last.arguments.tab]
        : undefined;
    if (last.name === "ui.switch_tab")
      return tab ? `Đã chuyển sang ${tab}.` : "Đã chuyển tab.";
    if (last.name === "ui.open_panel")
      return panel ? `Đã mở ${panel}.` : "Đã mở bảng trên màn hình.";
    if (last.name === "ui.close_panel")
      return panel ? `Đã đóng ${panel}.` : "Đã đóng bảng trên màn hình.";
    if (last.name === "video.seek") return "Đã tua video theo yêu cầu.";
    if (last.name === "video.play") return "Đã phát video.";
    if (last.name === "video.pause") return "Đã tạm dừng video.";
    if (last.name === "video.set_playback_rate") return "Đã đổi tốc độ video.";
    if (last.name === "learning.next_lesson") return "Đã mở bài tiếp theo.";
    if (last.name === "learning.previous_lesson") return "Đã mở bài trước.";
    if (last.name === "learning.navigate_lesson") return "Đã chuyển bài học.";
    return "Đã điều khiển màn hình theo yêu cầu.";
  }
  const parts: string[] = [];
  if (
    allowNotes &&
    (capabilities.includes("ui.switch_tab") ||
      capabilities.includes("ui.open_panel"))
  )
    parts.push("mở ghi chú");
  if (capabilities.includes("video.seek")) parts.push("tua video");
  if (
    capabilities.includes("video.play") &&
    capabilities.includes("video.pause")
  )
    parts.push("phát hoặc dừng video");
  else if (capabilities.includes("video.play")) parts.push("phát video");
  else if (capabilities.includes("video.pause")) parts.push("dừng video");
  if (capabilities.includes("learning.next_lesson"))
    parts.push("bài tiếp theo");
  if (capabilities.includes("editor.read_file")) parts.push("đọc code");
  if (!parts.length) return "Chưa gắn công cụ điều khiển màn hình.";
  return `Công cụ màn hình: ${parts.join(", ")}.`;
}

export function AgentAwareness({ lessonTitle }: { lessonTitle: string }) {
  const agent = useLearningAgent();
  const [screen, setScreen] = useState<Partial<ScreenContextSnapshot>>();
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [mcpConnected, setMcpConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    api
      .get<{ mcp: { connected: boolean } }>("/agent/tools")
      .then((response) => {
        if (live) setMcpConnected(response.data.mcp.connected);
      })
      .catch(() => {
        if (live) setMcpConnected(false);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!agent) return;
    const read = () => {
      setScreen(agent.snapshot());
      setCapabilities(agent.registry.capabilities());
    };
    read();
    const id = window.setInterval(read, 1000);
    return () => window.clearInterval(id);
  }, [agent]);
  const chips = contextChips(
    lessonTitle,
    screen,
    agent?.contextSources || [],
    Boolean(agent?.busy),
  );
  const notesOpen = !screen?.quiz && !screen?.editor;
  const control = screenControlText(
    capabilities,
    agent?.lastScreenAction || null,
    notesOpen,
  );
  return (
    <section
      aria-label="Ngữ cảnh trợ giảng"
      className="mx-3 mt-3 rounded-xl border border-border bg-surface px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip, index) => (
          <Badge
            key={`${chip}-${index}`}
            variant="info"
            size="sm"
            className={
              index === 0 ? "max-w-[11rem] overflow-hidden" : undefined
            }
          >
            <span className={index === 0 ? "truncate" : undefined}>{chip}</span>
          </Badge>
        ))}
        <Badge
          variant="outline"
          size="sm"
          title={
            mcpConnected
              ? "MCP đọc dữ liệu: tìm web và GitHub công khai. Repo riêng tư chưa được cấp quyền."
              : "Đang kiểm tra kết nối MCP; chưa xác nhận truy cập nguồn ngoài."
          }
        >
          {mcpConnected === null
            ? "Kiểm tra MCP…"
            : mcpConnected
              ? "MCP · Web & GitHub"
              : "MCP chưa kết nối"}
        </Badge>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {control}
      </p>
    </section>
  );
}

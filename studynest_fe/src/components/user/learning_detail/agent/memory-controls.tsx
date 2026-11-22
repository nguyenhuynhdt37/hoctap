"use client";
import { useEffect, useState } from "react";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/states";
import { Select, Textarea } from "@/components/ui/input";
import { useLearningAgent } from "./agent-context";
interface Item {
  id: string;
  content: string;
  status: string;
  scope: string;
  kind: string;
  source_type?: string;
  course_id?: string;
  lesson_id?: string;
  expires_at?: string;
}
export function MemoryControls({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? InlineMemory : Modal;
  const agent = useLearningAgent();
  const [opened, setOpened] = useState(embedded);
  const [known, setKnown] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [newScope, setNewScope] = useState("profile");
  const [revokePending, setRevokePending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const load = async () => {
    const [consent, memory] = await Promise.all([
      api.get("/agent/memory/consent"),
      api.get("/agent/memory"),
    ]);
    setEnabled(consent.data.enabled);
    setKnown(true);
    setDays(consent.data.retention_days);
    setItems(memory.data.items || []);
  };
  useEffect(() => {
    const refresh = () => {
      if (opened)
        void load().catch(() => setError("Chưa tải lại được bộ nhớ."));
      else
        void api
          .get("/agent/memory/consent")
          .then((response) => {
            setEnabled(Boolean(response.data.enabled));
            setKnown(true);
          })
          .catch(() => undefined);
    };
    window.addEventListener("maymay:memory-proposed", refresh);
    return () => {
      window.removeEventListener("maymay:memory-proposed", refresh);
    };
  }, [opened]);
  useEffect(() => {
    let live = true;
    if (embedded) {
      void load().catch(() => setError("Chưa tải được bộ nhớ."));
      return;
    }
    api
      .get("/agent/memory/consent")
      .then((response) => {
        if (!live) return;
        setEnabled(Boolean(response.data.enabled));
        setKnown(true);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [embedded]);
  const perform = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await work();
      await load();
    } catch {
      setError(
        "Chưa cập nhật được bộ nhớ. Dữ liệu cũ chưa được xác nhận thay đổi.",
      );
    } finally {
      setBusy(false);
    }
  };
  const open = async () => {
    setOpened(true);
    await perform(async () => undefined);
  };
  const save = async () => {
    const screen = agent?.snapshot();
    const scope = editing?.scope || newScope;
    const courseId = editing ? editing.course_id : screen?.course_id;
    const lessonId = editing ? editing.lesson_id : screen?.lesson_id;
    await perform(async () => {
      await api.post("/agent/memory", {
        scope,
        kind: editing?.kind || "learning_goal",
        content: content.trim(),
        ...(scope !== "profile" && courseId ? { course_id: courseId } : {}),
        ...(scope === "lesson" && lessonId ? { lesson_id: lessonId } : {}),
        ...(editing ? { supersedes_id: editing.id } : {}),
      });
      setContent("");
      setEditing(null);
    });
  };
  return (
    <>
      {!embedded && <Button
        variant={enabled ? "pastel" : "outline"}
        size="sm"
        aria-label="Bộ nhớ học tập"
        onClick={() => void open()}
      >
        {known ? (enabled ? "Bộ nhớ bật" : "Bộ nhớ tắt") : "Bộ nhớ"}
      </Button>}
      {opened && (
        <Container
          open
          title="Bộ nhớ học tập của bạn"
          description="Bạn quyết định nội dung được nhớ, thời gian lưu và khi nào xóa."
          onClose={() => setOpened(false)}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Bộ nhớ dài hạn được lưu riêng theo tài khoản, mặc định không hết hạn. Bạn có thể tắt hoặc xóa bất cứ lúc nào. Khi bật, Mây Mây chọn những thông tin hữu ích lâu dài từ lời bạn như tên gọi, công việc, sở thích, mục tiêu và cách học. Mỗi mục có bằng chứng từ tin nhắn của bạn; không suy đoán từ ảnh hoặc câu trả lời của AI. Bạn có thể xem, sửa hoặc xóa từng mục dưới đây. Mây Mây không tự biến
              nhận xét về năng lực thành sự thật, không lưu bản ghi âm và không
              chia sẻ bộ nhớ riêng với giảng viên.
            </p>
            <Select
              label="Thời gian lưu"
              value={days ?? "account"}
              disabled={busy}
              onChange={(event) => setDays(event.target.value === "account" ? null : Number(event.target.value))}
            >
              <option value="account">Đến khi bạn xóa hoặc xóa tài khoản</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
              <option value={180}>180 ngày</option>
              <option value={365}>365 ngày</option>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                variant={enabled ? "outline" : "primary"}
                onClick={() =>
                  enabled
                    ? setRevokePending(true)
                    : void perform(() =>
                        api.put("/agent/memory/consent", {
                          enabled: true,
                          retention_days: days,
                        }),
                      )
                }
              >
                {enabled
                  ? "Tắt và xóa bộ nhớ dài hạn"
                  : "Đồng ý bật bộ nhớ dài hạn"}
              </Button>
              {enabled && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void perform(() =>
                      api.put("/agent/memory/consent", {
                        enabled: true,
                        retention_days: days,
                      }),
                    )
                  }
                >
                  Lưu thời gian
                </Button>
              )}
            </div>
            {revokePending && (
              <Alert variant="warning">
                <p>
                  Tắt bộ nhớ sẽ xóa nội dung bộ nhớ đang lưu. Lịch sử hội thoại
                  được giữ.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        await api.put("/agent/memory/consent", {
                          enabled: false,
                          retention_days: days,
                        });
                        setRevokePending(false);
                      })
                    }
                  >
                    Xác nhận tắt và xóa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevokePending(false)}
                  >
                    Giữ bộ nhớ
                  </Button>
                </div>
              </Alert>
            )}
            {error && <Alert variant="warning">{error}</Alert>}
            {enabled && (
              <div className="space-y-2">
                {!editing && <Select label="Phạm vi ghi nhớ" value={newScope} onChange={event => setNewScope(event.target.value)}>
                  <option value="profile">Chung cho tài khoản · mọi trang</option>
                  {agent?.snapshot().course_id && <option value="course">Chỉ khóa học đang mở</option>}
                  {agent?.snapshot().lesson_id && <option value="lesson">Chỉ bài học đang mở</option>}
                </Select>}
                <Textarea
                  rows={3}
                  maxLength={800}
                  label={
                    editing
                      ? "Đề xuất nội dung thay thế"
                      : "Điều bạn muốn Mây Mây ghi nhớ"
                  }
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Ví dụ: Mình muốn ôn vòng lặp trong tuần này."
                />
                <Button
                  size="sm"
                  disabled={busy || !content.trim()}
                  onClick={() => void save()}
                >
                  Tạo đề xuất để xác nhận
                </Button>
                {editing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setContent("");
                    }}
                  >
                    Hủy sửa
                  </Button>
                )}
              </div>
            )}
            <div className="max-h-[40vh] space-y-3 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có nội dung được ghi nhớ.
                </p>
              ) : (
                items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-border bg-background p-3"
                  >
                    <p className="text-sm text-foreground">{item.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.status === "confirmed"
                        ? ["model_selected_statement", "automatic_user_statement"].includes(item.source_type || "") ? "Mây Mây đã ghi nhớ từ lời bạn" : "Bạn đã xác nhận"
                        : "Đề xuất chưa xác nhận"}
                      {item.expires_at
                        ? ` · Hết hạn ${new Date(item.expires_at).toLocaleDateString("vi-VN")}`
                        : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.status !== "confirmed" && enabled && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void perform(() =>
                              api.post(`/agent/memory/${item.id}/confirm`, {}),
                            )
                          }
                        >
                          Xác nhận
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy || !enabled}
                        onClick={() => {
                          setEditing(item);
                          setContent(item.content);
                        }}
                      >
                        Sửa
                      </Button>
                      {pendingDelete === item.id ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void perform(async () => {
                                await api.delete(`/agent/memory/${item.id}`);
                                setPendingDelete(null);
                              })
                            }
                          >
                            Xác nhận xóa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(null)}
                          >
                            Giữ lại
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => setPendingDelete(item.id)}
                        >
                          Xóa
                        </Button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

function InlineMemory({ children }: React.ComponentProps<typeof Modal>) {
  return <section aria-label="Bộ nhớ học tập của bạn">{children}</section>;
}

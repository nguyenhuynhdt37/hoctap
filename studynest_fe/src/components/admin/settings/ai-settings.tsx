"use client";

import { Alert, Badge, Button, Card, Select } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useState } from "react";
import useSWR from "swr";

interface AISettings {
  provider: string;
  selected_model: string;
  effective_model: string;
  auto_model: string;
  connected: boolean;
  connection_error: string | null;
  embedding_provider: string;
  embedding_model: string;
  embedding_dimensions: number;
  chat_streaming: boolean;
  models: { id: string; kind: "combo" | "model" }[];
}

export default function AISettingsPanel() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<AISettings>(
    "/admin/settings/ai",
    async (url: string) => (await api.get(url, { timeout: 25000 })).data,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const selected = draft ?? data?.selected_model ?? "auto";
  const available = data?.models.some((item) => item.id === selected);
  const autoAvailable = data?.models.some(
    (item) => item.id === data.auto_model
  );
  const canSave =
    data?.connected &&
    data.provider === "9router" &&
    (selected === "auto" ? autoAvailable : available) &&
    selected !== data.selected_model;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setNotice("");
    setSaveError("");
    try {
      const response = await api.put(
        "/admin/settings/ai",
        { model: selected },
        { timeout: 25000 }
      );
      await mutate(
        (current) => (current ? { ...current, ...response.data } : current),
        false
      );
      setDraft(null);
      setNotice(
        "Đã lưu cấu hình AI. Lựa chọn mới áp dụng từ yêu cầu tiếp theo."
      );
    } catch (err: unknown) {
      const detail = (
        err as { response?: { data?: { detail?: unknown } } }
      ).response?.data?.detail;
      setSaveError(
        typeof detail === "string"
          ? detail
          : "Không thể lưu cấu hình AI. Vui lòng thử lại."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card aria-labelledby="ai-settings-title" className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="ai-settings-title"
            className="text-lg font-semibold text-foreground"
          >
            AI · 9Router
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn model cho các tính năng chat và tạo nội dung trên toàn hệ
            thống.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isValidating || saving}
          isLoading={isValidating}
          loadingText="Đang kết nối..."
          onClick={() => {
            setSaveError("");
            void mutate();
          }}
        >
          Kết nối lại / Tải model
        </Button>
      </div>

      {isLoading && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Đang kết nối 9Router và tải danh sách model...
        </p>
      )}
      {error && (
        <Alert variant="destructive" className="mt-4">
          Không tải được cấu hình AI. Hãy thử kết nối lại.
        </Alert>
      )}
      {data && (
        <div className="mt-5 space-y-4">
          <div role="status">
            <Badge variant={data.connected ? "success" : "warning"} dot>
              {data.connected
                ? `Đã kết nối · ${data.models.length} lựa chọn có sẵn`
                : data.connection_error || "Chưa kết nối được 9Router."}
            </Badge>
          </div>
          {data.provider !== "9router" && (
            <Alert variant="warning">
              Provider hiện tại là {data.provider}. Cần bật 9Router trên backend
              để áp dụng lựa chọn này.
            </Alert>
          )}
          <div className="max-w-2xl">
            <Select
              id="ai-model"
              label="Model sử dụng"
              value={selected}
              disabled={!data.connected || saving || data.provider !== "9router"}
              onChange={(event) => {
                setDraft(event.target.value);
                setNotice("");
                setSaveError("");
              }}
              helperText={`Auto gửi yêu cầu qua nhóm ${data.auto_model}; 9Router chọn và chuyển model theo cấu hình của nhóm. Chọn model cụ thể để cố định model.`}
            >
              <option value="auto" disabled={!autoAvailable}>
                Auto — 9Router tự điều phối ({data.auto_model})
              </option>
              {selected !== "auto" && !available && (
                <option value={selected}>
                  {selected} — chưa có trong danh sách
                </option>
              )}
              <optgroup label="Nhóm tự chuyển model (combo)">
                {data.models
                  .filter((item) => item.kind === "combo")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Model cụ thể">
                {data.models
                  .filter((item) => item.kind === "model")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}
                    </option>
                  ))}
              </optgroup>
            </Select>
            {data.connected && !autoAvailable && (
              <p className="mt-2 text-sm text-warning-foreground">
                Nhóm Auto ({data.auto_model}) hiện không có trên 9Router. Hãy
                chọn một model có sẵn hoặc kiểm tra lại nhóm trên 9Router.
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Đang áp dụng:{" "}
            <strong className="text-foreground">
              {data.selected_model === "auto"
                ? `Auto (${data.effective_model})`
                : data.effective_model}
            </strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Chế độ chat:{" "}
            <strong className="text-foreground">
              {data.chat_streaming
                ? "Stream — hiển thị câu trả lời dần"
                : "Trả lời khi hoàn tất"}
            </strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Embedding:{" "}
            <strong className="text-foreground">{data.embedding_model}</strong>{" "}
            qua {data.embedding_provider} · {data.embedding_dimensions} chiều.
          </p>
          <p className="text-xs text-subtle-foreground">
            Danh sách do 9Router cung cấp; khả năng gọi từng model phụ thuộc
            quota và trạng thái provider. Thay đổi model chat không thay đổi
            model embedding.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              disabled={!canSave}
              isLoading={saving}
              loadingText="Đang lưu..."
              onClick={save}
            >
              Lưu cấu hình AI
            </Button>
            {draft !== null && selected !== data.selected_model && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setDraft(null);
                  setSaveError("");
                }}
              >
                Hủy thay đổi AI
              </Button>
            )}
          </div>
        </div>
      )}
      {notice && (
        <Alert variant="success" className="mt-4">
          {notice}
        </Alert>
      )}
      {saveError && (
        <Alert variant="destructive" className="mt-4">
          {saveError}
        </Alert>
      )}
    </Card>
  );
}

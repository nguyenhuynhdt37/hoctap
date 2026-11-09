"use client";

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
  const autoAvailable = data?.models.some((item) => item.id === data.auto_model);
  const canSave = data?.connected && data.provider === "9router" &&
    (selected === "auto" ? autoAvailable : available) && selected !== data.selected_model;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setNotice("");
    setSaveError("");
    try {
      const response = await api.put("/admin/settings/ai", { model: selected }, { timeout: 25000 });
      await mutate((current) => current ? { ...current, ...response.data } : current, false);
      setDraft(null);
      setNotice("Đã lưu cấu hình AI. Lựa chọn mới áp dụng từ yêu cầu tiếp theo.");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setSaveError(typeof detail === "string" ? detail : "Không thể lưu cấu hình AI. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="ai-settings-title" className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ai-settings-title" className="text-lg font-semibold text-gray-900">AI · 9Router</h2>
          <p className="mt-1 text-sm text-gray-600">Chọn model cho các tính năng chat và tạo nội dung trên toàn hệ thống.</p>
        </div>
        <button type="button" disabled={isValidating || saving} onClick={() => { setSaveError(""); void mutate(); }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {isValidating ? "Đang kết nối..." : "Kết nối lại / Tải model"}
        </button>
      </div>

      {isLoading && <p role="status" className="mt-4 text-sm text-gray-600">Đang kết nối 9Router và tải danh sách model...</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">Không tải được cấu hình AI. Hãy thử kết nối lại.</p>}
      {data && (
        <div className="mt-5 space-y-4">
          <p className={`text-sm ${data.connected ? "text-green-700" : "text-amber-700"}`} role="status">
            {data.connected ? `Đã kết nối · ${data.models.length} lựa chọn có sẵn` : data.connection_error || "Chưa kết nối được 9Router."}
          </p>
          {data.provider !== "9router" && <p className="text-sm text-amber-700">Provider hiện tại là {data.provider}. Cần bật 9Router trên backend để áp dụng lựa chọn này.</p>}
          <div className="max-w-2xl">
            <label htmlFor="ai-model" className="mb-2 block text-sm font-medium text-gray-700">Model sử dụng</label>
            <select id="ai-model" value={selected} disabled={!data.connected || saving || data.provider !== "9router"}
              onChange={(event) => { setDraft(event.target.value); setNotice(""); setSaveError(""); }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-500 disabled:bg-gray-50">
              <option value="auto" disabled={!autoAvailable}>Auto — 9Router tự điều phối ({data.auto_model})</option>
              {selected !== "auto" && !available && <option value={selected}>{selected} — chưa có trong danh sách</option>}
              <optgroup label="Nhóm tự chuyển model (combo)">
                {data.models.filter((item) => item.kind === "combo").map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
              </optgroup>
              <optgroup label="Model cụ thể">
                {data.models.filter((item) => item.kind === "model").map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
              </optgroup>
            </select>
            <p className="mt-2 text-sm text-gray-500">Auto gửi yêu cầu qua nhóm {data.auto_model}; 9Router chọn và chuyển model theo cấu hình của nhóm. Chọn model cụ thể để cố định model.</p>
            {data.connected && !autoAvailable && <p className="mt-2 text-sm text-amber-700">Nhóm Auto ({data.auto_model}) hiện không có trên 9Router. Hãy chọn một model có sẵn hoặc kiểm tra lại nhóm trên 9Router.</p>}
          </div>
          <p className="text-sm text-gray-600">Đang áp dụng: <strong>{data.selected_model === "auto" ? `Auto (${data.effective_model})` : data.effective_model}</strong></p>
          <p className="text-sm text-gray-600">Chế độ chat: <strong>{data.chat_streaming ? "Stream — hiển thị câu trả lời dần" : "Trả lời khi hoàn tất"}</strong></p>
          <p className="text-sm text-gray-600">Embedding: <strong>{data.embedding_model}</strong> qua {data.embedding_provider} · {data.embedding_dimensions} chiều.</p>
          <p className="text-xs text-gray-500">Danh sách do 9Router cung cấp; khả năng gọi từng model phụ thuộc quota và trạng thái provider. Thay đổi model chat không thay đổi model embedding.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!canSave || saving} onClick={save}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Đang lưu..." : "Lưu cấu hình AI"}
            </button>
            {draft !== null && selected !== data.selected_model && <button type="button" disabled={saving} onClick={() => { setDraft(null); setSaveError(""); }} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900">Hủy thay đổi AI</button>}
          </div>
        </div>
      )}
      {notice && <p role="status" className="mt-4 text-sm text-green-700">{notice}</p>}
      {saveError && <p role="alert" className="mt-4 text-sm text-red-700">{saveError}</p>}
    </section>
  );
}

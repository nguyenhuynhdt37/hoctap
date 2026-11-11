"use client";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { Button, Input } from "@/components/ui";
import type { CatalogOptions } from "@/types/catalog";
import type { Framework } from "@/types/learning-paths";
import {
  fetchLearning,
  control,
  message,
} from "@/components/learning-paths/shared";
import CoursePicker from "./course-picker";
export default function ProficiencyEditor() {
  const { data: frameworks, mutate } = useSWR<Framework[]>(
    "/learning-paths/frameworks",
    fetchLearning,
  );
  const { data: options } = useSWR<CatalogOptions>(
    "/catalog/filters",
    fetchLearning,
  );
  const [subject, setSubject] = useState("");
  const [course, setCourse] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [entry, setEntry] = useState("");
  const [skill, setSkill] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function framework(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      await api.post("/admin/learning-paths/frameworks", {
        code: String(form.get("code")),
        name: String(form.get("name")),
        subject_id: String(form.get("subject")),
        levels: String(form.get("levels"))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      await mutate();
      setNotice("Đã tạo bộ trình độ.");
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function label(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await api.put(`/admin/courses/${course[0]}/proficiency`, {
        entry_level_id: entry || null,
        target_level_id: target,
        skill,
        evidence,
        status: "approved",
      });
      setNotice(
        "Đã duyệt nhãn. Nhãn này không tự cấp chứng chỉ cho người học.",
      );
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  }
  const frameworkOptions =
    frameworks?.filter((f) => !subject || f.subject_id === subject) ?? [];
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-semibold">Bộ trình độ & duyệt nhãn học thuật</h3>
      <div className="mt-6 grid gap-8 xl:grid-cols-2">
        <form onSubmit={framework} className="space-y-4">
          <h2 className="font-semibold">Tạo bộ trình độ cho môn</h2>
          <Input
            name="name"
            label="Tên bộ trình độ"
            required
            placeholder="Ví dụ: Khung tham chiếu tiếng Anh"
          />
          <Input name="code" label="Mã cố định" required pattern="[a-z0-9-]+" />
          <label className="block space-y-2">
            <span>Môn học</span>
            <select name="subject" className={control} required>
              <option value="">Chọn môn</option>
              {options?.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            name="levels"
            label="Các mức theo thứ tự, cách nhau bằng dấu phẩy"
            required
            placeholder="A1, A2, B1, B2, C1, C2"
          />
          <Button disabled={busy} type="submit">
            Lưu bộ trình độ
          </Button>
        </form>
        <form onSubmit={label} className="space-y-4">
          <h2 className="font-semibold">Duyệt nhãn cho một khóa học</h2>
          <label className="block space-y-2">
            <span>Lọc môn</span>
            <select
              className={control}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTarget("");
                setEntry("");
                setCourse([]);
              }}
            >
              <option value="">Tất cả môn</option>
              {options?.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <CoursePicker
            single
            subjectId={subject || undefined}
            value={course}
            onChange={(ids) => setCourse(ids.length ? [ids.at(-1)!] : [])}
          />
          {[
            ["Đầu vào (tùy chọn)", entry, setEntry],
            ["Đầu ra tham chiếu", target, setTarget],
          ].map(([name, value, set]) => (
            <label className="block space-y-2" key={String(name)}>
              <span>{String(name)}</span>
              <select
                className={control}
                value={String(value)}
                onChange={(e) =>
                  (set as (value: string) => void)(e.target.value)
                }
                required={name === "Đầu ra tham chiếu"}
              >
                <option value="">Chọn trình độ</option>
                {frameworkOptions.map((f) => (
                  <optgroup key={f.id} label={f.name}>
                    {f.levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          ))}
          <Input
            label="Kỹ năng/phạm vi thực sự được dạy"
            required
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          />
          <label className="block space-y-2">
            <span>Căn cứ duyệt: nội dung, bài tập, đánh giá đầu ra</span>
            <textarea
              className={control}
              required
              minLength={20}
              rows={4}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </label>
          <Button disabled={busy || !course.length || !target} type="submit">
            Duyệt nhãn học thuật
          </Button>
        </form>
      </div>
      {notice && (
        <p role="status" className="mt-5 text-sm text-primary">
          {notice}
        </p>
      )}
    </section>
  );
}

"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import CourseTaxonomyForm from "@/components/catalog/course-taxonomy-form";
import CoursePicker from "@/components/admin/learning-paths/course-picker";
import { message } from "@/components/learning-paths/shared";
import {
  taxonomyInput,
  type CourseEducation,
  type CourseTaxonomyInput,
} from "@/types/catalog";
export default function CourseAssignment() {
  const [id, setId] = useState("");
  const [value, setValue] = useState<CourseTaxonomyInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);
  async function select(ids: string[]) {
    const selected = ids[0] || "";
    const request = ++sequence.current;
    setId(selected);
    setValue(null);
    setFailure("");
    setNotice("");
    if (!selected) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.get<CourseEducation>(
        `/catalog/courses/${selected}/taxonomy`,
      );
      if (request === sequence.current) setValue(taxonomyInput(data));
    } catch (error) {
      if (request === sequence.current) setFailure(message(error));
    } finally {
      if (request === sequence.current) setBusy(false);
    }
  }
  async function save() {
    if (!id || !value) return;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      await api.put(`/admin/catalog/courses/${id}/taxonomy`, value);
      setNotice("Đã cập nhật phân loại của khóa học.");
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <CoursePicker
        single
        disabled={busy}
        value={id ? [id] : []}
        onChange={(ids) => {
          void select(ids);
        }}
      />
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          Đang xử lý…
        </p>
      )}
      {failure && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          {failure}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-success-bg p-4 text-sm text-success-foreground"
        >
          {notice}
        </p>
      )}
      {value && (
        <div className="space-y-5 border-t border-border pt-6">
          <CourseTaxonomyForm admin value={value} onChange={setValue} />
          <Button disabled={busy} onClick={save}>
            Lưu phân loại
          </Button>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleX,
  Clock,
  Cpu,
  FlaskConical,
  LayoutList,
  Lock,
  Terminal,
} from "pulsoicon-react";
import { Badge } from "@/components/ui";
import type { TestResult } from "@/types/user/learning";
import { cn } from "@/lib/utils";

interface TestCase {
  id: string;
  input: string | null;
  expected_output: string | null;
  hidden: boolean;
  is_sample: boolean;
  order_index: number;
}

interface TestResultsProps {
  testcases: TestCase[];
  testResult: TestResult | null;
  embedded?: boolean;
}

const FAILURE_LABELS: Record<string, string> = {
  compile_error: "Lỗi biên dịch",
  runtime_error: "Lỗi chạy",
  time_limit_exceeded: "Quá thời gian",
  memory_limit_exceeded: "Quá bộ nhớ",
  internal_error: "Chưa chạy được",
  failed: "Sai kết quả",
};

export default function TestResults({
  testcases,
  testResult,
  embedded = false,
}: TestResultsProps) {
  const sortedCases = useMemo(
    () => [...testcases].sort((a, b) => a.order_index - b.order_index),
    [testcases],
  );
  const [selectedId, setSelectedId] = useState<string>(sortedCases[0]?.id ?? "");
  const [showAll, setShowAll] = useState(false);

  // Tự động chọn case đầu tiên khi đổi bài tập
  useEffect(() => {
    if (!sortedCases.some((tc) => tc.id === selectedId)) {
      setSelectedId(sortedCases[0]?.id ?? "");
    }
  }, [sortedCases, selectedId]);

  // Khi vừa có kết quả chấm, tự động nhảy tới case lỗi đầu tiên để debug tức thì
  useEffect(() => {
    if (!testResult?.details?.length) return;
    const firstFailed = sortedCases.find((tc) => {
      const detail = testResult.details.find((d) => d.id === tc.id);
      return detail && detail.result !== "passed";
    });
    if (firstFailed) {
      setSelectedId(firstFailed.id);
    }
  }, [testResult, sortedCases]);

  const passPercentage =
    testResult && testResult.total > 0
      ? Math.round((testResult.passed / testResult.total) * 100)
      : 0;
  const allPassed = Boolean(testResult && testResult.total > 0 && passPercentage === 100);

  const visibleCases = showAll
    ? sortedCases
    : sortedCases.filter((tc) => tc.id === selectedId).length > 0
      ? sortedCases.filter((tc) => tc.id === selectedId)
      : sortedCases.slice(0, 1);

  return (
    <section
      aria-label="Bảng kiểm thử Test Cases"
      className={cn(
        "min-w-0 max-w-full overflow-hidden bg-surface",
        embedded
          ? "flex min-h-0 flex-1 flex-col"
          : "mt-4 rounded-[24px] border border-border shadow-xs",
      )}
    >
      {/* Header Test Bench */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-border bg-gradient-to-r from-primary-light/50 via-surface to-background px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
            <FlaskConical aria-hidden="true" animated={false} className="size-3.5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Test Bench</h3>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {sortedCases.length} kịch bản kiểm thử
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {testResult && (
            <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-3 py-1 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-bold tabular-nums",
                  allPassed ? "text-success-foreground" : "text-primary",
                )}
              >
                <CheckCircle2 aria-hidden="true" animated={false} className="size-3.5" />
                {testResult.passed}/{testResult.total}
              </span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-primary-light">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    allPassed ? "bg-success-foreground" : "bg-primary",
                  )}
                  style={{ width: `${passPercentage}%` }}
                />
              </div>
              <span className="font-extrabold text-foreground tabular-nums">
                {passPercentage}%
              </span>
            </div>
          )}

          {sortedCases.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary cursor-pointer"
            >
              <LayoutList aria-hidden="true" animated={false} className="size-3.5" />
              <span>{showAll ? "Xem từng case" : "Xem tất cả"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Thông báo trạng thái bản chạy */}
      {testResult && (
        <div
          role="status"
          className={cn(
            "border-b border-border/70 px-4 py-2 text-xs font-medium",
            allPassed && !testResult.sample_only
              ? "bg-success-bg/55 text-success-foreground"
              : "bg-primary-light/35 text-muted-foreground",
          )}
        >
          {testResult.sample_only
            ? "Đây là kết quả chạy thử trên test mẫu, chưa ghi nhận hoàn thành bài tập."
            : testResult.saved
              ? "Mã nguồn đã lưu khớp với phiên bản vượt qua toàn bộ kiểm thử."
              : "Kết quả thuộc phiên bản vừa chạy. Chưa xác nhận mã nguồn đã lưu vượt qua toàn bộ test."}
        </div>
      )}

      {/* Dải pill chọn nhanh từng Test Case */}
      {!showAll && sortedCases.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/70 bg-background/60 px-4 py-2.5">
          {sortedCases.map((tc, index) => {
            const detail = testResult?.details.find((d) => d.id === tc.id);
            const passed = detail?.result === "passed";
            const active = tc.id === selectedId;

            return (
              <button
                key={tc.id}
                type="button"
                onClick={() => setSelectedId(tc.id)}
                className={cn(
                  "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-all cursor-pointer",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : detail
                      ? passed
                        ? "border-success-border bg-success-bg/75 text-success-foreground hover:bg-success-bg"
                        : "border-destructive-border bg-destructive-bg/75 text-destructive-foreground hover:bg-destructive-bg"
                      : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/60",
                )}
              >
                <span className="tabular-nums">Case #{index + 1}</span>
                {tc.is_sample && !detail && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      active ? "text-primary-foreground/85" : "text-primary",
                    )}
                  >
                    Mẫu
                  </span>
                )}
                {tc.hidden && (
                  <Lock
                    aria-hidden="true"
                    animated={false}
                    className={cn(
                      "size-3",
                      active ? "text-primary-foreground/85" : "text-muted-foreground",
                    )}
                  />
                )}
                {detail &&
                  (passed ? (
                    <CheckCircle2
                      aria-hidden="true"
                      animated={false}
                      className={cn(
                        "size-3.5",
                        active ? "text-primary-foreground" : "text-success-foreground",
                      )}
                    />
                  ) : (
                    <CircleX
                      aria-hidden="true"
                      animated={false}
                      className={cn(
                        "size-3.5",
                        active ? "text-primary-foreground" : "text-destructive-foreground",
                      )}
                    />
                  ))}
              </button>
            );
          })}
        </div>
      )}

      {/* Nội dung đối chiếu Input / Expected / Actual */}
      <div
        className={cn(
          "space-y-3 p-4",
          embedded
            ? "min-h-0 flex-1 overflow-y-auto"
            : showAll && "max-h-[340px] overflow-y-auto",
        )}
      >
        {visibleCases.map((testcase) => {
          const orderNum = sortedCases.findIndex((c) => c.id === testcase.id) + 1;
          const isHidden = testcase.hidden;
          const isSample = testcase.is_sample;
          const detail = testResult?.details.find((d) => d.id === testcase.id);
          const passed = detail?.result === "passed";

          return (
            <div
              key={testcase.id}
              className={cn(
                "rounded-2xl border p-3.5 transition-colors",
                detail
                  ? passed
                    ? "border-success-border bg-success-bg/45"
                    : "border-destructive-border bg-destructive-bg/45"
                  : isSample
                    ? "border-primary-pastel/70 bg-primary-light/25"
                    : "border-border bg-background/60",
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-extrabold text-foreground tabular-nums">
                    Case #{orderNum}
                  </span>
                  {isSample && (
                    <Badge variant="info" size="sm">
                      Sample
                    </Badge>
                  )}
                  {isHidden && (
                    <Badge variant="outline" size="sm">
                      <Lock aria-hidden="true" animated={false} className="size-3" />
                      Ẩn
                    </Badge>
                  )}
                  {detail && (
                    <Badge variant={passed ? "success" : "destructive"} size="sm">
                      {passed ? "PASS" : FAILURE_LABELS[detail.result] || "Chưa đạt"}
                    </Badge>
                  )}
                </div>

                {detail && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 tabular-nums">
                      <Clock aria-hidden="true" animated={false} className="size-3 text-primary" />
                      {detail.cpu_time == null ? "—" : `${detail.cpu_time}ms`}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 tabular-nums">
                      <Cpu aria-hidden="true" animated={false} className="size-3 text-primary" />
                      {detail.memory == null
                        ? "—"
                        : `${(detail.memory / 1000000).toFixed(2)} MB`}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 tabular-nums">
                      <Terminal aria-hidden="true" animated={false} className="size-3 text-primary" />
                      Exit: {detail.exit_code ?? "—"}
                    </span>
                  </div>
                )}
              </div>

              <div
                className={cn(
                  "grid gap-2.5 text-xs",
                  detail && !isHidden && detail.output !== undefined
                    ? "grid-cols-1 md:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2",
                )}
              >
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Input
                  </span>
                  <code className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs whitespace-pre-wrap break-words text-foreground">
                    {isHidden ? "••• (Ẩn dữ liệu đầu vào)" : testcase.input || "∅"}
                  </code>
                </div>

                <div>
                  <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Expected
                  </span>
                  <code className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs whitespace-pre-wrap break-words text-foreground">
                    {isHidden ? "••• (Ẩn kết quả mong đợi)" : testcase.expected_output || "∅"}
                  </code>
                </div>

                {detail && !isHidden && detail.output !== undefined && (
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                      Actual Output
                    </span>
                    <code
                      className={cn(
                        "mt-1 block rounded-xl border px-3 py-2 font-mono text-xs whitespace-pre-wrap break-words",
                        passed
                          ? "border-success-border bg-surface text-success-foreground"
                          : "border-destructive-border bg-surface text-destructive-foreground",
                      )}
                    >
                      {detail.output || "(trống)"}
                    </code>
                  </div>
                )}
              </div>

              {detail && !isHidden && detail.stderr && (
                <div className="mt-2.5">
                  <span className="text-[11px] font-bold tracking-wider text-destructive-foreground uppercase">
                    Stderr / Lỗi hệ thống
                  </span>
                  <code className="mt-1 block rounded-xl border border-destructive-border bg-destructive-bg/80 px-3 py-2 font-mono text-xs whitespace-pre-wrap break-words text-destructive-foreground">
                    {detail.stderr}
                  </code>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { TestResult } from "@/types/user/learning";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";

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
}

export default function TestResults({
  testcases,
  testResult,
}: TestResultsProps) {
  const passPercentage =
    testResult && testResult.total > 0
      ? Math.round((testResult.passed / testResult.total) * 100)
      : 0;

  return (
    <div className="mt-4 min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Test Cases</h3>
        {testResult && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <HiCheckCircle className="w-4 h-4 text-primary" />
              <span className="text-foreground">
                <span className="font-semibold text-primary">
                  {testResult.passed}
                </span>
                /{testResult.total}
              </span>
            </div>
            <div className="w-20 bg-border rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${passPercentage}%` }}
              />
            </div>
            <span className="font-semibold text-foreground">{passPercentage}%</span>
          </div>
        )}
      </div>
      {testResult && <p role="status" className="px-3 pt-3 text-xs leading-relaxed text-muted-foreground">{testResult.sample_only ? 'Đây là kết quả test mẫu trên phiên bản code vừa chạy, chưa đánh dấu hoàn thành bài tập.' : testResult.saved ? 'Code đã lưu khớp với phiên bản vượt qua toàn bộ test.' : 'Kết quả thuộc phiên bản code vừa chạy. Chưa xác nhận code đã lưu vượt qua toàn bộ test.'}</p>}
      <div className="p-3 max-h-[250px] overflow-y-auto">
        <div className="space-y-2">
          {[...testcases]
            .sort((a, b) => a.order_index - b.order_index)
            .map((testcase, index) => {
              const isHidden = testcase.hidden;
              const isSample = testcase.is_sample;
              const testResultDetail = testResult?.details.find(
                (d) => d.id === testcase.id
              );
              const passed = testResultDetail?.result === "passed";
              return (
                <div
                  key={testcase.id}
                  className={`p-3 rounded-xl border ${
                    testResultDetail
                      ? passed
                        ? "border-success-border bg-success-bg"
                        : "border-destructive-border bg-destructive-bg"
                      : isHidden
                      ? "border-border bg-background"
                      : isSample
                      ? "border-primary-light bg-primary-pastel/30"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    {isSample && (
                      <span className="text-xs bg-primary-pastel text-primary px-1.5 py-0.5 rounded font-medium">
                        Sample
                      </span>
                    )}
                    {isHidden && (
                      <span className="text-xs bg-border text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                        Hidden
                      </span>
                    )}
                    {testResultDetail && (
                      <>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            passed
                              ? "bg-success-bg text-success-foreground"
                              : "bg-destructive-bg text-destructive-foreground"
                          }`}
                        >
                          {passed ? "PASS" : ({ compile_error: "Lỗi biên dịch", runtime_error: "Lỗi chạy", time_limit_exceeded: "Quá thời gian", memory_limit_exceeded: "Quá bộ nhớ", internal_error: "Chưa chạy được", failed: "Chưa đúng" } as Record<string, string>)[testResultDetail.result] || "Chưa đạt"}
                        </span>
                        {passed ? (
                          <HiCheckCircle className="w-4 h-4 text-primary" />
                        ) : (
                          <HiXCircle className="w-4 h-4 text-destructive-foreground" />
                        )}
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground font-medium">Input:</span>
                      <code className="block mt-1 bg-surface border border-border px-2 py-1.5 rounded font-mono text-xs text-foreground whitespace-pre-wrap break-words">
                        {isHidden ? "•••" : testcase.input || "∅"}
                      </code>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">
                        Expected:
                      </span>
                      <code className="block mt-1 bg-surface border border-border px-2 py-1.5 rounded font-mono text-xs text-foreground whitespace-pre-wrap break-words">
                        {isHidden ? "•••" : testcase.expected_output || "∅"}
                      </code>
                    </div>
                  </div>
                  {testResultDetail && (
                    <div className="mt-2 pt-2 border-t border-border">
                      {!isHidden &&
                        testResultDetail.output !== undefined && (
                          <div className="mb-2">
                            <span className="text-xs text-muted-foreground font-medium">
                              Output:
                            </span>
                            <code
                              className={`block mt-1 px-2 py-1.5 rounded font-mono text-xs whitespace-pre-wrap break-words ${
                                passed
                                  ? "bg-primary-pastel/70 text-primary border border-primary-light"
                                  : "bg-destructive-bg text-destructive-foreground border border-destructive-border"
                              }`}
                            >
                              {testResultDetail.output || "(empty)"}
                            </code>
                          </div>
                        )}
                      {!isHidden && testResultDetail.stderr && (
                        <div className="mb-2">
                          <span className="text-xs text-destructive-foreground font-medium">
                            Error:
                          </span>
                          <code className="block mt-1 bg-destructive-bg border border-destructive-border px-2 py-1.5 rounded font-mono text-xs text-destructive-foreground whitespace-pre-wrap break-words">
                            {testResultDetail.stderr}
                          </code>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          CPU:{" "}
                          <span className="text-foreground font-medium">
                            {testResultDetail.cpu_time == null ? "chưa có dữ liệu" : `${testResultDetail.cpu_time}ms`}
                          </span>
                        </span>
                        <span>
                          Memory:{" "}
                          <span className="text-foreground font-medium">
                            {testResultDetail.memory == null ? "chưa có dữ liệu" : `${(testResultDetail.memory / 1000000).toFixed(2)} MB`}
                          </span>
                        </span>
                        <span>
                          Exit:{" "}
                          <span
                            className={
                              testResultDetail.exit_code === 0
                                ? "text-primary font-medium"
                                : "text-destructive-foreground font-medium"
                            }
                          >
                            {testResultDetail.exit_code ?? "chưa có"}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}


"use client";

import { TestResult } from "@/types/user/learning";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
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
    <div className="mt-4 bg-surface rounded-2xl border border-border shadow-xs">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
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
      <div className="p-3 max-h-[250px] overflow-y-auto">
        <div className="space-y-2">
          {testcases
            .sort((a, b) => a.order_index - b.order_index)
            .map((testcase, index) => {
              const isHidden = testcase.hidden;
              const isSample = testcase.is_sample;
              const testResultDetail = testResult?.details.find(
                (d) => d.index === index
              );
              const passed = testResultDetail?.result === "passed";
              return (
                <div
                  key={testcase.id}
                  className={`p-3 rounded-xl border ${
                    testResultDetail
                      ? passed
                        ? "border-primary bg-primary-pastel/50"
                        : "border-red-500 bg-red-50"
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
                              ? "bg-primary text-white"
                              : "bg-red-600 text-white"
                          }`}
                        >
                          {passed ? "PASSED" : "FAILED"}
                        </span>
                        {passed ? (
                          <HiCheckCircle className="w-4 h-4 text-primary" />
                        ) : (
                          <HiXCircle className="w-4 h-4 text-red-600" />
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
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              {testResultDetail.output || "(empty)"}
                            </code>
                          </div>
                        )}
                      {testResultDetail.stderr && (
                        <div className="mb-2">
                          <span className="text-xs text-red-600 font-medium">
                            Error:
                          </span>
                          <code className="block mt-1 bg-red-50 border border-red-200 px-2 py-1.5 rounded font-mono text-xs text-red-800 whitespace-pre-wrap break-words">
                            {testResultDetail.stderr}
                          </code>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          CPU:{" "}
                          <span className="text-yellow-600 font-medium">
                            {testResultDetail.cpu_time}ms
                          </span>
                        </span>
                        <span>
                          Memory:{" "}
                          <span className="text-yellow-600 font-medium">
                            {(testResultDetail.memory / 1000000).toFixed(2)} MB
                          </span>
                        </span>
                        <span>
                          Exit:{" "}
                          <span
                            className={
                              testResultDetail.exit_code === 0
                                ? "text-primary font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {testResultDetail.exit_code}
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


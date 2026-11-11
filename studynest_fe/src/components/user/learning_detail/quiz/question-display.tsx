"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { HiCheckCircle, HiLightBulb, HiXCircle } from "react-icons/hi";

interface QuestionDisplayProps {
  question: {
    id: string;
    question: string;
    options: string[];
    correct_answer: number;
    explanation?: string;
  };
  selectedAnswer: number | undefined;
  isAnswered: boolean;
  onSelectAnswer: (answerIndex: number) => void;
}

export default function QuestionDisplay({
  question,
  selectedAnswer,
  isAnswered,
  onSelectAnswer,
}: QuestionDisplayProps) {
  const isCorrect = selectedAnswer === question.correct_answer;
  const correctOption = question.options[question.correct_answer];

  return (
    <>
      {/* Question */}
      <div className="mb-6">
        <div className="text-lg font-semibold text-foreground mb-6 leading-relaxed">
          <MarkdownRenderer
            content={question.question}
            isHtml={false}
            className="prose prose-sm max-w-none text-foreground"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === question.correct_answer;

            let buttonClass =
              "w-full p-4 text-left rounded-xl border-2 transition-all duration-200 cursor-pointer ";

            if (isAnswered) {
              if (isCorrectAnswer) {
                buttonClass +=
                  "border-primary bg-primary-pastel/60 text-primary";
              } else if (isSelected && !isCorrectAnswer) {
                buttonClass += "border-red-500 bg-red-50 text-red-700";
              } else {
                buttonClass += "border-border bg-background text-muted-foreground";
              }
            } else {
              if (isSelected) {
                buttonClass += "border-primary bg-primary-pastel/60 text-primary";
              } else {
                buttonClass +=
                  "border-border hover:border-primary-light hover:bg-primary-pastel/30";
              }
            }

            return (
              <button
                key={index}
                onClick={() => !isAnswered && onSelectAnswer(index)}
                disabled={isAnswered}
                className={buttonClass}
              >
                <div className="flex items-start">
                  <span
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-3 text-sm font-semibold flex-shrink-0 ${
                      isAnswered
                        ? isCorrectAnswer
                          ? "border-primary bg-primary text-white"
                          : isSelected
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-border bg-surface text-muted-foreground"
                        : isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface text-foreground"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <div className="flex-1 pt-1">
                    <MarkdownRenderer
                      content={option}
                      isHtml={false}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                  {isAnswered && (
                    <div className="ml-3 flex-shrink-0 pt-1">
                      {isCorrectAnswer ? (
                        <HiCheckCircle className="w-6 h-6 text-primary" />
                      ) : isSelected ? (
                        <HiXCircle className="w-6 h-6 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback khi đã trả lời */}
      {isAnswered && (
        <div
          className={`mb-6 p-4 rounded-xl border-2 ${
            isCorrect
              ? "border-primary-light bg-primary-pastel/40"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                isCorrect
                  ? "bg-primary text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {isCorrect ? (
                <HiCheckCircle className="w-5 h-5" />
              ) : (
                <HiXCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <div
                className={`font-semibold mb-2 ${
                  isCorrect ? "text-primary" : "text-amber-700"
                }`}
              >
                {isCorrect
                  ? "Chính xác! Đáp án của bạn đúng."
                  : "Sai rồi! Đáp án đúng là:"}
              </div>
              {!isCorrect && (
                <div className="text-foreground mb-2 font-medium">
                  <span className="font-semibold text-primary">
                    {String.fromCharCode(65 + question.correct_answer)}.{" "}
                  </span>
                  <MarkdownRenderer
                    content={correctOption || ""}
                    isHtml={false}
                    className="prose prose-sm max-w-none text-primary inline"
                  />
                </div>
              )}
              {question.explanation && (
                <div className="text-sm text-muted-foreground mt-2">
                  <div className="flex items-start">
                    <HiLightBulb className="w-4 h-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-primary">
                        Giải thích:
                      </span>{" "}
                      <MarkdownRenderer
                        content={question.explanation}
                        isHtml={false}
                        className="prose prose-sm max-w-none text-foreground/90 inline"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


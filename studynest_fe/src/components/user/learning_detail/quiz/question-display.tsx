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
        <div className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">
          <MarkdownRenderer
            content={question.question}
            isHtml={false}
            className="prose prose-sm max-w-none text-gray-900"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === question.correct_answer;

            let buttonClass =
              "w-full p-4 text-left rounded-lg border-2 transition-all duration-200 cursor-pointer ";

            if (isAnswered) {
              if (isCorrectAnswer) {
                buttonClass +=
                  "border-emerald-500 bg-emerald-50 text-emerald-700";
              } else if (isSelected && !isCorrectAnswer) {
                buttonClass += "border-red-500 bg-red-50 text-red-700";
              } else {
                buttonClass += "border-gray-200 bg-gray-50 text-gray-500";
              }
            } else {
              if (isSelected) {
                buttonClass += "border-green-500 bg-green-50 text-green-700";
              } else {
                buttonClass +=
                  "border-gray-200 hover:border-green-300 hover:bg-green-50";
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
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isSelected
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-gray-300 bg-white text-gray-500"
                        : isSelected
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-gray-300 bg-white text-gray-700"
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
                        <HiCheckCircle className="w-6 h-6 text-emerald-500" />
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
          className={`mb-6 p-4 rounded-lg border-2 ${
            isCorrect
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                isCorrect
                  ? "bg-emerald-500 text-white"
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
                  isCorrect ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {isCorrect
                  ? "Chính xác! Đáp án của bạn đúng."
                  : "Sai rồi! Đáp án đúng là:"}
              </div>
              {!isCorrect && (
                <div className="text-gray-700 mb-2 font-medium">
                  <span className="font-semibold text-emerald-600">
                    {String.fromCharCode(65 + question.correct_answer)}.{" "}
                  </span>
                  <MarkdownRenderer
                    content={correctOption || ""}
                    isHtml={false}
                    className="prose prose-sm max-w-none text-emerald-600 inline"
                  />
                </div>
              )}
              {question.explanation && (
                <div className="text-sm text-gray-600 mt-2">
                  <div className="flex items-start">
                    <HiLightBulb className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-green-700">
                        Giải thích:
                      </span>{" "}
                      <MarkdownRenderer
                        content={question.explanation}
                        isHtml={false}
                        className="prose prose-sm max-w-none text-gray-700 inline"
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


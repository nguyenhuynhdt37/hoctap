"use client";

import { HiCheckCircle } from "react-icons/hi";

interface ExerciseTabsProps {
  exercises: Array<{ id: string; is_pass?: boolean }>;
  currentIndex: number;
  onSelectExercise: (index: number) => void;
}

export default function ExerciseTabs({
  exercises,
  currentIndex,
  onSelectExercise,
}: ExerciseTabsProps) {
  return (
    <div className="bg-surface rounded-xl border border-border p-2 shadow-xs">
      <div className="flex items-center gap-2 overflow-x-auto">
        {exercises.map((ex, index) => (
          <button
            key={ex.id}
            onClick={() => onSelectExercise(index)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all flex-shrink-0 min-w-[120px] cursor-pointer ${
              index === currentIndex
                ? "bg-primary text-white shadow-sm"
                : "bg-background text-foreground hover:bg-primary-pastel/40"
            }`}
          >
            <span className="text-xs font-semibold">Bài {index + 1}</span>
            {ex.is_pass && (
              <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}


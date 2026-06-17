"use client";

import { InstructorResponse } from "@/types/user/instructor";
import { LearningCourseData, LessonOverview } from "@/types/user/learning";
import { useState } from "react";
import QASection from "../qa";
import LessonTab from "./lesson-tab";
import NotesTab from "./notes-tab";
import OverviewTab from "./overview-tab";
import TabButtons from "./tab-buttons";
import ToolsTab from "./tools-tab";

interface LearningTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  title: string;
  notes: string;
  setNotes: (v: string) => void;
  instructor?: InstructorResponse;
  course?: LearningCourseData | null;
  lessonOverview?: LessonOverview;
  onSeekToTime?: (timeSeconds: number) => void;
  accessToken?: string;
}

export default function LearningTabs(props: LearningTabsProps) {
  const {
    activeTab,
    setActiveTab,
    title,
    notes,
    setNotes,
    instructor,
    course,
    lessonOverview,
    onSeekToTime,
    accessToken,
  } = props;

  const [isQAModalOpen, setIsQAModalOpen] = useState(false);

  const handleOpenQA = () => {
    if (lessonOverview?.id) {
      setIsQAModalOpen(true);
    }
  };

  return (
    <div>
      <TabButtons
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isQAModalOpen={isQAModalOpen}
        onOpenQA={handleOpenQA}
      />

      <div className="p-8">
        {activeTab === "overview" && (
          <OverviewTab title={title} course={course} instructor={instructor} />
        )}

        {activeTab === "notes" && (
          <NotesTab
            notes={notes}
            setNotes={setNotes}
            lessonOverview={lessonOverview}
            onSeekToTime={onSeekToTime}
          />
        )}

        {isQAModalOpen && lessonOverview?.id && (
          <QASection
            lessonId={lessonOverview.id}
            accessToken={accessToken}
            isModal={true}
            onClose={() => setIsQAModalOpen(false)}
          />
        )}

        {activeTab === "tools" && <ToolsTab lessonOverview={lessonOverview} />}

        {activeTab === "lesson" && (
          <LessonTab lessonOverview={lessonOverview} />
        )}
      </div>
    </div>
  );
}

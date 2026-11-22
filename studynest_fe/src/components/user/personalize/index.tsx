"use client";

import { Alert, Button, Card, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { formatApiError } from "@/lib/utils/helpers/error";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { HiCheck, HiSearch, HiSparkles, HiX } from "react-icons/hi";

interface Topic {
  id: string;
  name: string;
  slug: string;
}

interface LearningField {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  topics: Topic[];
}

interface PersonalizeProps {
  learningFields: LearningField[];
}

const Personalize = ({ learningFields }: PersonalizeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFields, setSelectedFields] = useState<LearningField[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState<{
    field?: string;
    skills?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const availableTopics = useMemo(() => {
    const seen = new Set<string>();
    return selectedFields
      .flatMap((f) => f.topics ?? [])
      .filter((topic) => {
        const key = topic.name.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [selectedFields]);

  const totalSteps =
    selectedFields.length === 0
      ? learningFields.some((f) => (f.topics ?? []).length > 0)
        ? 2
        : 1
      : availableTopics.length > 0
        ? 2
        : 1;

  const handleFieldSelect = (learningField: LearningField) => {
    setSelectedFields((prev) => {
      const isSelected = prev.some((f) => f.id === learningField.id);
      const nextFields = isSelected
        ? prev.filter((f) => f.id !== learningField.id)
        : [...prev, learningField];

      const validTopicNames = new Set(
        nextFields.flatMap((f) => (f.topics ?? []).map((t) => t.name))
      );
      setSelectedSkills((prevSkills) =>
        prevSkills.filter((skill) => validTopicNames.has(skill))
      );

      if (errors.field && nextFields.length > 0) {
        setErrors((prevErrors) => ({ ...prevErrors, field: "", general: "" }));
      }
      return nextFields;
    });
  };

  const handleSkillToggle = (skillName: string) => {
    setSelectedSkills((prev) => {
      const newSelection = prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName];

      if (errors.skills && newSelection.length > 0) {
        setErrors((prevErrors) => ({ ...prevErrors, skills: "", general: "" }));
      }

      return newSelection;
    });
  };

  const removeSkill = (skillName: string) => {
    setSelectedSkills((prev) => prev.filter((name) => name !== skillName));
  };

  const handleNext = () => {
    if (selectedFields.length === 0) {
      setErrors({ field: "Vui lòng chọn ít nhất một cấp học hoặc lĩnh vực" });
      return;
    }

    if (currentStep === 0 && availableTopics.length > 0) {
      setCurrentStep(1);
      return;
    }

    void handleSubmit();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors((prev) => ({ ...prev, skills: "", general: "" }));
    }
  };

  const isCurrentStepValid = () => {
    if (currentStep === 0) return selectedFields.length > 0;
    if (currentStep === 1) return selectedSkills.length > 0;
    return false;
  };

  const handleSubmit = async () => {
    if (selectedFields.length === 0) {
      setErrors({ field: "Vui lòng chọn ít nhất một cấp học hoặc lĩnh vực" });
      return;
    }

    if (availableTopics.length > 0 && selectedSkills.length === 0) {
      setErrors({ skills: "Vui lòng chọn ít nhất một môn học quan tâm" });
      return;
    }

    const fieldNames = selectedFields.map((f) => f.name).join(", ");
    const personalize =
      selectedSkills.length > 0
        ? `Lĩnh vực: ${fieldNames}. Kỹ năng: ${selectedSkills.join(", ")}.`
        : `Lĩnh vực: ${fieldNames}.`;

    setIsLoading(true);
    setErrors({});
    try {
      await api.post("/user_preferences", {
        preferences: personalize,
      });
      router.push("/");
      router.refresh();
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      if (status === 401) {
        router.push("/login?redirect=/personalize");
      } else {
        setErrors({
          general: formatApiError(
            error,
            "Chưa lưu được sở thích học tập. Vui lòng thử lại."
          ),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const progress = useMemo(() => {
    if (totalSteps === 1) {
      return selectedFields.length > 0 ? 100 : 0;
    }
    if (currentStep === 0) {
      return selectedFields.length > 0 ? 50 : 0;
    }
    return selectedSkills.length > 0 ? 100 : 50;
  }, [totalSteps, currentStep, selectedFields.length, selectedSkills.length]);

  const filteredTopics = useMemo(
    () =>
      availableTopics.filter((topic) =>
        topic.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      ),
    [availableTopics, searchTerm]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary border border-border">
                <HiSparkles className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-bold text-foreground">
                Mây Mây
              </span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Bỏ qua
            </Link>
          </div>

          <div className="mt-5 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
              <span>
                Bước {Math.min(currentStep + 1, totalSteps)} / {totalSteps}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <Alert variant="info">
          Trả lời nhanh vài câu hỏi để Mây Mây cải thiện đề xuất khóa học và lộ trình phù hợp nhất với bạn.
        </Alert>

        {errors.general && (
          <Alert
            variant="destructive"
            onClose={() => setErrors((prev) => ({ ...prev, general: "" }))}
          >
            {errors.general}
          </Alert>
        )}

        <Card className="rounded-[24px] p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5 text-center">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {currentStep === 0
                ? "Bạn đang quan tâm cấp học nào?"
                : "Chọn các môn học bạn muốn ưu tiên"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentStep === 0
                ? "Bạn có thể chọn một hoặc nhiều cấp học để nhận gợi ý phù hợp."
                : "Chọn ít nhất một môn học để cá nhân hóa trang chủ của bạn."}
            </p>
          </div>

          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {learningFields.map((learningField) => {
                  const isSelected = selectedFields.some(
                    (f) => f.id === learningField.id
                  );
                  return (
                    <label
                      key={learningField.id}
                      className={`group flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary-soft border-primary shadow-sm"
                          : "bg-surface border-border hover:border-primary/50 hover:bg-surface-muted/50"
                      }`}
                    >
                      <span
                        className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-surface group-hover:border-primary/60"
                        }`}
                      >
                        {isSelected && <HiCheck className="w-3.5 h-3.5" />}
                      </span>
                      <span className="text-base font-semibold text-foreground">
                        {learningField.name}
                      </span>
                      <input
                        type="checkbox"
                        name="field"
                        value={learningField.id}
                        checked={isSelected}
                        onChange={() => handleFieldSelect(learningField)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>

              {errors.field && (
                <Alert variant="destructive">{errors.field}</Alert>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-soft text-foreground border border-primary/30"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Bỏ chọn ${skill}`}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="max-w-md mx-auto">
                <Input
                  id="topicSearch"
                  type="text"
                  placeholder="Tìm kiếm môn học hoặc chủ đề..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<HiSearch className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Môn học phổ biến trong cấp học đã chọn
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  {filteredTopics.map((topic) => {
                    const isSelected = selectedSkills.includes(topic.name);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => handleSkillToggle(topic.name)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-surface text-foreground border-border hover:border-primary/50 hover:bg-primary-soft/50"
                        }`}
                      >
                        {isSelected ? `✓ ${topic.name}` : `+ ${topic.name}`}
                      </button>
                    );
                  })}
                  {filteredTopics.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Không tìm thấy môn học phù hợp với từ khóa &ldquo;{searchTerm}&rdquo;.
                    </p>
                  )}
                </div>
              </div>

              {errors.skills && (
                <Alert variant="destructive">{errors.skills}</Alert>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                Quay lại
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={!isCurrentStepValid() || isLoading}
              isLoading={isLoading}
              loadingText="Đang lưu..."
            >
              {currentStep === 1 ||
              (currentStep === 0 && availableTopics.length === 0)
                ? "Hoàn thành"
                : "Tiếp theo"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Personalize;

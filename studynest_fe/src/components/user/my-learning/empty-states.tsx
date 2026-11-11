import Link from "next/link";
import { AlertCircle, BookOpen, Compass, RotateCcw } from "lucide-react";
import { Button, Card } from "@/components/ui";

type EmptyStateContent = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onResetFilters?: () => void;
};

export const CourseEmptyState = ({
  content,
}: {
  content: EmptyStateContent;
}) => (
  <Card className="flex flex-col items-center justify-center rounded-[24px] border-border bg-surface p-10 md:p-14 text-center shadow-xs">
    {/* Visual Icon Container */}
    <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary border border-primary-pastel/60 shadow-2xs">
      <BookOpen className="h-8 w-8" />
      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
      </span>
    </div>

    {/* Message */}
    <div className="max-w-md space-y-2 mb-6">
      <h3 className="font-display text-xl font-bold text-foreground">
        {content.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {content.description}
      </p>
    </div>

    {/* Actions */}
    <div className="flex flex-wrap items-center justify-center gap-3">
      {content.onResetFilters && (
        <Button
          variant="outline"
          size="md"
          onClick={content.onResetFilters}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Đặt lại bộ lọc
        </Button>
      )}

      {content.actionHref && content.actionLabel && (
        <Link href={content.actionHref}>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Compass className="w-4 h-4" />}
          >
            {content.actionLabel}
          </Button>
        </Link>
      )}
    </div>
  </Card>
);

export const CourseErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <Card className="flex flex-col items-center justify-center rounded-[24px] border-destructive-border bg-destructive-bg/30 p-10 text-center shadow-xs mb-8">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive-bg text-destructive-foreground border border-destructive-border">
      <AlertCircle className="h-7 w-7" />
    </div>

    <div className="max-w-md space-y-1.5 mb-5">
      <h3 className="text-base font-semibold text-destructive-foreground">
        Không thể tải danh sách khóa học
      </h3>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>

    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="border-destructive-border text-destructive-foreground hover:bg-destructive-bg"
      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
    >
      Thử tải lại
    </Button>
  </Card>
);

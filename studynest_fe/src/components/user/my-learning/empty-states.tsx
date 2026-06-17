import { HiOutlineSearch } from "react-icons/hi";

type EmptyStateContent = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export const CourseEmptyState = ({ content }: { content: EmptyStateContent }) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-green-200 bg-white py-16 text-center">
    <div className="rounded-full bg-green-50 p-4 text-green-600">
      <HiOutlineSearch className="h-8 w-8" />
    </div>
    <div className="space-y-2">
      <p className="text-lg font-semibold text-gray-900">{content.title}</p>
      <p className="text-sm text-gray-600">{content.description}</p>
    </div>
    {content.actionHref && content.actionLabel && (
      <a
        href={content.actionHref}
        className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-green-700"
      >
        {content.actionLabel}
      </a>
    )}
  </div>
);

export const CourseErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
    <p className="text-lg font-semibold text-red-600">Không thể tải danh sách khóa học</p>
    <p className="text-sm text-red-500">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
    >
      Thử lại
    </button>
  </div>
);


// Course related interfaces
export interface Course {
  id: string;
  slug?: string;
  title: string;
  instructor?: string;
  instructorAvatar?: string;
  rating?: number;
  students?: number;
  price: number | null | undefined;
  originalPrice?: number | undefined;
  image?: string;
  badge?: string | undefined;
  isBestSeller?: boolean;
  tags?: string[];
}

export interface CourseCardProps {
  course: Course;
  section: "featured" | "trending" | "top" | "newest" | "recommended";
  showPreview?: boolean;
}

export interface CoursesCarouselProps {
  title: string;
  items: Course[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  hasMore: boolean;
  totalPages: number;
  isLoadingFeeds: boolean;
  isFetchingMore: boolean;
  itemsPerPage: number;
  section: "featured" | "trending" | "top" | "newest" | "recommended";
}

export interface FeedData {
  title: string;
  items: any[];
  next_cursor: string | null;
}

export interface FeedsResponse {
  personalization: FeedData;
  views: FeedData;
  best_sellers: FeedData;
  rating: FeedData;
  created_at: FeedData;
}

export interface DynamicFeedsProps {
  feedsData: FeedsResponse;
  isLoadingFeeds: boolean;
  itemsPerPage: number;
  onLoadMore: (feedType: string, cursor: string) => void;
  isFetchingMore: Record<string, boolean>;
}

export interface CourseItem {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  base_price: number;
  views: number;
  rating: number;
  enrolls: number;
  tags: string[];
  instructor: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface FeedResponse {
  items: CourseItem[];
  next_cursor: string | null;
}

export interface RecommendedItem {
  id: string;
  title: string;
  thumbnail: string;
  slug: string;
  instructor: {
    id: string;
    name: string;
    avatar: string;
  };
  similarity: number;
}

export interface RecommendedResponse {
  items: RecommendedItem[];
}

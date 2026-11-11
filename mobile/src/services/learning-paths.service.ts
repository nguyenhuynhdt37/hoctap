import { api } from './api';
import type { LearningPath, Bundle, BundleQuote, BundleReceipt, PageResult } from '../types/learning-paths';
export const learningPathsService = {
  list: (page=1) => api.get<PageResult<LearningPath>>('/learning-paths', { params:{page} }),
  detail: (slug:string) => api.get<LearningPath>(`/learning-paths/${encodeURIComponent(slug)}`),
  version: (id:string) => api.get<LearningPath>(`/learning-paths/versions/${encodeURIComponent(id)}`),
  follow: (id:string) => api.post<LearningPath>(`/learning-paths/versions/${encodeURIComponent(id)}/follow`),
};
export const bundlesService = {
  list: (page=1) => api.get<PageResult<Bundle>>('/bundles', { params:{page} }),
  detail: (slug:string) => api.get<Bundle>(`/bundles/${encodeURIComponent(slug)}`),
  quote: (id:string) => api.get<BundleQuote>(`/bundles/versions/${encodeURIComponent(id)}/quote`),
  checkout: (version_id:string, quote_hash:string, idempotency_key:string) => api.post<BundleReceipt>('/bundles/checkout',{version_id,quote_hash,idempotency_key}),
  receipt: (id:string) => api.get<BundleReceipt>(`/bundles/orders/${encodeURIComponent(id)}`),
};

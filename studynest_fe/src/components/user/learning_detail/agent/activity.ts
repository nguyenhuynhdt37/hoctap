import type { AgentEvent } from './contracts';

const kinds = new Set(['memory.saved', 'run.started', 'context.resolved', 'context.usage', 'context.compacted', 'context.compacting', 'context.compaction_deferred', 'budget.reserved', 'plan.created', 'plan.updated',
  'tool.started', 'tool.completed', 'tool.failed', 'tool.denied', 'tool.awaiting_approval',
  'run.completed', 'run.partially_completed', 'run.failed', 'run.cancelled', 'run.expired']);
export function safeActivity(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[…]';
  if (typeof value === 'string') return value.replace(/(Bearer\s+|(?:token|secret|password|api_key)\s*[=:]\s*)[^\s,"'}]+/gi, '$1[ẩn]').replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, '[ẩn]').slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 10).map(v => safeActivity(v, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 20)
    .filter(([k]) => !['expected_text', 'replacement', 'verifier', 'nonce_hash'].includes(k))
    .map(([k, v]) => [k, /authorization|token|secret|password|api.?key|cookie|credential/i.test(k) && !(['used_tokens', 'context_window_tokens', 'includes_output_reserve'].includes(k) && typeof v === 'number' && Number.isFinite(v)) ? '[ẩn]' : safeActivity(v, depth + 1)]));
  return value;
}
export function activityEvent(event: AgentEvent): AgentEvent | null {
  if (!kinds.has(event.type)) return null;
  const payload: Record<string, unknown> = {};
  for (const key of ['name', 'tool_name', 'tool_call_id', 'arguments', 'steps', 'latency_ms', 'image_count', 'count', 'before_characters', 'after_characters', 'history_preserved', 'method', 'coverage_pending', 'model', 'used_tokens', 'context_window_tokens', 'percent', 'estimated', 'threshold_percent', 'limit_source', 'error', 'error_code', 'state']) {
    if (key in event.payload) payload[key] = event.payload[key];
  }
  const result = event.payload.result;
  if (result && typeof result === 'object') {
    const source = result as Record<string, unknown>;
    const preview: Record<string, unknown> = {};
    for (const key of ['verified', 'notice', 'rows', 'columns', 'stdout', 'stderr', 'exit_code', 'passed', 'tests_executed', 'next_page', 'next_offset', 'repository', 'path', 'item_count']) {
      if (key in source) preview[key] = source[key];
    }
    if (Array.isArray(source.items)) preview.item_count = source.items.length;
    payload.result = preview;
  }
  return { ...event, payload: safeActivity(payload) as Record<string, unknown> };
}

export function toolLabel(name: string) {
  if (name === 'mcp.bash' || /^(?:bash|shell|terminal)(?:\.|$)/.test(name)) return 'Bash';
  if (name === 'mcp.browser_snapshot') return 'Đọc màn hình';
  if (name === 'mcp.browser_click') return 'Nhấn trên màn hình';
  if (name === 'mcp.browser_navigate') return 'Điều hướng trang';
  if (name === 'mcp.browser_fill') return 'Điền nội dung';
  if (name === 'mcp.browser_scroll') return 'Cuộn màn hình';
  if (name === 'mcp.browser_highlight') return 'Chỉ điểm trên màn hình';
  if (name === 'quiz.get_state') return 'Đọc câu hỏi trắc nghiệm';
  if (name === 'quiz.select_option') return 'Chọn đáp án trắc nghiệm';
  if (name.includes('github_list')) return 'Liệt kê repo GitHub';
  if (name.includes('github_read')) return 'Đọc file GitHub';
  if (name.includes('github_tree')) return 'Xem cây thư mục';
  if (name.includes('github')) return 'Kiểm tra GitHub';
  if (name === 'data.query_account') return 'Truy vấn SQL sandbox';
  if (name.includes('run_sample_tests')) return 'Chạy kiểm thử';
  if (name.includes('read_file') || name.includes('read_selection')) return 'Đọc code';
  if (name.includes('patch')) return 'Thay đổi code';
  if (name.includes('search')) return 'Tìm kiếm';
  if (name === 'learning.fetch_video_transcript') return 'Đọc phụ đề video';
  if (name === 'learning.get_lesson_content') return 'Đọc nội dung bài học';
  if (name.startsWith('memory.')) return 'Bộ nhớ tài khoản';
  if (name.startsWith('video.')) return 'Điều khiển video';
  if (name.startsWith('ui.')) return 'Điều khiển giao diện';
  return 'Thực hiện công cụ';
}

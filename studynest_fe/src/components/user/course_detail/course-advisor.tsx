'use client';

import { useEffect, useRef, useState } from 'react';
import { coinToVnd } from '@/lib/learning-hub/coin-logic';
import { useCoinRate } from '@/lib/learning-hub/shop-hooks';
import api from '@/lib/utils/fetcher/client/axios';
import MarkdownRenderer from '@/components/shared/markdown-renderer';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/states';
import { Input, Textarea, Select } from '@/components/ui/input';

interface AdvisorResponse {
  content: string;
  claims: Array<{ criterion: string; assessment: string; explanation: string; evidence: Array<{ field: string; value: unknown }> }>;
  limitations: string[];
  follow_up_questions: string[];
  sources: unknown[];
  comparison?: Array<{ id: string; title: string; subject: string | null; requirements: string[]; outcomes: string[]; price: string; currency: string; delivery_type: string }>;
}
export default function CourseAdvisor({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const coinRateVnd = useCoinRate();
  const [opened, setOpened] = useState(false);
  const [question, setQuestion] = useState('Khóa học này phù hợp với ai và mình cần cân nhắc điều gì?');
  const [goals, setGoals] = useState('');
  const [grade, setGrade] = useState('');
  const [budget, setBudget] = useState('');
  const [result, setResult] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [alternatives, setAlternatives] = useState<Array<{ id: string; title: string }>>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  useEffect(() => { if (opened) void api.get('/catalog/courses?limit=20').then(response => setAlternatives((response.data.items || []).filter((item: { id: string }) => item.id !== courseId))).catch(() => undefined); }, [opened, courseId]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); }, [courseId]);
  const ask = async (nextQuestion = question) => {
    if (!nextQuestion.trim() || loading) return;
    request.current?.abort(); const abort = new AbortController(); request.current = abort;
    setLoading(true); setError('');
    try {
      const response = await api.post<AdvisorResponse>('/agent/advisor', { course_id: courseId, question: nextQuestion.trim(),
        ...(goals.trim() ? { goals: goals.trim() } : {}), ...(compareIds.length ? { compare_course_ids: compareIds } : {}), ...(grade ? { grade: Number(grade) } : {}), ...(budget ? { budget: coinToVnd(Number(budget), coinRateVnd) } : {}),
      }, { signal: abort.signal });
      setResult(response.data); setQuestion(nextQuestion);
    } catch (e) { if (!abort.signal.aborted) setError('Chưa phân tích được khóa học. Bạn có thể thử lại; Mây Mây chưa đưa ra kết luận.'); }
    finally { if (!abort.signal.aborted) setLoading(false); }
  };
  const listen = () => {
    if (!result || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(result.content.replace(/[#*_`]/g, ''));
    utterance.lang = 'vi-VN'; utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utterance); setSpeaking(true);
  };
  return <section aria-label="Tư vấn khóa học cùng Mây Mây" className="rounded-3xl border border-primary-pastel bg-surface p-6 sm:p-8">
    <p className="text-xs font-semibold text-primary">Cùng Mây Mây lựa chọn</p>
    <h2 className="mt-2 text-xl font-semibold text-foreground">Khóa học này có phù hợp với bạn?</h2>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Tìm hiểu yêu cầu đầu vào, nội dung và những điều cần cân nhắc từ thông tin thật của {courseTitle}.</p>
    {!opened ? <Button className="mt-4" variant="pastel" onClick={() => setOpened(true)}>Trò chuyện với Mây Mây</Button> : <div className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Lớp đang học (tùy chọn)" value={grade} onChange={e => setGrade(e.target.value)}><option value="">Chưa cung cấp</option>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>Lớp {index + 1}</option>)}</Select>
        <Input label="Ngân sách Coin (tùy chọn)" type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} />
      </div>
      <Input label="Mục tiêu học tập trong phiên này (tùy chọn)" maxLength={800} value={goals} onChange={e => setGoals(e.target.value)} placeholder="Ví dụ: ôn kiến thức nền trước khi học lập trình web" />
      {alternatives.length > 0 && <Select label="Đối chiếu với khóa học khác (tùy chọn)" value={compareIds[0] || ""} onChange={event => setCompareIds(event.target.value ? [event.target.value] : [])}><option value="">Chưa chọn khóa thay thế</option>{alternatives.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</Select>}
      <Textarea label="Điều bạn muốn tìm hiểu" maxLength={2000} rows={3} value={question} onChange={e => setQuestion(e.target.value)} />
      <p className="text-xs leading-relaxed text-muted-foreground">Thông tin bạn nhập chỉ dùng cho yêu cầu tư vấn này. Không tự lưu thành hồ sơ học tập và không mở micro.</p>
      <div className="flex flex-wrap gap-2"><Button isLoading={loading} loadingText="Đang đối chiếu thông tin…" disabled={!question.trim()} onClick={() => void ask()}>Phân tích khóa học</Button><Button variant="ghost" onClick={() => { request.current?.abort(); setLoading(false); setOpened(false); }}>Thu gọn</Button></div>
      {error && <Alert variant="warning">{error}</Alert>}
      {result && <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
        <MarkdownRenderer content={result.content} isHtml={false} />
        {result.limitations?.length > 0 && <div><h3 className="text-sm font-semibold text-foreground">Những điều cần cân nhắc</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{result.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
        {result.claims?.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-medium text-primary">Xem thông tin được đối chiếu</summary><div className="mt-3 space-y-3">{result.claims.map((claim, index) => <div key={index}><p className="text-foreground">{claim.explanation}</p><ul className="mt-1 space-y-1 text-xs text-muted-foreground">{claim.evidence?.map((evidence, i) => <li key={i}>{typeof evidence.value === 'string' ? evidence.value : JSON.stringify(evidence.value)}</li>)}</ul></div>)}</div></details>}
        {result.comparison && result.comparison.length > 0 && <div className="space-y-3"><h3 className="text-sm font-semibold text-foreground">Khóa học để đối chiếu</h3>{result.comparison.map(item => <article key={item.id} className="rounded-xl border border-border bg-surface p-3"><h4 className="text-sm font-semibold text-foreground">{item.title}</h4><p className="mt-1 text-xs text-muted-foreground">{item.subject || 'Chưa phân loại môn'} · {item.price} {item.currency}</p><p className="mt-2 text-sm text-foreground">{item.requirements.length ? `Đầu vào: ${item.requirements.join('; ')}` : 'Chưa công bố yêu cầu đầu vào.'}</p><p className="mt-1 text-sm text-foreground">{item.outcomes.length ? `Mục tiêu: ${item.outcomes.join('; ')}` : 'Chưa công bố mục tiêu đầu ra.'}</p></article>)}</div>}
        {result.follow_up_questions?.length > 0 && <div className="flex flex-wrap gap-2">{result.follow_up_questions.map((item, index) => <Button key={index} variant="outline" size="sm" disabled={loading} className="h-auto whitespace-normal py-2 text-left leading-relaxed" onClick={() => void ask(item)}>{item}</Button>)}</div>}
        {typeof window !== 'undefined' && 'speechSynthesis' in window && <Button variant="ghost" size="sm" onClick={listen}>{speaking ? 'Dừng đọc' : 'Nghe bản giải thích'}</Button>}
      </div>}
    </div>}
  </section>;
}

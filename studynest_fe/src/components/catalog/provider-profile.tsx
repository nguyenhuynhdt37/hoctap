"use client";
import useSWR from "swr";
import Link from "next/link";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui";
import type { Provider } from "@/types/catalog";
import CatalogBrowser from "./catalog-browser";
export default function ProviderProfile({ slug }: { slug: string }) {
  const { data, error, mutate } = useSWR<Provider>(`/providers/${encodeURIComponent(slug)}`, (url: string) => api.get<Provider>(url).then(r => r.data));
  if (error) return <div role="alert" className="p-8">Không tìm thấy đơn vị hoặc không tải được thông tin. <Button onClick={() => mutate()}>Thử lại</Button></div>;
  if (!data) return <p role="status" className="animate-pulse p-8">Đang tải đơn vị…</p>;
  return <div className="space-y-10"><section className="overflow-hidden rounded-2xl border border-border bg-surface">{data.banner_url && <img src={data.banner_url} alt="" className="h-48 w-full object-cover" />}<div className="space-y-4 p-6 sm:p-8">{data.logo_url && <img src={data.logo_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />}<h1 className="text-3xl font-semibold text-foreground">{data.name}</h1>{data.description && <p className="whitespace-pre-line text-muted-foreground">{data.description}</p>}<div className="flex flex-wrap gap-2">{[...(data.grades ?? []),...(data.subjects ?? [])].map(x=><span key={x.id} className="rounded-lg bg-primary-light px-3 py-2 text-sm text-foreground">{x.name}</span>)}</div><div className="flex flex-wrap gap-3">{data.instructors?.map(teacher => <Link key={teacher.id} href={`/instructors/${teacher.id}`} className="rounded-xl bg-primary-light px-4 py-2 text-sm text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{teacher.fullname}</Link>)}</div></div></section><h2 className="text-xl font-semibold">Khóa học của đơn vị</h2><CatalogBrowser provider={slug} /></div>;
}

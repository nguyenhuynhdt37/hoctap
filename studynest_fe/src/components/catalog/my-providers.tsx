"use client";
import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui";
import type { Provider } from "@/types/catalog";
import ProviderEditor from "./provider-editor";
export default function MyProviders() {
  const [value,setValue]=useState<Partial<Provider>|null>(null);
  const {data,error,mutate}=useSWR<{items:Provider[]}>("/lecturer/providers",(url: string)=>api.get(url).then(r=>r.data));
  return <main className="space-y-6 p-6 text-foreground"><div className="flex justify-between gap-4"><h1 className="text-2xl font-semibold">Đơn vị của tôi</h1><Button onClick={()=>setValue({})}>Tạo đơn vị</Button></div>{error ? <div role="alert">Không tải được đơn vị. <Button onClick={()=>mutate()}>Thử lại</Button></div> : !data ? <p role="status">Đang tải…</p> : data.items.length===0 ? <p className="rounded-xl border border-border p-6">Bạn chưa tham gia đơn vị nào.</p> : <div className="grid gap-4 sm:grid-cols-2">{data.items.map(item=><article key={item.id} className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-semibold">{item.name}</h2><p className="my-3 text-sm text-muted-foreground">{item.verification_status}</p><Button variant="outline" onClick={()=>setValue(item)}>Quản lý</Button></article>)}</div>}{value && <ProviderEditor value={value} onSaved={()=>{setValue(null);mutate();}} onCancel={()=>setValue(null)} />}</main>;
}

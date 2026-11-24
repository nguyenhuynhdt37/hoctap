'use client';
import { safeUUID } from "@/lib/utils/uuid";
import { useEffect, useRef, useState } from 'react';
import { Image, X } from 'pulsoicon-react';
import { Button } from '@/components/ui/button';
import { prepareImageUpload } from '@/lib/prepare-image-upload';
import api from '@/lib/utils/fetcher/client/axios';
import type { UploadedImage } from '@/types/user/tutor-chat';

type Attachment = {id:string;preview:string;data?:UploadedImage;error?:string};
export function useChatImages() {
  const [items,setItems] = useState<Attachment[]>([]);
  const [error,setError] = useState('');
  const urls = useRef(new Map<string,string>());
  const alive = useRef(true);
  useEffect(()=>{ alive.current=true; const all=urls.current; return ()=>{alive.current=false;all.forEach(url=>URL.revokeObjectURL(url));all.clear();};},[]);
  const remove = (id:string) => { const url=urls.current.get(id);if(url)URL.revokeObjectURL(url);urls.current.delete(id);setItems(current=>current.filter(item=>item.id!==id)); };
  const clear = () => { urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current.clear();setItems([]); };
  const add = async (files:File[]) => {
    setError('');
    const selected=files.filter(file=>/^image\/(png|jpeg|webp|gif)$/.test(file.type));
    if(selected.length!==files.length)setError('Chỉ hỗ trợ PNG, JPEG, WebP và GIF.');
    const room=Math.max(0,3-urls.current.size);
    if(selected.length>room)setError('Mỗi tin nhắn tối đa 3 ảnh.');
    const pending=selected.slice(0,room).filter(file=>{if(file.size>30*1024*1024){setError('Ảnh quá lớn để xử lý (tối đa 30 MB trước khi nén).');return false;}return true;}).map(file=>{
      const id=safeUUID();const preview=URL.createObjectURL(file);urls.current.set(id,preview);return {id,preview,file};
    });
    setItems(current=>[...current,...pending]);
    await Promise.all(pending.map(async item=>{
      try {
        const form=new FormData();form.append('file',await prepareImageUpload(item.file,'chat'));
        const {data}=await api.post<UploadedImage>('/agent/attachments/image',form,{headers:{'Content-Type':'multipart/form-data'}});
        if(alive.current)setItems(current=>current.map(value=>value.id===item.id?{...value,data}:value));
      }catch{if(alive.current)setItems(current=>current.map(value=>value.id===item.id?{...value,error:'Tải ảnh lỗi. Xóa và chọn lại.'}:value));}
    }));
  };
  return {items,error,add,remove,clear,ready:items.every(item=>!!item.data),images:items.flatMap(item=>item.data?[item.data]:[])};
}

export function ChatImageAttachments({attachments,disabled}:{attachments:ReturnType<typeof useChatImages>;disabled?:boolean}) {
  const input=useRef<HTMLInputElement>(null);
  return <>
    <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" aria-label="Chọn ảnh để hỏi trợ lý" onChange={event=>{void attachments.add(Array.from(event.target.files||[]));event.target.value='';}} />
    <Button size="icon" variant="ghost" disabled={disabled||attachments.items.length>=3} aria-label="Đính kèm ảnh" title="Chọn tối đa 3 ảnh; có thể dán hoặc kéo thả vào chat" onClick={()=>input.current?.click()}><Image animated={false} size="1em" /></Button>
  </>;
}

export function ChatImagePreviews({attachments}:{attachments:ReturnType<typeof useChatImages>}) {
  return <>{attachments.items.length>0&&<div className="flex flex-wrap gap-2 px-3 pt-2" aria-label="Ảnh chờ gửi">{attachments.items.map(item=><div key={item.id} className="relative w-24 rounded-xl border border-border bg-background p-1"><img src={item.preview} alt="Ảnh đính kèm" className="h-20 w-full rounded-lg object-cover" /><Button size="icon" variant="outline" className="absolute -right-1 -top-1 h-6 w-6" aria-label="Xóa ảnh đính kèm" onClick={()=>attachments.remove(item.id)}><X animated={false} size="1em" /></Button><p className="mt-1 text-xs text-muted-foreground">{item.error||(!item.data?'Đang tải…':'Sẵn sàng')}</p></div>)}</div>}{attachments.error&&<p role="alert" className="px-3 pt-1 text-xs text-warning-foreground">{attachments.error}</p>}</>;
}

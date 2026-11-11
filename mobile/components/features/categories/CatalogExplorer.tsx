import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui';
import { catalogService } from '@/src/services/catalog.service';

export default function CatalogExplorer() {
  const router=useRouter();
  const [grade,setGrade]=useState<number|undefined>();
  const [subject,setSubject]=useState<string|undefined>();
  const [cursor,setCursor]=useState<string|undefined>();
  const filters=useQuery({queryKey:['catalog-filters'],queryFn:()=>catalogService.filters().then(r=>r.data)});
  const courses=useQuery({queryKey:['catalog',grade,subject,cursor],queryFn:()=>catalogService.courses({grade,subject,cursor,limit:6}).then(r=>r.data),enabled:!!grade});
  const selectedGrade=filters.data?.grades.find(x=>x.grade_number===grade);
  const subjects=filters.data?.subjects.filter(x=>filters.data?.grade_subjects.some(link=>link.grade_id===selectedGrade?.id && link.subject_id===x.id)) ?? [];
  return <View className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
    <Text className="mb-3 text-lg font-semibold text-slate-800">Tìm khóa học theo lớp và môn</Text>
    {filters.isLoading ? <ActivityIndicator accessibilityLabel="Đang tải phân loại"/> : filters.isError ? <Pressable accessibilityRole="button" onPress={()=>filters.refetch()}><Text>Không tải được phân loại. Chạm để thử lại.</Text></Pressable> : <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><View className="mb-3 flex-row gap-2">{filters.data?.grades.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:grade===item.grade_number}} onPress={()=>{setGrade(item.grade_number);setSubject(undefined);setCursor(undefined);}} className={`rounded-xl border p-3 ${grade===item.grade_number ? 'border-blue-600 bg-blue-100':'border-slate-200'}`}><Text className="text-slate-800">{item.name}</Text></Pressable>)}</View></ScrollView>
      {grade && <ScrollView horizontal showsHorizontalScrollIndicator={false}><View className="mb-3 flex-row gap-2"><Pressable accessibilityRole="button" onPress={()=>{setSubject(undefined);setCursor(undefined);}} className="rounded-xl border border-slate-200 p-3"><Text>Tất cả môn</Text></Pressable>{subjects.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:subject===item.slug}} onPress={()=>{setSubject(item.slug);setCursor(undefined);}} className={`rounded-xl border p-3 ${subject===item.slug ? 'border-blue-600 bg-blue-100':'border-slate-200'}`}><Text className="text-slate-800">{item.name}</Text></Pressable>)}</View></ScrollView>}
      {grade && (courses.isLoading ? <ActivityIndicator/> : courses.isError ? <Pressable onPress={()=>courses.refetch()}><Text>Không tải được khóa học. Thử lại.</Text></Pressable> : <>{courses.data?.items.length===0 && <Text className="py-3 text-slate-600">Chưa có khóa học phù hợp.</Text>}{courses.data?.items.map(course=><Pressable key={course.id} accessibilityRole="link" onPress={()=>router.push({pathname:'/course/[slug]',params:{slug:course.slug}})} className="mb-3 rounded-xl border border-slate-200 p-3"><Text className="font-semibold text-slate-800">{course.title}</Text><Text className="mt-1 text-sm text-slate-600">{course.instructor.fullname}{course.provider ? ` · ${course.provider.name}`:''}</Text><Text className="mt-2 text-blue-700">{course.base_price===0 ? 'Miễn phí':new Intl.NumberFormat('vi-VN',{style:'currency',currency:course.currency}).format(course.base_price)}</Text></Pressable>)}{courses.data?.next_cursor && <Pressable accessibilityRole="button" onPress={()=>setCursor(courses.data?.next_cursor ?? undefined)} className="rounded-xl bg-blue-100 p-3"><Text>Trang tiếp theo</Text></Pressable>}{cursor && <Pressable accessibilityRole="button" onPress={()=>setCursor(undefined)} className="p-3"><Text>Về trang đầu</Text></Pressable>}</>)}
    </>}
  </View>;
}

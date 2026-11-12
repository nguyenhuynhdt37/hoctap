"use client";

import useSWR from "swr";

export interface Province {
  province_id: string;
  province_name: string;
}

export interface District {
  district_id: string;
  district_name: string;
}

const PROVINCES_API = "https://vapi.vnappmob.com/api/v2/province/";

async function fetchProvinces(): Promise<Province[]> {
  const response = await fetch(PROVINCES_API);
  if (!response.ok) throw new Error("Không tải được danh sách tỉnh thành");
  const data = await response.json();
  return data?.results || [];
}

async function fetchDistricts(provinceId: string): Promise<District[]> {
  const response = await fetch(`${PROVINCES_API}district/${provinceId}`);
  if (!response.ok) throw new Error("Không tải được danh sách quận huyện");
  const data = await response.json();
  return data?.results || [];
}

export function useAdminDivisions(provinceId: string) {
  const provinces = useSWR("vietnam-provinces", fetchProvinces, {
    revalidateOnFocus: false,
  });
  const districts = useSWR(
    provinceId ? ["vietnam-districts", provinceId] : null,
    () => fetchDistricts(provinceId),
    { revalidateOnFocus: false }
  );

  return {
    provinces: provinces.data ?? [],
    districts: districts.data ?? [],
    provincesLoading: provinces.isLoading,
    districtsLoading: districts.isLoading,
    provincesError: provinces.error ? "Không tải được danh sách tỉnh thành" : "",
    districtsError: districts.error ? "Không tải được danh sách quận huyện" : "",
  };
}

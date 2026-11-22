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

const OPEN_PROVINCES_API = "https://provinces.open-api.vn/api/v1";

interface OpenProvinceItem {
  code: number;
  name: string;
  districts?: Array<{
    code: number;
    name: string;
  }>;
}

async function fetchProvinces(): Promise<Province[]> {
  const response = await fetch(`${OPEN_PROVINCES_API}/?depth=1`);
  if (!response.ok) throw new Error("Không tải được danh sách tỉnh thành");
  const data: unknown = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Danh sách tỉnh thành trống");
  }
  return (data as OpenProvinceItem[])
    .filter((item) => typeof item?.code === "number" && Boolean(item?.name))
    .map((item) => ({
      province_id: String(item.code).padStart(2, "0"),
      province_name: item.name,
    }));
}

async function fetchDistricts(provinceId: string): Promise<District[]> {
  const numericCode = Number.parseInt(provinceId, 10);
  if (!Number.isFinite(numericCode) || numericCode <= 0) return [];

  const response = await fetch(`${OPEN_PROVINCES_API}/p/${numericCode}?depth=2`);
  if (!response.ok) throw new Error("Không tải được danh sách quận huyện");
  const data = (await response.json()) as OpenProvinceItem;
  const list = Array.isArray(data?.districts) ? data.districts : [];
  return list
    .filter((item) => typeof item?.code === "number" && Boolean(item?.name))
    .map((item) => ({
      district_id: String(item.code).padStart(3, "0"),
      district_name: item.name,
    }));
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

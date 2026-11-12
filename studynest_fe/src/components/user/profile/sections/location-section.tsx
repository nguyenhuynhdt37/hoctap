"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { useAdminDivisions } from "../hooks/use-admin-divisions";
import { ProfileEditor } from "../hooks/use-profile-form";

interface LocationSectionProps {
  editor: ProfileEditor;
  divisions: ReturnType<typeof useAdminDivisions>;
}

export default function LocationSection({ editor, divisions }: LocationSectionProps) {
  const { values, editing, update } = editor;
  const {
    provinces,
    districts,
    provincesLoading,
    districtsLoading,
    provincesError,
    districtsError,
  } = divisions;

  return (
    <Card density="none">
      <CardHeader>
        <CardTitle>Nơi ở</CardTitle>
        <CardDescription>Chọn tỉnh trước, rồi chọn quận hoặc huyện.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Tỉnh / thành phố"
          value={values.conscious}
          disabled={!editing || provincesLoading}
          error={provincesError}
          onChange={(event) => update({ conscious: event.target.value })}
        >
          <option value="">
            {provincesLoading ? "Đang tải..." : "Chọn tỉnh / thành phố"}
          </option>
          {provinces.map((province) => (
            <option key={province.province_id} value={province.province_id}>
              {province.province_name}
            </option>
          ))}
        </Select>
        <Select
          label="Quận / huyện"
          value={values.district}
          disabled={!editing || !values.conscious || districtsLoading}
          error={districtsError}
          hint={values.conscious ? undefined : "Chọn tỉnh trước"}
          onChange={(event) => update({ district: event.target.value })}
        >
          <option value="">
            {!values.conscious
              ? "Chọn tỉnh trước"
              : districtsLoading
                ? "Đang tải..."
                : "Chọn quận / huyện"}
          </option>
          {districts.map((district) => (
            <option key={district.district_id} value={district.district_id}>
              {district.district_name}
            </option>
          ))}
        </Select>
      </CardContent>
    </Card>
  );
}

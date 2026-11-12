"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProfileEditor } from "../hooks/use-profile-form";

export default function AccountSection({ editor }: { editor: ProfileEditor }) {
  const { profile, values, editing, fieldErrors, update } = editor;

  return (
    <Card density="none">
      <CardHeader>
        <CardTitle>Tài khoản</CardTitle>
        <CardDescription>Tên hiển thị và thông tin đăng nhập.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label="Họ và tên"
          required
          value={values.fullname}
          disabled={!editing}
          error={fieldErrors.fullname}
          onChange={(event) => update({ fullname: event.target.value })}
        />
        <Input label="Email" value={profile.email} disabled hint="Email không đổi tại đây." />
        <Input
          label="Ngày sinh"
          type="date"
          value={values.birthday}
          disabled={!editing}
          max={new Date().toISOString().slice(0, 10)}
          error={fieldErrors.birthday}
          onChange={(event) => update({ birthday: event.target.value })}
        />
      </CardContent>
    </Card>
  );
}

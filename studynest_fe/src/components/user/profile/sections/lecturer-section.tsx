"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { BsPaypal } from "react-icons/bs";
import { ProfileEditor } from "../hooks/use-profile-form";

export default function LecturerSection({ editor }: { editor: ProfileEditor }) {
  const { profile, values, editing, fieldErrors, update } = editor;
  const [paypalError, setPaypalError] = useState("");

  const connectPaypal = () => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_PAYPAL_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      setPaypalError("Chưa cấu hình PayPal trên môi trường này.");
      return;
    }
    const returnUrl = window.btoa(`${window.location.origin}/lecturer/profile`);
    window.location.href = `https://www.sandbox.paypal.com/connect?flowEntry=static&client_id=${clientId}&response_type=code&scope=openid%20email&redirect_uri=${redirectUri}&state=${returnUrl}`;
  };

  return (
    <Card density="none">
      <CardHeader>
        <CardTitle>Giảng viên</CardTitle>
        <CardDescription>
          Phần này chỉ dùng cho hồ sơ nhận lớp và thanh toán.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">
            Giới thiệu giảng viên
          </p>
          {editing ? (
            <div className="overflow-hidden rounded-xl border border-input bg-surface">
              <TiptapEditor
                value={values.instructor_description}
                onChange={(markdown) => update({ instructor_description: markdown })}
                placeholder="Kinh nghiệm giảng dạy và cách bạn đồng hành cùng học sinh..."
                minHeight="180px"
              />
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground whitespace-pre-wrap">
              {values.instructor_description.trim() || "Chưa có giới thiệu giảng viên."}
            </p>
          )}
          {fieldErrors.instructor_description && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-destructive-foreground">
              {fieldErrors.instructor_description}
            </p>
          )}
        </div>

        <Input
          label="Số CMND / CCCD"
          value={values.citizenship_identity}
          disabled={!editing}
          inputMode="numeric"
          error={fieldErrors.citizenship_identity}
          hint="9 số CMND hoặc 12 số CCCD."
          onChange={(event) => update({ citizenship_identity: event.target.value })}
        />
        <Input
          label="Email PayPal"
          value={profile.paypal_email || ""}
          disabled
          placeholder="Chưa liên kết PayPal"
        />
        <Input
          label="PayPal Payer ID"
          value={profile.paypal_payer_id || ""}
          disabled
          placeholder="Chưa có mã người thanh toán"
        />
        <Button type="button" variant="outline" onClick={connectPaypal} leftIcon={<BsPaypal />}>
          Cập nhật PayPal
        </Button>
        {paypalError && (
          <p role="alert" className="text-xs font-medium text-destructive-foreground">
            {paypalError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

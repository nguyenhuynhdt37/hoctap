"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import TiptapEditor from "@/components/shared/tiptap_editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@/lib/utils/fetcher/client/axios";
import { useState } from "react";
import { BrandPaypal } from "pulsoicon-react";
import { ProfileEditor } from "../hooks/use-profile-form";

export default function LecturerSection({ editor }: { editor: ProfileEditor }) {
  const { values, editing, fieldErrors, update } = editor;
  const [paypalError, setPaypalError] = useState("");
  const [connectingPaypal, setConnectingPaypal] = useState(false);

  const connectPaypal = async () => {
    setPaypalError("");
    setConnectingPaypal(true);
    try {
      const scope = process.env.NEXT_PUBLIC_PAYPAL_SCOPE || "openid";
      const response = await api.get<{ url: string }>("/lecturer/payout/connect-url", {
        params: {
          return_url: `${window.location.origin}/lecturer/profile`,
          scope,
        },
      });
      if (!response.data?.url) {
        setPaypalError("Không nhận được đường dẫn kết nối PayPal.");
        return;
      }
      window.location.href = response.data.url;
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setPaypalError(
        typeof detail === "string" && detail.trim()
          ? detail
          : "Không thể khởi tạo kết nối PayPal."
      );
    } finally {
      setConnectingPaypal(false);
    }
  };

  const identityDigits = values.citizenship_identity.replace(/\D/g, "");

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
          ) : values.instructor_description.trim() ? (
            <div className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground">
              <MarkdownRenderer content={values.instructor_description} isHtml={false} />
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-muted-foreground">
              Chưa có giới thiệu giảng viên.
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
          hint={
            identityDigits.length > 0
              ? `9 số CMND hoặc 12 số CCCD (hiện có ${identityDigits.length} chữ số).`
              : "9 số CMND hoặc 12 số CCCD."
          }
          onChange={(event) =>
            update({
              citizenship_identity: event.target.value.replace(/[^\d\s-]/g, ""),
            })
          }
        />
        <Input
          label="Email PayPal"
          value={values.paypal_email}
          disabled
          readOnly
          type="email"
          placeholder="Chưa kết nối PayPal"
          hint="Email nhận tiền chỉ được đặt khi bạn kết nối PayPal OAuth bên dưới."
        />
        <Input
          label="PayPal Payer ID"
          value={values.paypal_payer_id}
          disabled
          readOnly
          placeholder="Chưa kết nối PayPal"
        />
        <Button
          type="button"
          variant="outline"
          onClick={connectPaypal}
          isLoading={connectingPaypal}
          loadingText="Đang chuyển sang PayPal..."
          leftIcon={<BrandPaypal size="1em" />}
        >
          Kết nối PayPal OAuth
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

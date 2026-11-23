"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import TiptapEditor from "@/components/shared/tiptap_editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProfileEditor } from "../hooks/use-profile-form";

export default function AboutSection({ editor }: { editor: ProfileEditor }) {
  const { values, editing, generatingBio, fieldErrors, update, generateBio } = editor;

  return (
    <Card density="none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Giới thiệu</CardTitle>
            <CardDescription>Một đoạn ngắn để người khác biết bạn (hỗ trợ định dạng Markdown).</CardDescription>
          </div>
          <Button
            type="button"
            variant="pastel"
            size="sm"
            disabled={!editing || generatingBio}
            isLoading={generatingBio}
            loadingText="Đang viết..."
            onClick={generateBio}
          >
            Gợi ý bằng AI
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Về bạn</p>
          {editing ? (
            <div className="overflow-hidden rounded-xl border border-input bg-surface">
              <TiptapEditor
                value={values.bio}
                onChange={(markdown) => update({ bio: markdown })}
                placeholder="Bạn đang học gì, và muốn tiến bộ điều gì?"
                minHeight="160px"
              />
            </div>
          ) : values.bio.trim() ? (
            <div className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground">
              <MarkdownRenderer content={values.bio} isHtml={false} />
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-muted-foreground">
              Chưa có giới thiệu về bạn.
            </p>
          )}
          {fieldErrors.bio && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-destructive-foreground">
              {fieldErrors.bio}
            </p>
          )}
        </div>
        <Input
          label="Facebook"
          type="url"
          inputMode="url"
          value={values.facebook_url}
          disabled={!editing}
          placeholder="https://facebook.com/..."
          error={fieldErrors.facebook_url}
          onChange={(event) => update({ facebook_url: event.target.value })}
        />
      </CardContent>
    </Card>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ProfileEditor } from "../hooks/use-profile-form";

export default function AboutSection({ editor }: { editor: ProfileEditor }) {
  const { values, editing, generatingBio, fieldErrors, update, generateBio } = editor;

  return (
    <Card density="none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Giới thiệu</CardTitle>
            <CardDescription>Một đoạn ngắn để người khác biết bạn.</CardDescription>
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
        <Textarea
          label="Về bạn"
          value={values.bio}
          disabled={!editing}
          rows={5}
          maxLength={2000}
          placeholder="Bạn đang học gì, và muốn tiến bộ điều gì?"
          error={fieldErrors.bio}
          onChange={(event) => update({ bio: event.target.value })}
        />
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

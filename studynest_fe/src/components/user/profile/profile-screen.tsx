"use client";

import { Alert } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/types/user/profile";
import { useAdminDivisions } from "./hooks/use-admin-divisions";
import { useProfileForm } from "./hooks/use-profile-form";
import ProfileIdentity from "./profile-identity";
import { ProfileMode } from "./schema";
import AccountSection from "./sections/account-section";
import AboutSection from "./sections/about-section";
import LecturerSection from "./sections/lecturer-section";
import LocationSection from "./sections/location-section";

interface ProfileScreenProps {
  profile: UserProfile;
  mode?: ProfileMode;
}

export default function ProfileScreen({
  profile,
  mode = "learner",
}: ProfileScreenProps) {
  const editor = useProfileForm(profile, mode);
  const divisions = useAdminDivisions(editor.values.conscious);

  return (
    <div className="min-h-screen bg-background">
      <form
        className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          void editor.submit();
        }}
      >
        <ProfileIdentity
          editor={editor}
          provinces={divisions.provinces}
          districts={divisions.districts}
        />

        <div className="space-y-4">
          {editor.formError && <Alert variant="destructive" title={editor.formError} />}
          {editor.success && <Alert variant="success" title={editor.success} />}

          <AccountSection editor={editor} />
          <AboutSection editor={editor} />
          <LocationSection editor={editor} divisions={divisions} />
          {mode === "lecturer" && <LecturerSection editor={editor} />}

          {editor.editing && (
            <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface p-3 shadow-md">
              <p className="text-sm text-muted-foreground">
                {editor.dirty ? "Có thay đổi chưa lưu" : "Chưa có thay đổi"}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={editor.cancel}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={!editor.dirty}
                  isLoading={editor.saving}
                  loadingText="Đang lưu..."
                >
                  Lưu
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

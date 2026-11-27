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
    <div className="min-h-screen bg-background pb-16">
      <form
        className="user-container max-w-6xl space-y-6 py-8"
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

        {editor.formError && <Alert variant="destructive" title={editor.formError} />}
        {editor.success && <Alert variant="success" title={editor.success} />}

        <div id="profile-details" className="scroll-mt-24 grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5">
            <AccountSection editor={editor} />
            <LocationSection editor={editor} divisions={divisions} />
          </div>
          <div className="space-y-5">
            <AboutSection editor={editor} />
            {mode === "lecturer" && <LecturerSection editor={editor} />}
          </div>
        </div>

        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-primary-pastel bg-surface/95 p-3.5 shadow-lg backdrop-blur-md">
          <p className="text-sm font-medium text-muted-foreground">
            {editor.dirty ? "Bạn có thay đổi chưa lưu" : "Chỉnh sửa trực tiếp các ô phía trên rồi bấm Lưu"}
          </p>
          <div className="flex gap-2">
            {editor.dirty && (
              <Button type="button" variant="outline" onClick={editor.cancel}>
                Hủy thay đổi
              </Button>
            )}
            <Button
              type="submit"
              disabled={!editor.dirty}
              isLoading={editor.saving}
              loadingText="Đang lưu..."
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

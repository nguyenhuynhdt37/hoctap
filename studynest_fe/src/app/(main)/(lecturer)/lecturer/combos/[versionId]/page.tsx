import ComboEditor from "@/components/lecturer/combos/editor";

export default async function EditLecturerComboPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  return <ComboEditor versionId={versionId} />;
}

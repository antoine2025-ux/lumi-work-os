import { SnapshotDetailClient } from "@/components/org/SnapshotDetailClient";

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ snapshotId: string }>;
}) {
  const { snapshotId } = await params;
  return <SnapshotDetailClient snapshotId={snapshotId} />;
}


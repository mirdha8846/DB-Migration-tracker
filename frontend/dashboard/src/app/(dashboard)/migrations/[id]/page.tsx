import { MigrationDetailPageContent } from "@/components/pages/MigrationDetailPageContent";

type Props = { params: { id: string } };

export default function MigrationDetailPage({ params }: Props) {
  return <MigrationDetailPageContent migrationId={params.id} />;
}

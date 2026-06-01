import { DependencyGraphPageContent } from "@/components/pages/DependencyGraphPageContent";

type Props = {
  params: { id: string };
};

export default function DependencyGraphPage({ params }: Props) {
  return <DependencyGraphPageContent projectId={params.id} />;
}

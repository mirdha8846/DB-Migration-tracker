type Props = { params: { id: string } };

export default function ProjectDetailPage({ params }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold text-espresso">
        Project {params.id}
      </h1>
      <p className="text-on-surface/70">Project detail and summary.</p>
    </div>
  );
}

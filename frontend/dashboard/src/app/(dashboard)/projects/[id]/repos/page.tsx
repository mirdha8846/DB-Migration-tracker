type Props = { params: { id: string } };

export default function ProjectReposPage({ params }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold text-espresso">
        Repos — {params.id}
      </h1>
      <p className="text-on-surface/70">Registered repositories for this project.</p>
    </div>
  );
}

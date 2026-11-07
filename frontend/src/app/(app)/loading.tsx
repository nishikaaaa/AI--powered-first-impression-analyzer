export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

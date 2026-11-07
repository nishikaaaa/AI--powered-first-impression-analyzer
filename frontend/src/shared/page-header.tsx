export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

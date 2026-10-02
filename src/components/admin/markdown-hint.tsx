/**
 * Marks a field as markdown-capable.
 *
 * Without this the feature is invisible — an admin has no way to tell a plain
 * textarea from one that will format what they type, and would either never
 * use it or be surprised when `**text**` renders bold on the live site.
 */
export function MarkdownHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Supports markdown:{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono">**bold**</code>,{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono">*italic*</code>,{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono">[link](https://…)</code>, and{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono">- bullet lists</code>.
    </p>
  );
}

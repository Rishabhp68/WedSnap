import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders the long-form text admins write in /admin as markdown.
 *
 * Deliberately a Server Component: these blocks are static once published, so
 * the whole parse happens during the render that was already going to run and
 * nothing about markdown reaches the browser.
 *
 * Raw HTML is never rendered. react-markdown drops it unless `rehype-raw` is
 * added — so don't add it. An admin pasting a `<script>` into the venue notes
 * should see the literal text, not have it execute for every guest.
 */

/**
 * What an admin can actually use. Anything outside this is unwrapped to its
 * text rather than rendered: these are short notes inside an already-designed
 * card, and a stray `# heading` or image would break the page's type scale.
 */
const ALLOWED = [
  "p",
  "strong",
  "em",
  "del",
  "a",
  "ul",
  "ol",
  "li",
  "br",
  "code",
  "blockquote",
  "hr",
];

interface MarkdownProps {
  children: string;
  /** Applied to the wrapper; the element styles below inherit colour and size from it. */
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("space-y-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="opacity-70">{children}</del>,
          a: ({ href, children }) => (
            <a
              href={href}
              // Anything off-site opens in a new tab so a guest reading the
              // venue notes doesn't lose the invitation. rel is required with
              // target="_blank" — without it the new page can reach back
              // through window.opener.
              {...(href?.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 marker:text-accent">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 marker:text-accent">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/60 pl-3 italic">{children}</blockquote>
          ),
          hr: () => <hr className="border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

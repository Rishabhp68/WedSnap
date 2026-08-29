"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  "aria-label": string;
  className?: string;
}

/**
 * Search input with a leading icon.
 *
 * The icon is a flex sibling rather than an absolutely-positioned overlay on
 * top of <Input>: that older approach needed `pl-10` to clear the icon, but
 * tailwind-merge doesn't treat a later `pl-*` as overriding an earlier `px-*`
 * (only the reverse), so the base input's `px-2.5` survived and which value
 * actually won came down to stylesheet order — the icon and the text
 * overlapped. Laying it out with flex removes the conflict entirely.
 */
export function SearchField({
  value,
  onValueChange,
  placeholder,
  "aria-label": ariaLabel,
  className,
}: SearchFieldProps) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        // `text-base` on mobile stops iOS Safari zooming the viewport on focus.
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

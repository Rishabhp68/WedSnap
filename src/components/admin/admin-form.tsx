"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AdminFormState } from "@/lib/actions/types";

interface AdminFormProps {
  action: (prevState: AdminFormState | null, formData: FormData) => Promise<AdminFormState>;
  children: React.ReactNode;
  submitLabel?: string;
  successMessage?: string;
  onSuccess?: () => void;
  className?: string;
}

const initialState: AdminFormState = { ok: false };

export function AdminForm({
  action,
  children,
  submitLabel = "Save changes",
  successMessage = "Saved.",
  onSuccess,
  className,
}: AdminFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) {
      toast.success(successMessage);
      onSuccess?.();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {children}
      <Button type="submit" disabled={isPending} className="rounded-full">
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setGuestRoleAction } from "@/app/admin/guests/actions";

export function RoleToggle({ guestId, role }: { guestId: string; role: "ADMIN" | "GUEST" }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: "ADMIN" | "GUEST" | null) {
    if (!value) return;
    startTransition(async () => {
      try {
        await setGuestRoleAction(guestId, value);
      } catch {
        toast.error("Couldn't update role.");
      }
    });
  }

  return (
    <Select defaultValue={role} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-28 rounded-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="GUEST">Guest</SelectItem>
        <SelectItem value="ADMIN">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}

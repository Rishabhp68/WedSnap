"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setGuestRoleAction } from "@/app/admin/guests/actions";

type Role = "ADMIN" | "GUEST";

export function RoleToggle({ guestId, role }: { guestId: string; role: Role }) {
  // Controlled rather than uncontrolled: the server can refuse a change (e.g.
  // demoting the last admin), and the dropdown has to fall back to the real
  // role instead of displaying one that was never applied.
  const [value, setValue] = useState<Role>(role);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: Role | null) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next);

    startTransition(async () => {
      try {
        const result = await setGuestRoleAction(guestId, next);
        if (result.ok) {
          toast.success(next === "ADMIN" ? "Added as an admin." : "Admin access removed.");
        } else {
          setValue(previous);
          toast.error(result.error);
        }
      } catch {
        setValue(previous);
        toast.error("Couldn't update role.");
      }
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
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

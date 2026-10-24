"use client";

import { useMemo } from "react";
import { Select, type SelectOption } from "@/components/beui/premium/select";
import type { TeamRole, TeamRoleId } from "./team-invite-data";

export type RoleSelectProps = {
  roles: readonly TeamRole[];
  value: TeamRoleId;
  onValueChange: (role: TeamRoleId) => void;
  label: string;
  disabled?: boolean;
  /** Widen the menu past a narrow trigger in compact rows. */
  compact?: boolean;
  align?: "start" | "end";
  className?: string;
  buttonClassName?: string;
};

/** Role picker built on the shared Select, portalled so lists never clip it. */
export function RoleSelect({
  roles,
  value,
  onValueChange,
  label,
  disabled,
  compact,
  align = "start",
  className,
  buttonClassName,
}: RoleSelectProps) {
  const options = useMemo<SelectOption[]>(
    () =>
      roles.map((role) => ({
        id: role.id,
        label: role.label,
        description: role.description,
      })),
    [roles],
  );

  return (
    <Select
      options={options}
      value={value}
      onValueChange={onValueChange}
      label={label}
      disabled={disabled}
      portal
      align={align}
      className={className}
      buttonClassName={buttonClassName}
      optionsClassName={compact ? "w-64" : undefined}
    />
  );
}

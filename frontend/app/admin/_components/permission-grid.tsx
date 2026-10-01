"use client";

import { useMemo } from "react";
import type { PermissionCatalogEntry } from "@bannersin48/api-client";
import { hasPermission } from "@bannersin48/shared";
import { useAuth } from "@/lib/stores/auth";
import { permissionDescription, permissionLabel, permissionResourceLabel } from "@/lib/admin/labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

/**
 * Permission checklist grouped by resource (plan §5.3). Keys the signed-in
 * user does not hold are disabled with an explanation: the server's grant
 * ceiling would refuse them anyway. Elevated keys are flagged and need
 * `rbac:manage` to grant. Read-only mode renders the same grid without inputs.
 */
export function PermissionGrid({
  catalog,
  selected,
  onChange,
  readOnly = false,
  idPrefix = "perm",
}: {
  catalog: PermissionCatalogEntry[];
  selected: ReadonlySet<string>;
  onChange?: (key: string, checked: boolean) => void;
  readOnly?: boolean;
  idPrefix?: string;
}) {
  const mine = useAuth((s) => s.user?.permissions);
  const canManage = hasPermission(mine, "rbac:manage");

  const groups = useMemo(() => {
    const byResource = new Map<string, PermissionCatalogEntry[]>();
    for (const entry of catalog) {
      byResource.set(entry.resource, [...(byResource.get(entry.resource) ?? []), entry]);
    }
    return [...byResource.entries()];
  }, [catalog]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
      {groups.map(([resource, entries]) => (
        <fieldset key={resource} className="border border-line-subtle rounded-feature p-md m-0 min-w-0">
          <legend className="px-xs text-body-sm font-bold text-ink">{permissionResourceLabel(resource)}</legend>
          <ul className="list-none m-0 p-0 space-y-sm">
            {entries.map((entry) => {
              const held = hasPermission(mine, entry.key);
              const lockedByCeiling = !readOnly && !selected.has(entry.key) && (!held || (entry.elevated && !canManage));
              const id = `${idPrefix}-${entry.key.replace(":", "-")}`;
              const reason = !held
                ? "You can only grant permissions you hold yourself."
                : entry.elevated && !canManage
                  ? "Elevated permissions need rbac:manage to grant."
                  : undefined;
              return (
                <li key={entry.key} className="flex items-start gap-sm">
                  {readOnly ? (
                    <span aria-hidden className={cn("mt-1 inline-block h-4 w-4 rounded-sm border", selected.has(entry.key) ? "bg-strong-accent border-strong-accent" : "border-line-input")} />
                  ) : (
                    <input
                      id={id}
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-strong-accent"
                      checked={selected.has(entry.key)}
                      disabled={lockedByCeiling}
                      aria-describedby={reason ? `${id}-why` : undefined}
                      onChange={(e) => onChange?.(entry.key, e.target.checked)}
                    />
                  )}
                  <label htmlFor={readOnly ? undefined : id} className={cn("min-w-0", lockedByCeiling && "text-ink-muted")}>
                    <span className="flex flex-wrap items-center gap-xs">
                      <span className="text-body-sm font-semibold">{permissionLabel(entry.key)}</span>
                      <code className="text-xs text-ink-muted">{entry.key}</code>
                      {entry.elevated && <Badge variant="warning">Elevated</Badge>}
                    </span>
                    <span className="block text-xs text-ink-muted">{permissionDescription(entry.key) || entry.description}</span>
                    {reason && lockedByCeiling && (
                      <span id={`${id}-why`} className="block text-xs text-ink-muted italic">{reason}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

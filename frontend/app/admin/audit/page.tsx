"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditEntry } from "@bannersin48/api-client";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { auditActionLabel, permissionLabel } from "@/lib/admin/labels";
import { RequirePermission } from "../_components/require-permission";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 50;
const SELECT = "w-full h-10 rounded-btn border border-line-input px-md bg-surface text-ink text-sm";
const ENTITY_TYPES = ["", "user", "access_role", "order", "product", "product_material", "finishing_option", "volume_tier", "site_content"];

interface Filters {
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  from: string;
  to: string;
}

const EMPTY: Filters = { action: "", entityType: "", entityId: "", actorId: "", from: "", to: "" };

export default function AdminAuditPage() {
  return (
    <RequirePermission perm="audit:read">
      <AuditViewer />
    </RequirePermission>
  );
}

function AuditViewer() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const actions = useQuery({ queryKey: ["admin", "audit", "actions"], queryFn: () => getAdminApiClient().auditActions() });
  const entries = useQuery({
    queryKey: ["admin", "audit", filters, page],
    queryFn: () =>
      getAdminApiClient().audit({
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        entityId: filters.entityId || undefined,
        actorId: filters.actorId || undefined,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(filters.to).toISOString() : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });
  const total = entries.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-xl">
      <PageHeader title="Audit log" intro="Every staff mutation, newest first. Permission changes show the full before and after." className="mb-0" />

      <Card className="bg-surface p-lg">
        <form
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-sm items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setFilters({ ...draft, entityId: draft.entityId.trim(), actorId: draft.actorId.trim() });
          }}
        >
          <label className="block lg:col-span-2" htmlFor="audit-action">
            <span className="text-body-sm text-ink-muted block mb-xs">Action</span>
            <select id="audit-action" className={SELECT} value={draft.action} onChange={(e) => set({ action: e.target.value })}>
              <option value="">Any action</option>
              {(actions.data ?? []).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="block" htmlFor="audit-entity-type">
            <span className="text-body-sm text-ink-muted block mb-xs">Entity</span>
            <select id="audit-entity-type" className={SELECT} value={draft.entityType} onChange={(e) => set({ entityType: e.target.value })}>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t || "Any entity"}</option>
              ))}
            </select>
          </label>
          <label className="block" htmlFor="audit-entity-id">
            <span className="text-body-sm text-ink-muted block mb-xs">Entity id</span>
            <Input id="audit-entity-id" value={draft.entityId} onChange={(e) => set({ entityId: e.target.value })} maxLength={64} />
          </label>
          <label className="block" htmlFor="audit-actor">
            <span className="text-body-sm text-ink-muted block mb-xs">Actor id</span>
            <Input id="audit-actor" value={draft.actorId} onChange={(e) => set({ actorId: e.target.value })} maxLength={64} />
          </label>
          <div className="flex items-end gap-sm">
            <Button type="submit" variant="secondary">Filter</Button>
            <Button type="button" variant="ghost" onClick={() => { setDraft(EMPTY); setFilters(EMPTY); setPage(1); }}>Clear</Button>
          </div>
          <label className="block" htmlFor="audit-from">
            <span className="text-body-sm text-ink-muted block mb-xs">From</span>
            <Input id="audit-from" type="datetime-local" value={draft.from} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="block" htmlFor="audit-to">
            <span className="text-body-sm text-ink-muted block mb-xs">To</span>
            <Input id="audit-to" type="datetime-local" value={draft.to} onChange={(e) => set({ to: e.target.value })} />
          </label>
        </form>
      </Card>

      <Card className="bg-surface p-lg relative overflow-x-auto">
        {entries.isLoading ? (
          <p className="text-ink-muted py-xl" role="status">Loading audit log…</p>
        ) : entries.isError ? (
          <p className="text-danger py-xl" role="alert">{(entries.error as Error).message}</p>
        ) : (entries.data?.items.length ?? 0) === 0 ? (
          <p className="text-ink-muted py-xl text-center">No audit entries match.</p>
        ) : (
          <>
            <p className="text-body-sm text-ink-muted mb-md" aria-live="polite">{total} entries</p>
            <table className="w-full text-body-sm" data-testid="audit-table">
              <caption className="sr-only">Audit log, page {page} of {totalPages}</caption>
              <thead>
                <tr className="text-left text-ink-muted border-b border-line-subtle">
                  <th scope="col" className="py-sm font-bold">When</th>
                  <th scope="col" className="font-bold">Actor</th>
                  <th scope="col" className="font-bold">Action</th>
                  <th scope="col" className="font-bold">Entity</th>
                  <th scope="col" className="font-bold">Change</th>
                </tr>
              </thead>
              <tbody>
                {entries.data?.items.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-md mt-md">
              <span className="text-body-sm text-ink-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-sm">
                <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const systemActor = !entry.actorId && isRecord(entry.diff) && typeof entry.diff.actor === "string" ? entry.diff.actor : null;
  return (
    <tr className="border-b border-line-subtle last:border-0 align-top">
      <td className="py-md text-ink-muted whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td>
      <td className="py-md text-ink">
        {entry.actorEmail ?? systemActor ?? "—"}
        {entry.ip && <span className="block text-xs text-ink-muted">{entry.ip}</span>}
      </td>
      <td className="py-md">
        <span className="text-ink">{auditActionLabel(entry.action)}</span>
        <code className="block text-xs text-ink-muted">{entry.action}</code>
      </td>
      <td className="py-md text-ink-muted">
        {entry.entityType}
        {entry.entityId && <code className="block text-xs">{entry.entityId}</code>}
      </td>
      <td className="py-md">
        <DiffSummary diff={entry.diff} />
        {entry.diff != null && (
          <button type="button" className="mt-xs text-xs text-link underline bg-transparent border-none cursor-pointer p-0" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? "Hide raw" : "Show raw"}
          </button>
        )}
        {open && <pre className="mt-xs max-w-[60ch] relative overflow-x-auto rounded-feature bg-surface-tint p-sm text-xs text-ink">{JSON.stringify(entry.diff, null, 2)}</pre>}
      </td>
    </tr>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Renders RBAC diffs as additions/removals (plan §5.4) and shallow field
 * diffs as "field: from → to". Anything else falls back to the raw view.
 */
function DiffSummary({ diff }: { diff: unknown }) {
  if (!isRecord(diff)) return <span className="text-ink-muted">—</span>;

  // `{ permissions: { from: [...], to: [...] } }` (role sets, overrides, role assignment via from/to objects)
  const permissionBlock = isRecord(diff.permissions) ? diff.permissions : isRecord(diff.from) && isStringList(diff.from.permissions) && isRecord(diff.to) ? { from: diff.from.permissions, to: diff.to.permissions } : null;
  if (permissionBlock && isStringList(permissionBlock.from) && isStringList(permissionBlock.to)) {
    const from = new Set(permissionBlock.from);
    const to = new Set(permissionBlock.to);
    const added = [...to].filter((k) => !from.has(k));
    const removed = [...from].filter((k) => !to.has(k));
    const roleMove = isRecord(diff.from) && isRecord(diff.to) && typeof diff.from.roleKey === "string" && typeof diff.to.roleKey === "string" ? `${diff.from.roleKey} → ${diff.to.roleKey}` : null;
    return (
      <div className="space-y-xs" data-testid="audit-permission-diff">
        {roleMove && <p className="text-ink">Role: <code className="text-xs">{roleMove}</code></p>}
        {typeof diff.roleKey === "string" && <p className="text-ink">Role: <code className="text-xs">{diff.roleKey}</code></p>}
        {added.length > 0 && (
          <p className="flex flex-wrap gap-xs items-center">
            <span className="text-xs font-bold text-success-fg">Added</span>
            {added.map((k) => <Badge key={k} variant="success" title={k}>{permissionLabel(k)}</Badge>)}
          </p>
        )}
        {removed.length > 0 && (
          <p className="flex flex-wrap gap-xs items-center">
            <span className="text-xs font-bold text-danger">Removed</span>
            {removed.map((k) => <Badge key={k} variant="error" title={k}>{permissionLabel(k)}</Badge>)}
          </p>
        )}
        {added.length === 0 && removed.length === 0 && <p className="text-ink-muted text-xs">No permission change ({to.size} permissions).</p>}
      </div>
    );
  }

  const fields = Object.entries(diff).filter(([, v]) => isRecord(v) && "from" in v && "to" in v) as Array<[string, { from: unknown; to: unknown }]>;
  const scalars = Object.entries(diff).filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v));
  if (fields.length === 0 && scalars.length === 0) return <span className="text-ink-muted text-xs">See raw</span>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-sm gap-y-xs text-xs">
      {fields.map(([field, change]) => (
        <FieldChange key={field} field={field} from={change.from} to={change.to} />
      ))}
      {scalars.map(([field, value]) => (
        <FieldChange key={field} field={field} to={value} />
      ))}
    </dl>
  );
}

function FieldChange({ field, from, to }: { field: string; from?: unknown; to: unknown }) {
  const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return (
    <>
      <dt className="text-ink-muted">{field}</dt>
      <dd className="text-ink break-all">
        {from !== undefined ? (
          <>
            <span className="text-ink-muted line-through">{show(from)}</span> → {show(to)}
          </>
        ) : (
          show(to)
        )}
      </dd>
    </>
  );
}

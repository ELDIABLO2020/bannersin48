"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Can, useCan } from "@/lib/auth/useCan";
import { RequirePermission } from "../../_components/require-permission";
import { ConfirmDialog } from "../../_components/confirm-dialog";
import { PermissionGrid } from "../../_components/permission-grid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { roleKindLabel } from "@/lib/admin/labels";

export default function AdminRoleEditorPage() {
  return (
    <RequirePermission perm="rbac:read">
      <RoleEditor />
    </RequirePermission>
  );
}

function RoleEditor() {
  const id = String(useParams().id);
  const router = useRouter();
  const qc = useQueryClient();
  const canManage = useCan("rbac:manage");
  const role = useQuery({ queryKey: ["admin", "roles", id], queryFn: () => getAdminApiClient().role(id) });
  const catalog = useQuery({ queryKey: ["admin", "permissions"], queryFn: () => getAdminApiClient().permissions() });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!role.data) return;
    setSelected(new Set(role.data.permissions));
    setName(role.data.name);
    setDescription(role.data.description ?? "");
  }, [role.data]);

  const editable = Boolean(role.data) && !role.data!.immutable && canManage;
  const permissionsDirty = useMemo(() => {
    const current = [...selected].sort();
    const saved = role.data?.permissions ?? [];
    return current.length !== saved.length || current.some((k, i) => k !== saved[i]);
  }, [selected, role.data]);
  const metaDirty = Boolean(role.data) && (name !== role.data!.name || description !== (role.data!.description ?? ""));

  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin", "roles"] }), qc.invalidateQueries({ queryKey: ["admin", "staff"] })]);

  const savePermissions = useMutation({
    mutationFn: () => getAdminApiClient().setRolePermissions(id, [...selected]),
    onSuccess: async () => {
      setMessage({ tone: "ok", text: "Permissions saved. Members' sessions were signed out so the change applies at once." });
      await invalidate();
    },
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });
  const saveMeta = useMutation({
    mutationFn: () => getAdminApiClient().updateRole(id, { name: name.trim(), description: description.trim() || null }),
    onSuccess: async () => {
      setMessage({ tone: "ok", text: "Role details saved." });
      await invalidate();
    },
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });
  const remove = useMutation({
    mutationFn: () => getAdminApiClient().deleteRole(id),
    onSuccess: async () => {
      await invalidate();
      router.push("/admin/roles");
    },
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });

  if (role.isLoading || catalog.isLoading) return <p className="text-ink-muted" role="status">Loading role…</p>;
  if (role.isError || !role.data) return <p className="text-danger" role="alert">{(role.error as Error | undefined)?.message ?? "Role not found."}</p>;
  if (catalog.isError) return <p className="text-danger" role="alert">{(catalog.error as Error).message}</p>;
  const data = role.data;

  return (
    <div className="space-y-xl">
      <div>
        <Link href="/admin/roles" className="text-body-sm text-link no-underline hover:underline">← Roles</Link>
        <div className="flex flex-wrap items-center gap-sm mt-xs">
          <h1 className="font-display text-section-h2 text-ink">{data.name}</h1>
          {data.isSystem && <Badge variant="neutral">System role</Badge>}
          {data.immutable && <Badge variant="warning">Locked</Badge>}
          <Badge variant="info">{data.memberCount} member{data.memberCount === 1 ? "" : "s"}</Badge>
        </div>
        <p className="text-body-sm text-ink-muted">
          <code>{data.key}</code> · {roleKindLabel(data.legacyRole)} kind
        </p>
      </div>

      {message && (
        <div role={message.tone === "ok" ? "status" : "alert"} className={`rounded-feature p-md text-body-sm ${message.tone === "ok" ? "bg-success-bg text-success-fg" : "bg-badge-error-bg text-danger"}`} data-testid="role-message">
          {message.text}
        </div>
      )}

      {data.immutable && (
        <div className="rounded-feature bg-surface-tint p-md text-body-sm text-ink-muted">
          {data.key === "admin" ? "The admin role holds every permission and cannot be edited." : "The customer role has no admin permissions and cannot be edited."}
        </div>
      )}
      {!data.immutable && !canManage && (
        <div className="rounded-feature bg-surface-tint p-md text-body-sm text-ink-muted">Read-only: editing roles needs rbac:manage.</div>
      )}

      {editable && (
        <Card className="bg-surface p-lg">
          <h2 className="text-heading-h4 text-ink mb-sm">Details</h2>
          <form
            className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-sm items-end"
            onSubmit={(e) => {
              e.preventDefault();
              saveMeta.mutate();
            }}
          >
            <label className="block" htmlFor="role-edit-name">
              <span className="text-body-sm text-ink-muted block mb-xs">Name</span>
              <Input id="role-edit-name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block" htmlFor="role-edit-description">
              <span className="text-body-sm text-ink-muted block mb-xs">Description</span>
              <Input id="role-edit-description" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <Button type="submit" size="md" disabled={!metaDirty || saveMeta.isPending}>{saveMeta.isPending ? "Saving…" : "Save details"}</Button>
          </form>
        </Card>
      )}

      <Card className="bg-surface p-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm mb-md">
          <h2 className="text-heading-h4 text-ink">Permissions</h2>
          {editable && (
            <div className="flex items-center gap-sm">
              <Button type="button" variant="secondary" size="sm" disabled={!permissionsDirty || savePermissions.isPending} onClick={() => setSelected(new Set(data.permissions))}>
                Discard
              </Button>
              <Button type="button" size="sm" disabled={!permissionsDirty || savePermissions.isPending} onClick={() => savePermissions.mutate()} data-testid="role-save-permissions">
                {savePermissions.isPending ? "Saving…" : "Save permissions"}
              </Button>
            </div>
          )}
        </div>
        {data.key === "admin" ? (
          <p className="text-body-sm text-ink">Everything, always.</p>
        ) : (
          <PermissionGrid
            catalog={catalog.data ?? []}
            selected={selected}
            readOnly={!editable}
            idPrefix={`role-${data.key}`}
            onChange={(key, checked) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (checked) next.add(key);
                else next.delete(key);
                return next;
              })
            }
          />
        )}
      </Card>

      {!data.isSystem && (
        <Can perm="rbac:manage">
          <Card className="bg-surface p-lg">
            <h2 className="text-heading-h4 text-ink mb-xs">Delete role</h2>
            <p className="text-body-sm text-ink-muted mb-md">
              {data.memberCount > 0 ? `Reassign the ${data.memberCount} member${data.memberCount === 1 ? "" : "s"} first; a role in use cannot be deleted.` : "Nobody holds this role, so it can be removed."}
            </p>
            <Button type="button" variant="secondary" disabled={data.memberCount > 0 || remove.isPending} onClick={() => setDeleteOpen(true)} data-testid="role-delete">
              Delete role
            </Button>
          </Card>
        </Can>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${data.name}?`}
        description="This cannot be undone. The audit log keeps a record of the role and its permissions."
        confirmLabel="Delete role"
        destructive
        busy={remove.isPending}
        onConfirm={() => {
          setDeleteOpen(false);
          remove.mutate();
        }}
      />
    </div>
  );
}

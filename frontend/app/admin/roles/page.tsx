"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminRole } from "@bannersin48/api-client";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Can } from "@/lib/auth/useCan";
import { permissionLabel } from "@/lib/admin/labels";
import { RequirePermission } from "../_components/require-permission";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const SELECT = "w-full h-10 rounded-btn border border-line-input px-md bg-surface text-ink text-sm";

export default function AdminRolesPage() {
  return (
    <RequirePermission perm="rbac:read">
      <RolesList />
    </RequirePermission>
  );
}

function RolesList() {
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: () => getAdminApiClient().roles() });
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicate, setDuplicate] = useState<AdminRole | null>(null);

  return (
    <div className="space-y-xl">
      <PageHeader
        title="Roles & permissions"
        intro="Each employee holds one role. Permissions can be widened or narrowed per person from their staff page."
        className="mb-0"
        actions={
          <Can perm="rbac:manage">
            <Button type="button" onClick={() => { setDuplicate(null); setCreateOpen(true); }} data-testid="role-create">
              New role
            </Button>
          </Can>
        }
      />

      <Card className="bg-surface p-lg relative overflow-x-auto">
        {roles.isLoading ? (
          <p className="text-ink-muted py-xl" role="status">Loading roles…</p>
        ) : roles.isError ? (
          <p className="text-danger py-xl" role="alert">{(roles.error as Error).message}</p>
        ) : (
          <table className="w-full text-body-sm" data-testid="roles-table">
            <caption className="sr-only">Access roles</caption>
            <thead>
              <tr className="text-left text-ink-muted border-b border-line-subtle">
                <th scope="col" className="py-sm font-bold">Role</th>
                <th scope="col" className="font-bold">Permissions</th>
                <th scope="col" className="font-bold">Members</th>
                <th scope="col" className="font-bold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {roles.data?.map((role) => (
                <tr key={role.id} className="border-b border-line-subtle last:border-0 align-top">
                  <td className="py-md">
                    <Link href={`/admin/roles/${role.id}`} className="font-bold text-link no-underline hover:underline">{role.name}</Link>
                    <span className="ml-xs inline-flex gap-xs">
                      {role.isSystem && <Badge variant="neutral">System</Badge>}
                      {role.immutable && <Badge variant="warning">Locked</Badge>}
                    </span>
                    <p className="text-xs text-ink-muted max-w-[48ch]">{role.description}</p>
                    <code className="text-xs text-ink-muted">{role.key}</code>
                  </td>
                  <td className="py-md text-ink">
                    {role.key === "admin" ? (
                      "Everything"
                    ) : role.permissions.length === 0 ? (
                      <span className="text-ink-muted">None</span>
                    ) : (
                      <span className="flex flex-wrap gap-xs max-w-[60ch]">
                        {role.permissions.slice(0, 6).map((key) => (
                          <Badge key={key} variant="neutral" title={key}>{permissionLabel(key)}</Badge>
                        ))}
                        {role.permissions.length > 6 && <span className="text-xs text-ink-muted self-center">+{role.permissions.length - 6} more</span>}
                      </span>
                    )}
                  </td>
                  <td className="py-md text-ink tabular-nums">
                    {role.memberCount > 0 ? (
                      <Can perm="users:read" fallback={<>{role.memberCount}</>}>
                        <Link href={`/admin/staff?roleId=${encodeURIComponent(role.id)}`} className="text-link no-underline hover:underline">{role.memberCount}</Link>
                      </Can>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="py-md text-right">
                    <Can perm="rbac:manage">
                      {role.key !== "admin" && role.key !== "customer" && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setDuplicate(role); setCreateOpen(true); }}>Duplicate</Button>
                      )}
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} source={duplicate} />
    </div>
  );
}

/** Creates the role (optionally seeded from another role's set) and opens the editor. */
function CreateRoleDialog({ open, onOpenChange, source }: { open: boolean; onOpenChange: (open: boolean) => void; source: AdminRole | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [legacyRole, setLegacyRole] = useState<"STAFF" | "CONTENT_EDITOR">("STAFF");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      getAdminApiClient().createRole({
        key: key.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim() || null,
        legacyRole,
        permissions: (source?.permissions ?? []) as never[],
      }),
    onSuccess: async (role) => {
      await qc.invalidateQueries({ queryKey: ["admin", "roles"] });
      onOpenChange(false);
      router.push(`/admin/roles/${role.id}`);
    },
    onError: (err) => setError((err as Error).message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setKey("");
          setName("");
          setDescription("");
          setError(null);
        }
      }}
    >
      <DialogContent className="p-lg" hideClose>
        <form
          className="space-y-md"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!/^[a-z][a-z0-9_]{1,39}$/.test(key.trim().toLowerCase())) {
              setError("Key must be lowercase letters, digits and underscores, 2–40 characters, starting with a letter.");
              return;
            }
            create.mutate();
          }}
        >
          <DialogTitle>{source ? `Duplicate ${source.name}` : "New role"}</DialogTitle>
          <DialogDescription>
            {source ? `Starts with ${source.name}'s ${source.permissions.length} permissions. You can adjust them next.` : "Pick a name and key; you choose permissions on the next screen."}
          </DialogDescription>
          <label className="block" htmlFor="role-name">
            <span className="text-body-sm text-ink-muted block mb-xs">Name</span>
            <Input id="role-name" required minLength={2} maxLength={60} value={name} onChange={(e) => { setName(e.target.value); if (!key) setKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")); }} />
          </label>
          <label className="block" htmlFor="role-key">
            <span className="text-body-sm text-ink-muted block mb-xs">Key</span>
            <Input id="role-key" required value={key} onChange={(e) => setKey(e.target.value)} pattern="[a-z][a-z0-9_]{1,39}" placeholder="night_shift" />
            <span className="text-xs text-ink-muted">Stable identifier used in the audit log. Cannot be changed later.</span>
          </label>
          <label className="block" htmlFor="role-description">
            <span className="text-body-sm text-ink-muted block mb-xs">Description</span>
            <Input id="role-description" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="block" htmlFor="role-kind">
            <span className="text-body-sm text-ink-muted block mb-xs">Account kind</span>
            <select id="role-kind" className={SELECT} value={legacyRole} onChange={(e) => setLegacyRole(e.target.value as "STAFF" | "CONTENT_EDITOR")}>
              <option value="STAFF">Staff</option>
              <option value="CONTENT_EDITOR">Content editor</option>
            </select>
          </label>
          {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} data-testid="role-create-submit">{create.isPending ? "Creating…" : "Create role"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

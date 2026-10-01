"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminRole, CreateStaffResponse } from "@bannersin48/api-client";
import { hasAllPermissions, hasPermission } from "@bannersin48/shared";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { useAuth } from "@/lib/stores/auth";
import { Can } from "@/lib/auth/useCan";
import { roleKeyLabel, staffStatusLabel } from "@/lib/admin/labels";
import { RequirePermission } from "../_components/require-permission";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PasswordField } from "@/components/ui/password-field";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const PAGE_SIZE = 25;
const SELECT = "w-full h-10 rounded-btn border border-line-input px-md bg-surface text-ink text-sm";

export default function AdminStaffPage() {
  return (
    <RequirePermission perm="users:read">
      <StaffDirectory />
    </RequirePermission>
  );
}

function statusVariant(status: string) {
  return status === "ACTIVE" ? "success" : status === "INVITED" ? "info" : "warning";
}

function StaffDirectory() {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [roleId, setRoleId] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const canSeeRoles = hasPermission(useAuth((s) => s.user?.permissions), "rbac:read");

  // The roles page links here with ?roleId= ("Members (n)").
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("roleId");
    if (preset) setRoleId(preset);
  }, []);

  const staff = useQuery({
    queryKey: ["admin", "staff", search, status, roleId, page],
    queryFn: () => getAdminApiClient().staff({ search: search || undefined, status: status || undefined, roleId: roleId || undefined, page, pageSize: PAGE_SIZE }),
  });
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: () => getAdminApiClient().roles(), enabled: canSeeRoles });

  const total = staff.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-xl">
      <PageHeader
        title="Staff"
        intro="Employee accounts, their roles and status. Customers are listed separately."
        className="mb-0"
        actions={
          <Can perm="users:create">
            <Button type="button" onClick={() => setAddOpen(true)} data-testid="staff-add">
              Add employee
            </Button>
          </Can>
        }
      />

      <Card className="bg-surface p-lg">
        <form
          className="flex flex-col sm:flex-row gap-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(draft.trim());
          }}
        >
          <label className="block flex-1" htmlFor="staff-search">
            <span className="text-body-sm text-ink-muted block mb-xs">Search staff</span>
            <Input id="staff-search" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Email or name" />
          </label>
          <label className="block sm:w-44" htmlFor="staff-status">
            <span className="text-body-sm text-ink-muted block mb-xs">Status</span>
            <select id="staff-status" className={SELECT} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
          {canSeeRoles && (
            <label className="block sm:w-52" htmlFor="staff-role">
              <span className="text-body-sm text-ink-muted block mb-xs">Role</span>
              <select id="staff-role" className={SELECT} value={roleId} onChange={(e) => { setRoleId(e.target.value); setPage(1); }}>
                <option value="">Any role</option>
                {(roles.data ?? []).filter((r) => r.key !== "customer").map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-end">
            <Button type="submit" variant="secondary">Search</Button>
          </div>
        </form>
      </Card>

      <Card className="bg-surface p-lg relative overflow-x-auto">
        {staff.isLoading ? (
          <p className="text-ink-muted py-xl" role="status">Loading staff…</p>
        ) : staff.isError ? (
          <p className="text-danger py-xl" role="alert">{(staff.error as Error).message}</p>
        ) : (staff.data?.items.length ?? 0) === 0 ? (
          <div className="py-xl text-center">
            <p className="text-ink-muted">No staff accounts match.</p>
            <p className="text-body-sm text-ink-muted mt-xs">{search || status || roleId ? "Try clearing a filter." : "Add an employee to get started."}</p>
          </div>
        ) : (
          <>
            <p className="text-body-sm text-ink-muted mb-md" aria-live="polite">{total} staff accounts</p>
            <table className="w-full text-body-sm" data-testid="staff-table">
              <caption className="sr-only">Staff accounts, page {page} of {totalPages}</caption>
              <thead>
                <tr className="text-left text-ink-muted border-b border-line-subtle">
                  <th scope="col" className="py-sm font-bold">Employee</th>
                  <th scope="col" className="font-bold">Role</th>
                  <th scope="col" className="font-bold">Status</th>
                  <th scope="col" className="font-bold">Overrides</th>
                  <th scope="col" className="font-bold">Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {staff.data?.items.map((member) => (
                  <tr key={member.id} className="border-b border-line-subtle last:border-0">
                    <td className="py-md">
                      <Link href={`/admin/staff/${member.id}`} className="font-bold text-link no-underline hover:underline">
                        {member.fullName || member.email}
                      </Link>
                      <p className="text-xs text-ink-muted">{member.email}</p>
                    </td>
                    <td className="text-ink">{member.roleName ?? roleKeyLabel(member.roleKey)}</td>
                    <td>
                      <span className="inline-flex flex-wrap gap-xs">
                        <Badge variant={statusVariant(member.status)}>{staffStatusLabel(member.status)}</Badge>
                        {member.mustChangePassword && <Badge variant="neutral">Temp password</Badge>}
                      </span>
                    </td>
                    <td className="text-ink tabular-nums">{member.overrideCount || "—"}</td>
                    <td className="text-ink-muted">{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : "Never"}</td>
                  </tr>
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

      <AddEmployeeDialog open={addOpen} onOpenChange={setAddOpen} roles={roles.data ?? []} />
    </div>
  );
}

/**
 * "Add employee" (plan §6.3). Only roles whose permissions the actor holds are
 * enabled (the server's grant ceiling would refuse the others). Invite mode is
 * disabled until an email transport exists; the temporary password is shown
 * once, after creation, so the admin can hand it over out of band.
 */
function AddEmployeeDialog({ open, onOpenChange, roles }: { open: boolean; onOpenChange: (open: boolean) => void; roles: AdminRole[] }) {
  const qc = useQueryClient();
  const mine = useAuth((s) => s.user?.permissions);
  const canManage = hasPermission(mine, "rbac:manage");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ result: CreateStaffResponse; temporaryPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const assignable = useMemo(
    () =>
      roles
        .filter((r) => r.key !== "customer")
        .map((r) => ({ role: r, allowed: r.key === "admin" ? canManage : hasAllPermissions(mine, r.permissions) })),
    [roles, mine, canManage],
  );

  const create = useMutation({
    mutationFn: () =>
      getAdminApiClient().createStaff({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), roleId, mode: "temporary_password", temporaryPassword: password }),
    onSuccess: async (result) => {
      setCreated({ result, temporaryPassword: password });
      await qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      await qc.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    onError: (err) => setError((err as Error).message),
  });

  const reset = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRoleId("");
    setPassword("");
    setConfirm("");
    setError(null);
    setCreated(null);
    setCopied(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!roleId) return setError("Choose a role.");
    if (password.length < 12) return setError("The temporary password must be at least 12 characters.");
    if (password.trim() !== password) return setError("The temporary password must not start or end with a space.");
    if (password !== confirm) return setError("The passwords do not match.");
    create.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="p-lg" hideClose={created !== null}>
        {created ? (
          <div className="space-y-md" data-testid="staff-created">
            <DialogTitle>Employee added</DialogTitle>
            <DialogDescription>
              {created.result.user.fullName ?? created.result.user.email} can sign in with the temporary password below and must change it on first sign-in. This is
              the only time it is shown.
            </DialogDescription>
            <div className="rounded-feature bg-surface-tint p-md">
              <p className="text-xs text-ink-muted mb-xs">Temporary password for {created.result.user.email}</p>
              <div className="flex items-center gap-sm">
                <code className="text-body font-bold text-ink break-all flex-1" data-testid="staff-temp-password">{created.temporaryPassword}</code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(created.temporaryPassword);
                      setCopied(true);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-sm">
              <Link href={`/admin/staff/${created.result.user.id}`} onClick={() => onOpenChange(false)}>
                <Button type="button" variant="secondary">Open account</Button>
              </Link>
              <Button type="button" onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-md">
            <DialogTitle>Add employee</DialogTitle>
            <DialogDescription>Create a staff account with a temporary password. The employee changes it on first sign-in.</DialogDescription>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
              <label className="block" htmlFor="new-staff-first">
                <span className="text-body-sm text-ink-muted block mb-xs">First name</span>
                <Input id="new-staff-first" required maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />
              </label>
              <label className="block" htmlFor="new-staff-last">
                <span className="text-body-sm text-ink-muted block mb-xs">Last name</span>
                <Input id="new-staff-last" required maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
              </label>
            </div>
            <label className="block" htmlFor="new-staff-email">
              <span className="text-body-sm text-ink-muted block mb-xs">Work email</span>
              <Input id="new-staff-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </label>
            <label className="block" htmlFor="new-staff-role">
              <span className="text-body-sm text-ink-muted block mb-xs">Role</span>
              <select id="new-staff-role" className={SELECT} required value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Choose a role…</option>
                {assignable.map(({ role, allowed }) => (
                  <option key={role.id} value={role.id} disabled={!allowed}>
                    {role.name}{allowed ? "" : " (needs permissions you don't hold)"}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="border-0 p-0 m-0">
              <legend className="text-body-sm text-ink-muted mb-xs">How will they get in?</legend>
              <div className="flex flex-col gap-xs text-body-sm">
                <label className="flex items-center gap-sm">
                  <input type="radio" name="staff-mode" checked readOnly className="accent-strong-accent" />
                  Set a temporary password
                </label>
                <label className="flex items-center gap-sm text-ink-muted" title="Available once an email transport is configured.">
                  <input type="radio" name="staff-mode" disabled className="accent-strong-accent" />
                  Send an invite email <span className="text-xs">(needs email delivery, not yet configured)</span>
                </label>
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
              <label className="block" htmlFor="new-staff-password">
                <span className="text-body-sm text-ink-muted block mb-xs">Temporary password</span>
                <PasswordField id="new-staff-password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <label className="block" htmlFor="new-staff-confirm">
                <span className="text-body-sm text-ink-muted block mb-xs">Repeat password</span>
                <PasswordField id="new-staff-confirm" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </label>
            </div>
            <p className="text-xs text-ink-muted">At least 12 characters. Share it with the employee directly; it is not emailed.</p>

            {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-sm">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
              <Button type="submit" disabled={create.isPending} data-testid="staff-create-submit">{create.isPending ? "Creating…" : "Create account"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminRole, PermissionEffect, StaffUserDetail } from "@bannersin48/api-client";
import { hasAllPermissions, hasPermission } from "@bannersin48/shared";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { useAuth } from "@/lib/stores/auth";
import { Can, useCan } from "@/lib/auth/useCan";
import { permissionLabel, roleKeyLabel, staffStatusLabel } from "@/lib/admin/labels";
import { RequirePermission } from "../../_components/require-permission";
import { ConfirmDialog } from "../../_components/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const SELECT = "w-full h-10 rounded-btn border border-line-input px-md bg-surface text-ink text-sm";

export default function AdminStaffDetailPage() {
  return (
    <RequirePermission perm="users:read">
      <StaffDetail />
    </RequirePermission>
  );
}

function statusVariant(status: string) {
  return status === "ACTIVE" ? "success" : status === "INVITED" ? "info" : "warning";
}

function StaffDetail() {
  const id = String(useParams().id);
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const canSeeRoles = useCan("rbac:read");
  const canManage = useCan("rbac:manage");
  const isSelf = me?.id === id;

  const detail = useQuery({ queryKey: ["admin", "staff", id], queryFn: () => getAdminApiClient().staffDetail(id) });
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: () => getAdminApiClient().roles(), enabled: canSeeRoles });
  const breakdown = useQuery({ queryKey: ["admin", "staff", id, "permissions"], queryFn: () => getAdminApiClient().userPermissions(id), enabled: canSeeRoles });

  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<"reset" | "resend" | null>(null);
  const [statusDialog, setStatusDialog] = useState<"suspend" | "reactivate" | null>(null);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "staff"] }),
      qc.invalidateQueries({ queryKey: ["admin", "roles"] }),
    ]);
  };
  const run = useMutation({
    mutationFn: async (input: { action: () => Promise<unknown>; done: string }) => {
      await input.action();
      return input.done;
    },
    onSuccess: async (done) => {
      setMessage({ tone: "ok", text: done });
      await refresh();
    },
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });

  if (detail.isLoading) return <p className="text-ink-muted" role="status">Loading account…</p>;
  if (detail.isError || !detail.data) return <p className="text-danger" role="alert">{(detail.error as Error | undefined)?.message ?? "Staff account not found."}</p>;
  const user = detail.data;
  const isAdminRole = user.roleKey === "admin";

  return (
    <div className="space-y-xl">
      <div>
        <Link href="/admin/staff" className="text-body-sm text-link no-underline hover:underline">← Staff</Link>
        <div className="flex flex-wrap items-center gap-sm mt-xs">
          <h1 className="font-display text-section-h2 text-ink">{user.fullName ?? user.email}</h1>
          <Badge variant={statusVariant(user.status)}>{staffStatusLabel(user.status)}</Badge>
          <Badge variant="neutral">{user.roleName ?? roleKeyLabel(user.roleKey)}</Badge>
          {user.mustChangePassword && <Badge variant="warning">Temporary password</Badge>}
          {isSelf && <Badge variant="info">This is you</Badge>}
        </div>
        <p className="text-body-sm text-ink-muted">
          {user.email}
          {user.lastLoginAt ? ` · last signed in ${new Date(user.lastLoginAt).toLocaleString()}` : " · never signed in"}
        </p>
      </div>

      {message && (
        <div role={message.tone === "ok" ? "status" : "alert"} className={`rounded-feature p-md text-body-sm ${message.tone === "ok" ? "bg-success-bg text-success-fg" : "bg-badge-error-bg text-danger"}`} data-testid="staff-message">
          {message.text}
        </div>
      )}

      {user.status === "SUSPENDED" && (
        <div className="rounded-feature bg-warning-bg text-warning-fg p-md text-body-sm">
          Suspended {user.suspendedAt ? new Date(user.suspendedAt).toLocaleDateString() : ""}: {user.suspendedReason ?? "no reason recorded"}. The account cannot sign in.
        </div>
      )}
      {user.status === "INVITED" && (
        <div className="rounded-feature bg-soft-accent text-strong-accent p-md text-body-sm">
          Invite pending{user.invite ? `, expires ${new Date(user.invite.expiresAt).toLocaleString()}` : ""}. The account cannot sign in until it is accepted.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <div className="lg:col-span-7 space-y-lg">
          <ProfileCard user={user} onSaved={(text) => { setMessage({ tone: "ok", text }); void refresh(); }} onError={(text) => setMessage({ tone: "error", text })} />

          <Card className="bg-surface p-lg">
            <h2 className="text-heading-h4 text-ink mb-sm">Role</h2>
            {isSelf ? (
              <p className="text-body-sm text-ink-muted">You cannot change your own role. Ask another administrator.</p>
            ) : (
              <Can perm="users:update" fallback={<p className="text-body-sm text-ink-muted">Current role: {user.roleName ?? roleKeyLabel(user.roleKey)}.</p>}>
                <RoleAssign user={user} roles={roles.data ?? []} busy={run.isPending} onAssign={(roleId) => run.mutate({ action: () => getAdminApiClient().assignStaffRole(id, roleId), done: "Role updated. Their sessions were signed out." })} />
              </Can>
            )}
          </Card>

          {canSeeRoles && (
            <Card className="bg-surface p-lg">
              <h2 className="text-heading-h4 text-ink mb-xs">Permission overrides</h2>
              {isAdminRole ? (
                <p className="text-body-sm text-ink-muted">Admins hold every permission; overrides do not apply.</p>
              ) : (
                <OverrideEditor
                  userId={id}
                  isSelf={isSelf}
                  canManage={canManage}
                  overrides={breakdown.data?.overrides ?? []}
                  rolePermissions={breakdown.data?.rolePermissions ?? []}
                  busy={run.isPending}
                  onSet={(key, input) => run.mutate({ action: () => getAdminApiClient().setUserOverride(id, key, input), done: `Override saved for ${permissionLabel(key)}. Their sessions were signed out.` })}
                  onClear={(key) => run.mutate({ action: () => getAdminApiClient().clearUserOverride(id, key), done: `Override removed for ${permissionLabel(key)}.` })}
                />
              )}
              <h3 className="text-body-sm font-bold text-ink mt-lg mb-xs">Effective permissions</h3>
              <EffectiveList permissions={breakdown.data?.effective ?? user.permissions} />
            </Card>
          )}
        </div>

        <aside className="lg:col-span-5 space-y-lg">
          <Card className="bg-surface p-lg space-y-sm">
            <h2 className="text-heading-h4 text-ink">Account</h2>
            <dl className="text-body-sm grid grid-cols-[auto_1fr] gap-x-md gap-y-xs">
              <dt className="text-ink-muted">Status</dt>
              <dd className="text-ink">{staffStatusLabel(user.status)}</dd>
              <dt className="text-ink-muted">Created</dt>
              <dd className="text-ink">{new Date(user.createdAt).toLocaleDateString()}</dd>
              <dt className="text-ink-muted">Email verified</dt>
              <dd className="text-ink">{user.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleDateString() : "No"}</dd>
              <dt className="text-ink-muted">Password changed</dt>
              <dd className="text-ink">{user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : "Never"}</dd>
            </dl>
            {!isSelf && (
              <div className="flex flex-col gap-sm pt-sm">
                <Can perm="users:suspend">
                  {user.status === "SUSPENDED" ? (
                    <Button type="button" variant="secondary" onClick={() => setStatusDialog("reactivate")} data-testid="staff-reactivate">Reactivate account</Button>
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => setStatusDialog("suspend")} data-testid="staff-suspend">Suspend account</Button>
                  )}
                </Can>
                <Can perm="users:reset_password">
                  {!isAdminRole ? (
                    <Button type="button" variant="secondary" onClick={() => setConfirm("reset")}>Reset password</Button>
                  ) : (
                    <p className="text-xs text-ink-muted">Admin passwords are reset with the server script, not from here.</p>
                  )}
                </Can>
                {user.status === "INVITED" && (
                  <Can perm="users:create">
                    <Button type="button" variant="secondary" onClick={() => setConfirm("resend")}>Resend invite</Button>
                  </Can>
                )}
              </div>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Reset password?"
        description={`Queue a password-reset email for ${user.email} and sign out their sessions?`}
        confirmLabel="Send reset"
        busy={run.isPending}
        onConfirm={() => {
          setConfirm(null);
          run.mutate({ action: () => getAdminApiClient().resetStaffPassword(id), done: "Password reset queued and sessions signed out." });
        }}
      />
      <ConfirmDialog
        open={confirm === "resend"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Resend invite?"
        description="The previous invite link stops working and a new 72-hour link is issued."
        confirmLabel="Resend"
        busy={run.isPending}
        onConfirm={() => {
          setConfirm(null);
          run.mutate({ action: () => getAdminApiClient().resendStaffInvite(id), done: "A new invite was issued." });
        }}
      />
      <StatusDialog
        mode={statusDialog}
        user={user}
        busy={run.isPending}
        onClose={() => setStatusDialog(null)}
        onSubmit={(reason) => {
          const mode = statusDialog;
          setStatusDialog(null);
          if (mode === "suspend") run.mutate({ action: () => getAdminApiClient().suspendStaff(id, reason), done: "Account suspended and sessions signed out." });
          if (mode === "reactivate") run.mutate({ action: () => getAdminApiClient().reactivateStaff(id, reason || undefined), done: "Account reactivated." });
        }}
      />
    </div>
  );
}

function ProfileCard({ user, onSaved, onError }: { user: StaffUserDetail; onSaved: (text: string) => void; onError: (text: string) => void }) {
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  useEffect(() => {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setPhone(user.phone ?? "");
  }, [user.firstName, user.lastName, user.phone]);
  const dirty = firstName !== (user.firstName ?? "") || lastName !== (user.lastName ?? "") || phone !== (user.phone ?? "");
  const save = useMutation({
    mutationFn: () => getAdminApiClient().updateStaff(user.id, { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || null }),
    onSuccess: () => onSaved("Profile saved."),
    onError: (err) => onError((err as Error).message),
  });

  return (
    <Card className="bg-surface p-lg">
      <h2 className="text-heading-h4 text-ink mb-sm">Profile</h2>
      <Can
        perm="users:update"
        fallback={
          <dl className="text-body-sm grid grid-cols-[auto_1fr] gap-x-md gap-y-xs">
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-ink">{user.fullName ?? "—"}</dd>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink">{user.phone ?? "—"}</dd>
          </dl>
        }
      >
        <form
          className="grid grid-cols-1 sm:grid-cols-3 gap-sm items-end"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <label className="block" htmlFor="staff-first">
            <span className="text-body-sm text-ink-muted block mb-xs">First name</span>
            <Input id="staff-first" required maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="block" htmlFor="staff-last">
            <span className="text-body-sm text-ink-muted block mb-xs">Last name</span>
            <Input id="staff-last" required maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label className="block" htmlFor="staff-phone">
            <span className="text-body-sm text-ink-muted block mb-xs">Phone</span>
            <Input id="staff-phone" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" size="sm" disabled={!dirty || save.isPending}>{save.isPending ? "Saving…" : "Save profile"}</Button>
          </div>
        </form>
      </Can>
    </Card>
  );
}

function RoleAssign({ user, roles, busy, onAssign }: { user: StaffUserDetail; roles: AdminRole[]; busy: boolean; onAssign: (roleId: string) => void }) {
  const mine = useAuth((s) => s.user?.permissions);
  const canManage = hasPermission(mine, "rbac:manage");
  const [roleId, setRoleId] = useState(user.roleId ?? "");
  useEffect(() => setRoleId(user.roleId ?? ""), [user.roleId]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const options = useMemo(
    () => roles.filter((r) => r.key !== "customer").map((r) => ({ role: r, allowed: r.key === "admin" ? canManage : hasAllPermissions(mine, r.permissions) })),
    [roles, mine, canManage],
  );
  const target = roles.find((r) => r.id === roleId);

  if (roles.length === 0) {
    return <p className="text-body-sm text-ink-muted">Current role: {user.roleName ?? roleKeyLabel(user.roleKey)}. Viewing the role list needs rbac:read.</p>;
  }
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-sm sm:items-end">
        <label className="block flex-1" htmlFor="staff-role-select">
          <span className="text-body-sm text-ink-muted block mb-xs">Primary role</span>
          <select id="staff-role-select" className={SELECT} value={roleId} onChange={(e) => setRoleId(e.target.value)} data-testid="staff-role-select">
            {options.map(({ role, allowed }) => (
              <option key={role.id} value={role.id} disabled={!allowed && role.id !== user.roleId}>
                {role.name}{allowed || role.id === user.roleId ? "" : " (needs permissions you don't hold)"}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" size="md" disabled={busy || !roleId || roleId === user.roleId} onClick={() => setConfirmOpen(true)} data-testid="staff-role-save">
          Change role
        </Button>
      </div>
      {target && <p className="text-xs text-ink-muted mt-xs">{target.description}</p>}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Change role to ${target?.name ?? "…"}?`}
        description="Their permissions change immediately and every active session is signed out."
        confirmLabel="Change role"
        busy={busy}
        onConfirm={() => {
          setConfirmOpen(false);
          onAssign(roleId);
        }}
      />
    </>
  );
}

function OverrideEditor({
  userId,
  isSelf,
  canManage,
  overrides,
  rolePermissions,
  busy,
  onSet,
  onClear,
}: {
  userId: string;
  isSelf: boolean;
  canManage: boolean;
  overrides: Array<{ permissionKey: string; effect: PermissionEffect; reason: string | null; expiresAt: string | null }>;
  rolePermissions: string[];
  busy: boolean;
  onSet: (key: string, input: { effect: PermissionEffect; reason?: string | null; expiresAt?: string | null }) => void;
  onClear: (key: string) => void;
}) {
  const catalog = useQuery({ queryKey: ["admin", "permissions"], queryFn: () => getAdminApiClient().permissions() });
  const mine = useAuth((s) => s.user?.permissions);
  const [key, setKey] = useState("");
  const [effect, setEffect] = useState<PermissionEffect>("ALLOW");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const grantable = (k: string) => mine?.includes("*") || hasPermission(mine, k);

  return (
    <div className="space-y-md">
      <p className="text-body-sm text-ink-muted">Extra allows and denies on top of the role. Denies always win.</p>
      {overrides.length === 0 ? (
        <p className="text-body-sm text-ink-muted">No overrides.</p>
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-line-subtle" data-testid="override-list">
          {overrides.map((o) => (
            <li key={o.permissionKey} className="flex flex-wrap items-center justify-between gap-sm py-sm text-body-sm">
              <span className="flex flex-wrap items-center gap-xs">
                <Badge variant={o.effect === "ALLOW" ? "success" : "error"}>{o.effect === "ALLOW" ? "Allow" : "Deny"}</Badge>
                <span className="font-semibold text-ink">{permissionLabel(o.permissionKey)}</span>
                <code className="text-xs text-ink-muted">{o.permissionKey}</code>
                {o.reason && <span className="text-ink-muted">— {o.reason}</span>}
                {o.expiresAt && <span className="text-xs text-ink-muted">until {new Date(o.expiresAt).toLocaleDateString()}</span>}
              </span>
              {canManage && !isSelf && (
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onClear(o.permissionKey)}>Remove</Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && !isSelf && (
        <form
          className="grid grid-cols-1 sm:grid-cols-2 gap-sm items-end rounded-feature bg-surface-tint p-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (!key) return;
            onSet(key, { effect, reason: reason.trim() || null, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null });
            setKey("");
            setReason("");
            setExpiresAt("");
          }}
        >
          <label className="block sm:col-span-2" htmlFor={`override-key-${userId}`}>
            <span className="text-body-sm text-ink-muted block mb-xs">Permission</span>
            <select id={`override-key-${userId}`} className={SELECT} value={key} onChange={(e) => setKey(e.target.value)} required data-testid="override-key">
              <option value="">Choose a permission…</option>
              {(catalog.data ?? []).map((p) => {
                const inRole = rolePermissions.includes(p.key);
                const blocked = effect === "ALLOW" && !grantable(p.key);
                return (
                  <option key={p.key} value={p.key} disabled={blocked}>
                    {permissionLabel(p.key)} ({p.key}){inRole ? " · in role" : ""}{p.elevated ? " · elevated" : ""}{blocked ? " · not held by you" : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block" htmlFor={`override-effect-${userId}`}>
            <span className="text-body-sm text-ink-muted block mb-xs">Effect</span>
            <select id={`override-effect-${userId}`} className={SELECT} value={effect} onChange={(e) => setEffect(e.target.value as PermissionEffect)}>
              <option value="ALLOW">Allow</option>
              <option value="DENY">Deny</option>
            </select>
          </label>
          <label className="block" htmlFor={`override-expires-${userId}`}>
            <span className="text-body-sm text-ink-muted block mb-xs">Expires (optional)</span>
            <Input id={`override-expires-${userId}`} type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </label>
          <label className="block sm:col-span-2" htmlFor={`override-reason-${userId}`}>
            <span className="text-body-sm text-ink-muted block mb-xs">Reason</span>
            <Input id={`override-reason-${userId}`} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this person needs it" />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" size="sm" disabled={busy || !key} data-testid="override-save">Save override</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function EffectiveList({ permissions }: { permissions: string[] }) {
  if (permissions.includes("*")) return <p className="text-body-sm text-ink">Everything (admin wildcard).</p>;
  if (permissions.length === 0) return <p className="text-body-sm text-ink-muted">None.</p>;
  return (
    <ul className="flex flex-wrap gap-xs list-none m-0 p-0" data-testid="effective-permissions">
      {permissions.map((key) => (
        <li key={key}>
          <Badge variant="neutral" title={key}>{permissionLabel(key)}</Badge>
        </li>
      ))}
    </ul>
  );
}

function StatusDialog({
  mode,
  user,
  busy,
  onClose,
  onSubmit,
}: {
  mode: "suspend" | "reactivate" | null;
  user: StaffUserDetail;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!mode) setReason("");
  }, [mode]);
  const suspend = mode === "suspend";
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-lg" hideClose>
        <form
          className="space-y-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (suspend && reason.trim().length < 3) return;
            onSubmit(reason.trim());
          }}
        >
          <DialogTitle>{suspend ? "Suspend account?" : "Reactivate account?"}</DialogTitle>
          <DialogDescription>
            {suspend
              ? `${user.email} is signed out everywhere and cannot sign in until reactivated. The reason is kept in the audit log.`
              : `${user.email} can sign in again with their existing password.`}
          </DialogDescription>
          <label className="block" htmlFor="status-reason">
            <span className="text-body-sm text-ink-muted block mb-xs">Reason{suspend ? "" : " (optional)"}</span>
            <Input id="status-reason" required={suspend} minLength={suspend ? 3 : undefined} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="status-reason" />
          </label>
          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className={suspend ? "bg-danger text-white hover:bg-danger/90 active:bg-danger" : undefined} data-testid="status-confirm">
              {busy ? "Working…" : suspend ? "Suspend" : "Reactivate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

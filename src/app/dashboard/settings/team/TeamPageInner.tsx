"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ROLE_TEMPLATES,
  TEMPLATE_IDS,
  assignableTemplates,
  defaultTemplateForBaseRole,
} from "@/lib/roleTemplates.mjs";
import { ACCESS_SCOPE } from "@/lib/rbacScope.mjs";

interface Employee {
  id: string;
  employeeId: string;
  isActive: boolean;
  roleTemplate: string | null;
  scopeType: string | null;
  ownRecordsOnly: boolean;
  branchId: string | null;
  user: { id: string; email: string; name: string | null; phone: string | null };
  membership: { role: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  roleTemplate: string | null;
  acceptedAt: string | null;
  expiresAt: string;
}

const templateLabel = (id: string | null) =>
  id && id in ROLE_TEMPLATES ? ROLE_TEMPLATES[id as keyof typeof ROLE_TEMPLATES].label : "Legacy role";

export default function TeamPageInner() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTemplate, setInviteTemplate] = useState<string>("CASHIER");

  const callerTemplate = useMemo(() => {
    const role = String((session?.user as any)?.role || "STAFF").toUpperCase();
    return defaultTemplateForBaseRole(role as "OWNER" | "MANAGER" | "STAFF");
  }, [session]);

  const assignable = useMemo(
    () => assignableTemplates(callerTemplate as keyof typeof ROLE_TEMPLATES) as string[],
    [callerTemplate]
  );
  // A legacy MANAGER cannot assign every template. Keep the form state valid
  // for the caller's tier instead of silently posting a forbidden value.
  const effectiveInviteTemplate = assignable.includes(inviteTemplate)
    ? inviteTemplate
    : assignable[0] || "";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [empRes, invRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/invitations"),
      ]);
      if (!empRes.ok || !invRes.ok) throw new Error("Failed to load team data");
      const [empData, invData] = await Promise.all([empRes.json(), invRes.json()]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setInvitations(Array.isArray(invData) ? invData : []);
    } catch {
      setError("Could not load your team. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchEmployee = async (id: string, body: Record<string, unknown>, msg: string) => {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
      setNotice(msg);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this employee's access? This cannot be undone.")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Revoke failed");
      }
      setNotice("Access revoked");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusyId(null);
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusyId("invite");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), roleTemplate: effectiveInviteTemplate }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invitation failed");
      }
      setInviteEmail("");
      setNotice("Invitation created — the invitee must accept it before access starts");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8 font-reading">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-black text-ink">Team &amp; Access</h1>
        <p className="font-display text-sm text-secondary mt-1">
          Assign job-function roles, limit each person to the data they need, and revoke access when they leave.
        </p>
        <Link href="/dashboard/settings" className="text-xs text-accent underline mt-2 inline-block">
          Back to settings
        </Link>
      </div>

      {error && (
        <div className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="border border-rule bg-ground p-3 text-sm text-ink" role="status">
          {notice}
        </div>
      )}

      <form onSubmit={invite} className="border border-rule p-6 bg-ground space-y-4">
        <div>
          <h2 className="font-display text-lg font-black text-ink">Invite a teammate</h2>
          <p className="text-xs text-secondary mt-1">
            Invitations must be accepted explicitly. The assigned template decides both permissions and data scope.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="invite-email" className="block text-xs font-display font-black text-secondary mb-1">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="person@example.com"
              className="w-full border border-rule bg-ground text-ink p-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="block text-xs font-display font-black text-secondary mb-1">
              Role template
            </label>
            <select
              id="invite-role"
              value={effectiveInviteTemplate}
              onChange={(e) => setInviteTemplate(e.target.value)}
              className="w-full border border-rule bg-ground text-ink p-2 text-sm"
            >
              {TEMPLATE_IDS.filter((id) => assignable.includes(id)).map((id) => (
                <option key={id} value={id}>
                  {ROLE_TEMPLATES[id as keyof typeof ROLE_TEMPLATES].label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busyId === "invite" || assignable.length === 0}
            className="np-btn np-btn--accent text-sm disabled:opacity-50"
          >
            {busyId === "invite" ? "Sending…" : "Send invitation"}
          </button>
        </div>
        <p className="text-xs text-secondary">
          {ROLE_TEMPLATES[effectiveInviteTemplate as keyof typeof ROLE_TEMPLATES]?.description}
        </p>
      </form>

      <div className="border border-rule p-6 bg-ground">
        <h2 className="font-display text-lg font-black text-ink mb-4">Employees</h2>
        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-secondary">No employees yet. Invite someone above.</p>
        ) : (
          <div className="space-y-4">
            {employees.map((emp) => (
              <div key={emp.id} className="border border-rule p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-display font-black text-ink">
                      {emp.user.name || emp.user.email}
                    </div>
                    <div className="text-xs text-secondary">
                      {emp.user.email} · {emp.employeeId} · {emp.membership.role}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-display font-black ${emp.isActive ? "text-accent" : "text-danger"}`}
                    >
                      {emp.isActive ? "ACTIVE" : "SUSPENDED"}
                    </span>
                    <button
                      type="button"
                      disabled={busyId === emp.id}
                      onClick={() =>
                        patchEmployee(
                          emp.id,
                          { isActive: !emp.isActive },
                          emp.isActive ? "Employee suspended" : "Employee reactivated"
                        )
                      }
                      className="np-btn text-xs px-3 py-1 disabled:opacity-50"
                    >
                      {emp.isActive ? "Suspend" : "Reactivate"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === emp.id}
                      onClick={() => revoke(emp.id)}
                      className="np-btn text-xs px-3 py-1 text-danger hover:text-danger disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor={`tpl-${emp.id}`}
                      className="block text-xs font-display font-black text-secondary mb-1"
                    >
                      Role template
                    </label>
                    <select
                      id={`tpl-${emp.id}`}
                      disabled={busyId === emp.id}
                      value={emp.roleTemplate || ""}
                      onChange={(e) =>
                        patchEmployee(
                          emp.id,
                          { roleTemplate: e.target.value },
                          "Role template updated"
                        )
                      }
                      className="w-full border border-rule bg-ground text-ink p-2 text-sm disabled:opacity-50"
                    >
                      {assignable.map((id) => (
                        <option key={id} value={id}>
                          {ROLE_TEMPLATES[id as keyof typeof ROLE_TEMPLATES].label}
                        </option>
                      ))}
                      {emp.roleTemplate && !assignable.includes(emp.roleTemplate) && (
                        <option value={emp.roleTemplate}>{templateLabel(emp.roleTemplate)}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`scope-${emp.id}`}
                      className="block text-xs font-display font-black text-secondary mb-1"
                    >
                      Data scope
                    </label>
                    <select
                      id={`scope-${emp.id}`}
                      disabled={busyId === emp.id}
                      value={emp.scopeType || ""}
                      onChange={(e) =>
                        patchEmployee(
                          emp.id,
                          { scopeType: e.target.value || null },
                          "Data scope updated"
                        )
                      }
                      className="w-full border border-rule bg-ground text-ink p-2 text-sm disabled:opacity-50"
                    >
                      <option value="">Template default</option>
                      {Object.values(ACCESS_SCOPE).map((scope) => (
                        <option key={scope} value={scope}>
                          {scope}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 self-end pb-2 text-xs text-secondary">
                    <input
                      type="checkbox"
                      checked={emp.ownRecordsOnly}
                      disabled={busyId === emp.id}
                      onChange={(e) =>
                        patchEmployee(
                          emp.id,
                          { ownRecordsOnly: e.target.checked },
                          e.target.checked ? "Limited to own records" : "Own-record limit removed"
                        )
                      }
                    />
                    Own records only
                  </label>
                </div>
                <p className="text-xs text-secondary">{templateLabel(emp.roleTemplate)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-rule p-6 bg-ground">
        <h2 className="font-display text-lg font-black text-ink mb-4">Pending invitations</h2>
        {invitations.filter((i) => !i.acceptedAt).length === 0 ? (
          <p className="text-sm text-secondary">No pending invitations.</p>
        ) : (
          <ul className="space-y-2">
            {invitations
              .filter((i) => !i.acceptedAt)
              .map((inv) => (
                <li key={inv.id} className="flex justify-between gap-4 border-b border-rule pb-2 text-sm">
                  <span className="text-ink">{inv.email}</span>
                  <span className="text-secondary">
                    {templateLabel(inv.roleTemplate)} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
          </ul>
        )}
        <p className="text-xs text-secondary mt-3">
          Every role, scope and lifecycle change is recorded in the immutable audit trail.
        </p>
      </div>
    </div>
  );
}

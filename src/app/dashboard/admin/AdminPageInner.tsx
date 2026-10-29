"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import UiSpinner from "@/components/ui/UiSpinner";

interface Stats {
  totalBusinesses: number;
  totalUsers: number;
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  avgReviewRating: number;
  totalReviews: number;
  recentBusinesses: { id: string; name: string; type: string; createdAt: string; ownerName: string }[];
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
}

export default function AdminConsolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (status !== "authenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) setStats(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8 font-reading">
        <div className="h-8 w-64 border-b border-rule" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 border border-rule" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-reading">
      <div className="border-b border-rule pb-6">
        <h1 className="font-display text-2xl md:text-3xl font-black text-ink">Admin Console</h1>
        <p className="font-display text-sm text-secondary mt-1">Platform management — Aide BETA</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Businesses" value={String(stats?.totalBusinesses ?? 0)} />
        <Metric label="Users" value={String(stats?.totalUsers ?? 0)} />
        <Metric label="Sales (all time)" value={String(stats?.totalSales ?? 0)} />
        <Metric label="Revenue" value={formatMoney(stats?.totalRevenue ?? 0)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric
          label="Avg Rating"
          value={`${stats?.avgReviewRating?.toFixed(1) ?? "0.0"} / 5`}
          sub={<span className="text-warning">{"★".repeat(Math.round(stats?.avgReviewRating || 0)) || "No ratings yet"}</span>}
        />
        <Metric label="Reviews" value={String(stats?.totalReviews ?? 0)} />
        <Metric label="Products (all)" value={String(stats?.totalProducts ?? 0)} />
      </div>

      <Link
        href="/dashboard/admin/reviews"
        className="block border border-rule bg-ground p-5 text-sm font-display font-black text-ink hover:bg-ground/70"
      >
        Manage Reviews →
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-rule bg-ground overflow-hidden">
          <div className="px-5 py-4 border-b border-rule">
            <h2 className="font-display font-black text-ink">Recent Businesses</h2>
          </div>
          {!stats?.recentBusinesses.length ? (
            <p className="px-5 py-8 text-center text-sm text-secondary">No businesses yet.</p>
          ) : (
            <table className="w-full font-display text-sm text-left">
              <thead>
                <tr className="border-b border-rule">
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary">Name</th>
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary">Owner</th>
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {stats.recentBusinesses.map((b) => (
                  <tr key={b.id} className="border-b border-rule last:border-b-0">
                    <td className="px-5 py-3">
                      <div className="font-black text-ink">{b.name}</div>
                      <div className="text-xs text-secondary">{b.type}</div>
                    </td>
                    <td className="px-5 py-3 text-secondary">{b.ownerName}</td>
                    <td className="px-5 py-3 text-secondary whitespace-nowrap">{new Date(b.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border border-rule bg-ground overflow-hidden">
          <div className="px-5 py-4 border-b border-rule">
            <h2 className="font-display font-black text-ink">Recent Signups</h2>
          </div>
          {!stats?.recentUsers.length ? (
            <p className="px-5 py-8 text-center text-sm text-secondary">No users yet.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {stats.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-black text-ink">{u.name}</div>
                    <div className="text-xs text-secondary">{u.email}</div>
                  </div>
                  <span className="text-xs text-secondary whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="border border-rule p-5 bg-ground">
      <span className="text-xs font-display font-black uppercase tracking-wider text-secondary block mb-2">{label}</span>
      <div className="font-display text-2xl font-black text-ink">{value}</div>
      {sub && <div className="text-xs mt-1">{sub}</div>}
    </div>
  );
}
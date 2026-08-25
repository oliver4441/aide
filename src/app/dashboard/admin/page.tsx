"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/format";

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
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-container rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-outline-variant pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface font-headline">Admin Console</h1>
        <p className="text-on-surface-variant text-sm mt-1">Platform management — Aide BETA</p>
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
        className="block bg-primary/10 border border-primary/20 rounded-xl px-5 py-4 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        Manage Reviews →
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="font-bold text-on-surface font-headline">Recent Businesses</h2>
          </div>
          {!stats?.recentBusinesses.length ? (
            <p className="px-5 py-8 text-center text-sm text-on-surface-variant">No businesses yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-5 py-3 text-xs text-on-surface-variant uppercase">Name</th>
                  <th className="px-5 py-3 text-xs text-on-surface-variant uppercase">Owner</th>
                  <th className="px-5 py-3 text-xs text-on-surface-variant uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {stats.recentBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-container/30">
                    <td className="px-5 py-3 text-on-surface">{b.name}<span className="block text-xs text-on-surface-variant">{b.type}</span></td>
                    <td className="px-5 py-3 text-on-surface-variant">{b.ownerName}</td>
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{new Date(b.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="font-bold text-on-surface font-headline">Recent Signups</h2>
          </div>
          {!stats?.recentUsers.length ? (
            <p className="px-5 py-8 text-center text-sm text-on-surface-variant">No users yet.</p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {stats.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm text-on-surface">{u.name}</div>
                    <div className="text-xs text-on-surface-variant">{u.email}</div>
                  </div>
                  <span className="text-xs text-on-surface-variant whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</span>
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
    <div className="rounded-xl p-5 border bg-surface-container-low border-outline-variant hover:border-primary/30 transition-colors">
      <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider block mb-2">{label}</span>
      <div className="text-2xl font-bold text-on-surface font-headline">{value}</div>
      {sub && <div className="text-xs mt-1">{sub}</div>}
    </div>
  );
}

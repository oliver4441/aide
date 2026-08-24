"use client";

import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-headline)]">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your business profile and preferences</p>
      </div>

      {/* Account */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)] mb-4">Account</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {session?.user?.name?.[0] || "U"}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{session?.user?.name}</div>
              <div className="text-xs text-zinc-500">{session?.user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Profile */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)] mb-4">Business Profile</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Business Name</label>
              <input
                type="text"
                defaultValue="Beauty Hub Salon"
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-dark-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Business Type</label>
              <select className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-dark-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option>Salon</option>
                <option>Shop</option>
                <option>Restaurant</option>
                <option>Grocery</option>
                <option>Pharmacy</option>
                <option>Electronics</option>
                <option>Clothing</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Currency</label>
              <input
                type="text"
                defaultValue="KSh"
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-dark-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                defaultValue="16"
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-dark-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Receipt Footer</label>
            <textarea
              defaultValue="Thank you for visiting Beauty Hub Salon! Follow us @beautyhubke"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-dark-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light transition-colors shadow-lg shadow-primary/20">
            Save Changes
          </button>
          <button className="px-5 py-2.5 rounded-xl border border-dark-border text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)] mb-4">Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Low Stock Alerts</div>
              <div className="text-xs text-zinc-500">Get notified when products run low</div>
            </div>
            <div className="w-11 h-6 bg-zinc-700 rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform" />
            </div>
          </label>
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Daily Summary Email</div>
              <div className="text-xs text-zinc-500">Receive end-of-day sales summary</div>
            </div>
            <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform" />
            </div>
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-dark-surface border border-red-500/20 rounded-xl p-6">
        <h2 className="text-lg font-bold text-red-400 font-[family-name:var(--font-headline)] mb-2">Danger Zone</h2>
        <p className="text-xs text-zinc-500 mb-4">These actions cannot be undone.</p>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors">
            Export All Data
          </button>
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors">
            Delete Business
          </button>
        </div>
      </div>
    </div>
  );
}

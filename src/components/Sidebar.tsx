        {/* Bottom: Status + Logout */}
        <div className="border-t border-outline-variant px-4 py-3 space-y-1">
          <div className="flex items-center gap-2">
            <OfflineStatus />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="np-btn w-full justify-start gap-2.5 px-3 py-2 text-[13px] font-medium text-secondary hover:bg-ink hover:text-ground"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            Log Out
          </button>
        </div>
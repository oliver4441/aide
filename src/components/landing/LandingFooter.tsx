import Link from "next/link";
import { COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/site";

export default function LandingFooter() {
  return (
    <footer className="border-t border-rule pt-12 pb-8">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.jpg" alt="Aide logo" className="w-8 h-8 object-cover" />
              <span className="font-display text-lg font-black text-ink">Aide</span>
            </div>
            <p className="font-reading text-sm text-secondary max-w-xs">
              Offline-first business management for small businesses. Sell, track stock,
              print receipts and stay in control — with or without internet.
            </p>
          </div>

          <div>
            <h4 className="font-display text-xs font-black text-secondary uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2 text-sm font-reading text-secondary">
              <li><a href="#features" className="hover:text-ink transition-none">Features</a></li>
              <li><a href="#pricing" className="hover:text-ink transition-none">Variants</a></li>
              <li><Link href="/downloads" className="hover:text-ink transition-none">Get the app</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-xs font-black text-secondary uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2 text-sm font-reading text-secondary">
              <li><Link href="/help" className="hover:text-ink transition-none">Help Centre</Link></li>
              <li><Link href="/docs" className="hover:text-ink transition-none">Documentation</Link></li>
              <li><Link href="/downloads" className="hover:text-ink transition-none">Get the app</Link></li>
              <li><a href="https://blog.omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-none">Blog</a></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink transition-none">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-xs font-black text-secondary uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2 text-sm font-reading text-secondary">
              <li><a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-none">About</a></li>
              <li><Link href="/privacy" className="hover:text-ink transition-none">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-ink transition-none">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-rule pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-reading text-xs text-secondary">&copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
          <p className="font-display text-[10px] text-secondary uppercase tracking-widest">A product by {COMPANY_NAME}</p>
        </div>
      </div>
    </footer>
  );
}
import Link from "next/link";
import { COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/site";

export default function LandingFooter() {
  return (
    <footer className="bg-surface-container border-t border-outline-variant pt-12 pb-8">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.jpg" alt="Aide logo" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
              <span className="text-lg font-bold text-on-surface font-headline">Aide</span>
            </div>
            <p className="text-sm text-on-surface-variant max-w-xs">
              Offline-first business management for small businesses. Sell, track stock,
              print receipts and stay in control — with or without internet.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a href="#features" className="hover:text-on-surface transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-on-surface transition-colors">Variants</a></li>
              <li><Link href="/downloads" className="hover:text-on-surface transition-colors">Get the app</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><Link href="/help" className="hover:text-on-surface transition-colors">Help Centre</Link></li>
              <li><Link href="/docs" className="hover:text-on-surface transition-colors">Documentation</Link></li>
              <li><Link href="/downloads" className="hover:text-on-surface transition-colors">Get the app</Link></li>
              <li><a href="https://blog.omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">Blog</a></li>
              <li><a href="mailto:{SUPPORT_EMAIL}" className="hover:text-on-surface transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">About</a></li>
              <li><Link href="/privacy" className="hover:text-on-surface transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-on-surface transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-outline-variant pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-on-surface-variant">&copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">A product by {COMPANY_NAME}</p>
        </div>
      </div>
    </footer>
  );
}

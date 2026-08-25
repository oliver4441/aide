export default function LandingFooter() {
  return (
    <footer className="bg-surface-container border-t border-outline-variant pt-12 pb-8">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.jpg" alt="Aide logo" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
              <span className="text-lg font-bold text-on-surface font-headline">Aide</span>
              <span className="text-[10px] font-bold bg-warning/20 text-warning px-2 py-0.5 rounded-full ml-2">BETA</span>
            </div>
            <p className="text-sm text-on-surface-variant max-w-xs">
              The elegant, powerful platform designed to help modern businesses thrive.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a href="#features" className="hover:text-on-surface transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-on-surface transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-on-surface transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a href="/help" className="hover:text-on-surface transition-colors">Help Center</a></li>
              <li><a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">API Docs</a></li>
              <li><a href="https://blog.omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">About</a></li>
              <li><a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">Privacy Policy</a></li>
              <li><a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">Terms of Service</a></li>
              <li><a href="https://omixsystems.store" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-outline-variant pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-on-surface-variant">&copy; 2026 OmixSystems. All rights reserved.</p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">A BETA product by OmixSystems</p>
        </div>
      </div>
    </footer>
  );
}

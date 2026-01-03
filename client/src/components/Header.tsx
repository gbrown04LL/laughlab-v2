import { Link, useLocation } from "wouter";

export function Header() {
  const [location] = useLocation();
  const isReport = location?.startsWith('/report');

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-ink-950/80 border-b border-ink-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-2xl">🎭</span>
            <span className="font-display font-bold text-xl text-ink-100 group-hover:text-laugh-400 transition-colors">
              Laugh Lab
            </span>
            <span className="badge-laugh text-[10px] font-semibold">PRO</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-8">
            <a href="#features" className={`nav-link ${location === '/' ? 'nav-link-active' : ''}`}>
              Features
            </a>
            <a href="#pricing" className="nav-link">
              Pricing
            </a>
            <Link
              href="/history"
              className={`nav-link ${location === '/history' ? 'nav-link-active' : ''}`}
            >
              History
            </Link>
            {!isReport && (
              <Link href="/analyze" className="btn-primary text-sm py-2">
                Analyze Script
              </Link>
            )}
          </nav>

          <button className="sm:hidden btn-ghost p-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

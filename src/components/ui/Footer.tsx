import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-ink-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎭</span>
            <span className="font-display font-semibold text-ink-300">Laugh Lab</span>
          </div>
          <p className="text-ink-500 text-sm">Making comedy better, one script at a time.</p>
          <div className="flex items-center gap-6 text-sm text-ink-500">
            <Link href="/privacy" className="hover:text-ink-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ink-300 transition-colors">Terms</Link>
            <a href="mailto:support@laughlab.ai" className="hover:text-ink-300 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

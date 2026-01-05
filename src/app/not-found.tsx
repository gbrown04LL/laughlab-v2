'use client';
import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-24">
        <div className="max-w-md w-full mx-auto px-4 text-center">
          <div className="mb-8">
            <span className="text-8xl block animate-bounce">🎭</span>
          </div>
          <h1 className="text-6xl font-display font-bold text-ink-100 mb-4">404</h1>
          <h2 className="text-2xl font-display font-semibold text-ink-200 mb-6">
            Page Not Found
          </h2>
          <p className="text-ink-400 mb-10 leading-relaxed">
            Sorry, the comedy set you're looking for doesn't exist. 
            It may have been cut from the final draft.
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center px-8 py-3 rounded-xl text-lg font-medium transition-all shadow-lg shadow-laugh-500/20"
          >
            Go Back Home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

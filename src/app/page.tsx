import Link from 'next/link';
import { Header, Footer } from '@/components';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-laugh-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stage-500/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-ink-800/50 rounded-full mb-8 text-sm">
                <span className="animate-pulse text-emerald-400">●</span>
                <span className="text-ink-300">Powered by Claude AI</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-bold mb-6">
                <span className="text-ink-100">Get </span>
                <span className="text-gradient">Professional</span>
                <br />
                <span className="text-ink-100">Comedy Feedback</span>
              </h1>

              <p className="text-xl text-ink-400 mb-10 max-w-2xl mx-auto">
                Upload your comedy script and get detailed analysis on timing, punchlines, gaps, and specific punch-up suggestions. Like having a writers&apos; room in your pocket.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/analyze" className="btn-primary text-lg px-8 py-4">
                  Analyze Your Script Free →
                </Link>
                <a href="#features" className="btn-secondary text-lg">
                  See How It Works
                </a>
              </div>

              <p className="mt-6 text-ink-500 text-sm">
                No credit card required • 2 free analyses
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-ink-900/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-100 mb-4">
                Everything You Need to Write Funnier
              </h2>
              <p className="text-ink-400 max-w-2xl mx-auto">
                Professional-grade analysis that actually teaches you the craft.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: '📊', title: 'Comedy Dashboard', description: 'Overall score, laughs-per-minute, joke density, and how you compare to industry benchmarks.' },
                { icon: '📈', title: 'Laugh Timeline', description: 'Visual graph showing where your jokes land. Instantly spot comedy deserts.' },
                { icon: '🎯', title: 'Gap Analysis', description: 'Find stretches without laughs and get specific suggestions to fill them.' },
                { icon: '⚡', title: 'Punch-Up Workshop', description: 'Actual line rewrites with multiple alternatives and explanations.' },
                { icon: '🎭', title: 'Character Analysis', description: 'See which characters carry the comedy and where to balance the ensemble.' },
                { icon: '🔄', title: 'Callback Mapping', description: 'Track running gags and find opportunities for callbacks you missed.' },
              ].map((feature, i) => (
                <div key={i} className="card-hover p-6">
                  <span className="text-3xl mb-4 block">{feature.icon}</span>
                  <h3 className="text-lg font-semibold text-ink-100 mb-2">{feature.title}</h3>
                  <p className="text-ink-400 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-100 mb-4">Simple Pricing</h2>
              <p className="text-ink-400 max-w-2xl mx-auto">Start free, upgrade when you need more.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="card p-8">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-ink-100 mb-2">Free</h3>
                  <div className="text-4xl font-bold text-ink-100">$0</div>
                  <p className="text-ink-500 text-sm mt-1">2 analyses / month</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Comedy Dashboard', 'Laugh Timeline', 'Basic Feedback'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-ink-300 text-sm">
                      <span className="text-emerald-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/analyze" className="btn-secondary w-full justify-center">Get Started</Link>
              </div>

              <div className="card p-8 border-laugh-500/50 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-laugh">Most Popular</div>
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-ink-100 mb-2">Starter</h3>
                  <div className="text-4xl font-bold text-laugh-400">$29<span className="text-lg text-ink-500">/mo</span></div>
                  <p className="text-ink-500 text-sm mt-1">Unlimited analyses</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Everything in Free', 'Gap Analysis', 'Punch-Up Suggestions', 'Analysis History'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-ink-300 text-sm">
                      <span className="text-laugh-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/analyze" className="btn-primary w-full justify-center">Start Free Trial</Link>
              </div>

              <div className="card p-8">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-ink-100 mb-2">Professional</h3>
                  <div className="text-4xl font-bold text-stage-400">$79<span className="text-lg text-ink-500">/mo</span></div>
                  <p className="text-ink-500 text-sm mt-1">For serious writers</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Everything in Starter', 'Character Analysis', 'Callback Mapping', 'PDF Export', 'Priority Support'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-ink-300 text-sm">
                      <span className="text-stage-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/analyze" className="btn-secondary w-full justify-center">Start Free Trial</Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-gradient-to-b from-ink-900/50 to-ink-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-100 mb-4">Ready to Write Funnier?</h2>
            <p className="text-xl text-ink-400 mb-8">Get your first analysis in under 60 seconds.</p>
            <Link href="/analyze" className="btn-primary text-lg px-10 py-4">Analyze Your Script Now</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

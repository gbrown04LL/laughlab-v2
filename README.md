# Laugh Lab Pro 🎭

Professional AI-powered comedy script analysis platform. Get detailed feedback on timing, punchlines, gaps, and specific punch-up suggestions.

## Features

### 6-Page Analysis Report

1. **📊 Dashboard** - Overall score, LPM, joke density, industry comparisons
2. **📈 Timeline** - Visual laugh density graph with hot/cold spots
3. **💬 Feedback** - Strengths, opportunities, and quick wins
4. **🎯 Gap Analysis** - Find comedy deserts and how to fill them (Starter+)
5. **⚡ Punch-Ups** - Specific line rewrites with alternatives (Starter+)
6. **🎭 Characters** - Character balance and callback mapping (Pro)

### Key Metrics

- **Laughs Per Minute (LPM)** - Industry-standard pacing metric
- **Lines Per Joke (LPJ)** - Setup-to-punchline ratio
- **Joke Complexity Mix** - Basic → High complexity distribution
- **Callback Frequency** - Running gag detection
- **Gap Score** - Comedy desert analysis

## Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API key

### Installation

\`\`\`bash
# Clone the repo
git clone <your-repo-url>
cd laugh-lab-pro

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Start development server
npm run dev
\`\`\`

### Environment Variables

\`\`\`bash
# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional (for Phase 2 - auth/payments)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
\`\`\`

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Charts**: Recharts
- **AI**: Claude API (claude-sonnet-4-20250514)
- **Types**: TypeScript

## Project Structure

\`\`\`
src/
├── app/
│   ├── api/analyze/      # Claude API endpoint
│   ├── analyze/          # Script input page
│   ├── report/           # Multi-page report
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # Shared UI components
│   ├── charts/           # Recharts visualizations
│   └── report/           # Report page components
├── lib/
│   ├── prompts.ts        # Claude prompts
│   ├── store.ts          # Zustand store
│   └── utils.ts          # Utilities
└── types/
    └── index.ts          # TypeScript definitions
\`\`\`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add \`ANTHROPIC_API_KEY\` environment variable
4. Deploy

### Manual

\`\`\`bash
npm run build
npm start
\`\`\`

## Tier System

| Feature | Free | Starter ($29) | Pro ($79) |
|---------|------|---------------|-----------|
| Dashboard | ✓ | ✓ | ✓ |
| Timeline | ✓ | ✓ | ✓ |
| Feedback | ✓ | ✓ | ✓ |
| Gap Analysis | - | ✓ | ✓ |
| Punch-Ups | - | ✓ | ✓ |
| Characters | - | - | ✓ |
| Callbacks | - | - | ✓ |
| Analyses/mo | 2 | ∞ | ∞ |

## Format Benchmarks

| Format | Target LPM | Target LPJ |
|--------|------------|------------|
| Sitcom | 2.0 | 5.5 |
| Feature | 1.0 | 12.0 |
| Sketch | 2.5 | 4.0 |
| Stand-Up | 3.5 | 3.0 |

## Next Steps (Phase 2)

- [ ] Supabase auth integration
- [ ] Stripe payments
- [ ] Analysis history persistence
- [ ] PDF export
- [ ] v2.0.0-canonical scoring engine

## License

MIT

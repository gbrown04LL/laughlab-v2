import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: 'Laugh Lab | Professional Comedy Script Analysis',
  description: 'Get professional feedback on your comedy scripts in seconds. AI-powered analysis of timing, punchlines, gaps, and punch-up suggestions.',
  keywords: ['comedy writing', 'script analysis', 'screenwriting', 'comedy feedback', 'AI writing assistant', 'punch-up', 'sitcom', 'sketch comedy'],
  authors: [{ name: 'Laugh Lab' }],
  openGraph: {
    title: 'Laugh Lab | Professional Comedy Script Analysis',
    description: 'Get professional feedback on your comedy scripts in seconds.',
    type: 'website',
    siteName: 'Laugh Lab',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Laugh Lab | Professional Comedy Script Analysis',
    description: 'Get professional feedback on your comedy scripts in seconds.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <ErrorBoundary>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

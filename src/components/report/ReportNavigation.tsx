'use client';

import { useAnalysisStore } from '@/lib/store';
import { REPORT_PAGES, cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

export function ReportNavigation() {
  const { currentPage, setCurrentPage, canAccessPage, userTier } = useAnalysisStore();

  return (
    <div className="sticky top-20 z-40 bg-ink-950/80 backdrop-blur-md border-b border-ink-800 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Page tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {REPORT_PAGES.map((page) => {
              const isAccessible = canAccessPage(page.number);
              const isActive = currentPage === page.number;

              return (
                <button
                  key={page.number}
                  onClick={() => isAccessible && setCurrentPage(page.number)}
                  disabled={!isAccessible}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-laugh-500 text-ink-950'
                      : isAccessible
                      ? 'text-ink-400 hover:text-ink-100 hover:bg-ink-800'
                      : 'text-ink-600 cursor-not-allowed'
                  )}
                >
                  <span>{page.icon}</span>
                  <span className="hidden sm:inline">{page.title}</span>
                  {!isAccessible && <Lock className="w-3 h-3 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Page indicator */}
          <div className="hidden md:flex items-center gap-2 text-sm text-ink-500">
            <span>Page {currentPage} of {REPORT_PAGES.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress dots for mobile
export function ReportProgress() {
  const { currentPage, setCurrentPage, canAccessPage } = useAnalysisStore();

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {REPORT_PAGES.map((page) => {
        const isAccessible = canAccessPage(page.number);
        const isActive = currentPage === page.number;
        const isCompleted = currentPage > page.number;

        return (
          <button
            key={page.number}
            onClick={() => isAccessible && setCurrentPage(page.number)}
            disabled={!isAccessible}
            className={cn(
              'progress-dot transition-all',
              isActive && 'progress-dot-active',
              isCompleted && !isActive && 'progress-dot-completed',
              !isAccessible && 'progress-dot-locked',
              isAccessible && !isActive && !isCompleted && 'progress-dot-available'
            )}
            title={page.title}
          />
        );
      })}
    </div>
  );
}

// Page navigation buttons
export function PageNavButtons() {
  const { currentPage, setCurrentPage, canAccessPage } = useAnalysisStore();
  
  const prevPage = currentPage > 1 ? REPORT_PAGES[currentPage - 2] : null;
  const nextPage = currentPage < REPORT_PAGES.length ? REPORT_PAGES[currentPage] : null;
  const canGoNext = nextPage && canAccessPage(nextPage.number);

  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-ink-800">
      {prevPage ? (
        <button
          onClick={() => setCurrentPage(prevPage.number)}
          className="page-nav-prev"
        >
          <span>←</span>
          <span className="hidden sm:inline">{prevPage.title}</span>
        </button>
      ) : (
        <div />
      )}

      {nextPage && (
        <button
          onClick={() => canGoNext && setCurrentPage(nextPage.number)}
          disabled={!canGoNext}
          className={cn(
            'page-nav-next',
            !canGoNext && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="hidden sm:inline">{nextPage.title}</span>
          {!canGoNext && <Lock className="w-4 h-4" />}
          {canGoNext && <span>→</span>}
        </button>
      )}
    </div>
  );
}

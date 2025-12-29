import { useState, useEffect } from 'react';

/**
 * Custom hook to handle Zustand persist hydration in Next.js SSR
 * This prevents hydration mismatches by waiting for client-side mount
 */
export function useStoreHydration<T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F,
): F | undefined {
  const result = store(callback) as F;
  const [data, setData] = useState<F>();

  useEffect(() => {
    setData(result);
  }, [result]);

  return data;
}

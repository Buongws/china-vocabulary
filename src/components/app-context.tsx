'use client';
import { createContext, useContext } from 'react';
import type { Language, Snapshot } from '@/lib/types';
import type { mutate } from '@/lib/actions';

export type AppContextValue = {
  data: Snapshot; language: Language; setLanguage: (language: Language) => void; busy: boolean;
  run: (method: Parameters<typeof mutate>[0], params?: Record<string, unknown>, message?: string) => Promise<boolean>;
  notify: (message: string, error?: boolean) => void;
};
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppContext is missing');
  return value;
}

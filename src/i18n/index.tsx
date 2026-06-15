import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Language } from '@/domain/types';
import { messages, type MessageKey } from './messages';

/** 按浏览器语言猜默认值：zh* → 中文，其余 → 英语 */
export function detectLanguage(): Language {
  const nav =
    typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  return nav.startsWith('zh') ? 'zh' : 'en';
}

export type Translate = (key: MessageKey) => string;

export function translate(lang: Language, key: MessageKey): string {
  return messages[lang][key] ?? messages.en[key] ?? key;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translate;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * 语言上下文。M2 接入 store 后，language 可改为读写持久化的 Settings；
 * 此处先用本地 state，默认按浏览器语言。
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(detectLanguage);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => translate(language, key),
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage 必须在 <LanguageProvider> 内使用');
  }
  return ctx;
}

/** 便捷 hook：只取 t */
export function useT(): Translate {
  return useLanguage().t;
}

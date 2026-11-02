import React, { createContext, useContext, useEffect, useState } from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translate, type Language } from './translations';
export { translate } from './translations';
const LanguageContext = createContext({ language: 'th' as Language, toggle: () => {} });
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('th');
  const [ready, setReady] = useState(false);
  useEffect(() => { let active = true; void AsyncStorage.getItem('deskguard.language').then(value => { if (active && (value === 'en' || value === 'th')) setLanguage(value); }).catch(() => {}).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  useEffect(() => { if (ready) void AsyncStorage.setItem('deskguard.language', language).catch(() => {}); }, [language, ready]);
  return <LanguageContext.Provider value={{ language, toggle: () => { if (ready) setLanguage(value => value === 'th' ? 'en' : 'th'); } }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
export function Text({ children, ...props }: TextProps) {
  const { language } = useLanguage();
  const localize = (child: React.ReactNode): React.ReactNode => typeof child === 'string' ? translate(child, language) : Array.isArray(child) ? child.map(localize) : child;
  return <NativeText {...props}>{localize(children)}</NativeText>;
}

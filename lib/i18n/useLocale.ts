'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Locale } from './types'
import { dictionary } from './dictionary'

const STORAGE_KEY = 'carscout-locale'

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('da')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored === 'da' || stored === 'en') setLocaleState(stored)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const t = useCallback((key: string): string => {
    const entry = dictionary[key]
    if (!entry) return key
    return entry[locale] ?? entry['da'] ?? key
  }, [locale])

  return { locale, setLocale, t }
}

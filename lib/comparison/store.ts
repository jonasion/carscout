'use client'

const CARS_KEY = 'carscout-compare-cars'
const SETTINGS_KEY = 'carscout-compare-settings'
const MAX_CARS = 5

import type { ComparisonSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

// ============================================================
// CAR SELECTION
// ============================================================

export function getCompareCarIds(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(CARS_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export function addCompareCar(carId: string): { success: boolean; error?: string } {
    const ids = getCompareCarIds()
    if (ids.includes(carId)) return { success: true }
    if (ids.length >= MAX_CARS) {
        return { success: false, error: `Maks ${MAX_CARS} biler. Fjern en for at tilføje.` }
    }
    ids.push(carId)
    localStorage.setItem(CARS_KEY, JSON.stringify(ids))
    return { success: true }
}

export function removeCompareCar(carId: string): void {
    const ids = getCompareCarIds().filter(id => id !== carId)
    localStorage.setItem(CARS_KEY, JSON.stringify(ids))
}

export function isCarInCompare(carId: string): boolean {
    return getCompareCarIds().includes(carId)
}

export function clearCompare(): void {
    localStorage.removeItem(CARS_KEY)
}

// ============================================================
// SETTINGS PERSISTENCE
// ============================================================

export function getCompareSettings(): ComparisonSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    try {
        const raw = localStorage.getItem(SETTINGS_KEY)
        if (!raw) return DEFAULT_SETTINGS
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
        return DEFAULT_SETTINGS
    }
}

export function saveCompareSettings(settings: ComparisonSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
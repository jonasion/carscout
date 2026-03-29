'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocale } from '@/lib/i18n/useLocale'
import { computeCarComparison } from '@/lib/comparison/calculate'
import type { ComparisonCar, ComparisonSettings, CarComparisonResult } from '@/lib/comparison/types'
import { DEFAULT_SETTINGS } from '@/lib/comparison/types'
import {
  getCompareCarIds, removeCompareCar, clearCompare,
  getCompareSettings, saveCompareSettings
} from '@/lib/comparison/store'
import { SettingsPanel } from '@/components/comparison/settings-panel'
import { CarColumn } from '@/components/comparison/car-column'
import { Search, Settings, ChevronLeft, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'

export default function ComparePage() {
  const { t } = useLocale()
  const [carIds, setCarIds] = useState<string[]>([])
  const [cars, setCars] = useState<ComparisonCar[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ComparisonSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [allCars, setAllCars] = useState<ComparisonCar[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Load settings from localStorage
  useEffect(() => {
    setSettings(getCompareSettings())
    setCarIds(getCompareCarIds())
  }, [])

  // Persist settings on change
  const handleSettingsChange = useCallback((newSettings: ComparisonSettings) => {
    setSettings(newSettings)
    saveCompareSettings(newSettings)
  }, [])

  // Fetch car data for selected IDs
  useEffect(() => {
    async function fetchCars() {
      if (carIds.length === 0) {
        setCars([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const fetched: ComparisonCar[] = []
        for (const id of carIds) {
          const res = await fetch(`/api/cars/${id}`)
          if (res.ok) {
            const data = await res.json()
            if (data) fetched.push(data)
          }
        }
        setCars(fetched)
      } catch (err) {
        console.error('Failed to fetch comparison cars:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCars()
  }, [carIds])

  // Compute comparisons
  const results: CarComparisonResult[] = useMemo(() => {
    return cars.map(car => computeCarComparison(car, settings))
  }, [cars, settings])

  // Find lowest TCO for highlighting
  const lowestPurchaseMonthly = useMemo(() => {
    let lowest = Infinity
    for (const r of results) {
      for (const o of r.origins) {
        const m = r.purchase[o]?.monthlyEquivalent
        if (m != null && m < lowest) lowest = m
      }
    }
    return lowest
  }, [results])

  const lowestFlexleaseMonthly = useMemo(() => {
    let lowest = Infinity
    for (const r of results) {
      if (r.flexlease.monthlyEquivalent < lowest) {
        lowest = r.flexlease.monthlyEquivalent
      }
    }
    return lowest
  }, [results])

  const handleRemoveCar = useCallback((carId: string) => {
    removeCompareCar(carId)
    setCarIds(prev => prev.filter(id => id !== carId))
  }, [])

  const handleClearAll = useCallback(() => {
    clearCompare()
    setCarIds([])
  }, [])

  // Add car modal: fetch all cars for search
  const handleOpenAddModal = useCallback(async () => {
    setShowAddModal(true)
    setSearchQuery('')
    if (allCars.length === 0) {
      try {
        const res = await fetch('/api/cars?limit=200')
        const data = await res.json()
        setAllCars(data.cars ?? [])
      } catch {
        setAllCars([])
      }
    }
  }, [allCars.length])

  const handleAddCar = useCallback((carId: string) => {
    const ids = getCompareCarIds()
    if (ids.includes(carId)) return
    if (ids.length >= 5) return
    ids.push(carId)
    localStorage.setItem('carscout-compare-cars', JSON.stringify(ids))
    setCarIds([...ids])
    setShowAddModal(false)
  }, [])

  const filteredAllCars = useMemo(() => {
    if (!searchQuery.trim()) return allCars
    const q = searchQuery.toLowerCase()
    return allCars.filter(c =>
      `${c.brand} ${c.model} ${c.variant}`.toLowerCase().includes(q)
    )
  }, [allCars, searchQuery])

  function fmt(num: number): string {
    return new Intl.NumberFormat('da-DK').format(Math.round(num))
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-full px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Search className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">CarScout</span>
              </Link>
              <span className="text-sm text-muted-foreground hidden sm:inline">/ Sammenligning</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {results.length} / 5 biler
              </span>
              <button
                onClick={handleOpenAddModal}
                disabled={carIds.length >= 5}
                className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tilføj bil</span>
              </button>
              {carIds.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ryd</span>
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`rounded-lg border border-border p-1.5 transition-colors ${showSettings ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Settings sidebar */}
        {showSettings && (
          <aside className="w-72 shrink-0 border-r border-border bg-card p-4 overflow-y-auto sticky top-[57px] h-[calc(100vh-57px)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">{t('label.settings')}</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SettingsPanel settings={settings} onChange={handleSettingsChange} />
          </aside>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-x-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Indlæser biler...</div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                Ingen biler tilføjet til sammenligning
              </p>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Tilføj din første bil
              </button>
            </div>
          ) : (
            <div className="flex gap-4 pb-4">
              {results.map((result) => {
                // Check if this car has the lowest purchase/flexlease
                const bestPurchase = Math.min(
                  ...result.origins.map(o => result.purchase[o]?.monthlyEquivalent ?? Infinity)
                )
                const isLowestP = results.length > 1 && bestPurchase === lowestPurchaseMonthly
                const isLowestF = results.length > 1 && result.flexlease.monthlyEquivalent === lowestFlexleaseMonthly

                return (
                  <CarColumn
                    key={result.car.id}
                    result={result}
                    isLowestPurchase={isLowestP}
                    isLowestFlexlease={isLowestF}
                    onRemove={() => handleRemoveCar(result.car.id)}
                  />
                )
              })}

              {/* Add car placeholder */}
              {carIds.length < 5 && results.length > 0 && (
                <button
                  onClick={handleOpenAddModal}
                  className="min-w-[320px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors h-64"
                >
                  <Plus className="h-8 w-8" />
                  <span className="text-sm">Tilføj bil</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add car modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-lg max-h-[80vh] rounded-xl border border-border bg-card shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">Tilføj bil til sammenligning</h2>
              <input
                type="text"
                placeholder="Søg mærke, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredAllCars.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Ingen biler fundet</p>
              ) : (
                filteredAllCars.map((car) => {
                  const alreadyAdded = carIds.includes(car.id)
                  return (
                    <button
                      key={car.id}
                      onClick={() => !alreadyAdded && handleAddCar(car.id)}
                      disabled={alreadyAdded}
                      className={`w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors ${alreadyAdded
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-secondary cursor-pointer'
                        }`}
                    >
                      {car.stored_image_url ? (
                        <img
                          src={car.stored_image_url}
                          alt={`${car.brand} ${car.model}`}
                          className="h-12 w-20 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded bg-secondary text-sm font-bold text-muted-foreground shrink-0">
                          {car.brand?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {car.brand} {car.model}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{car.variant}</p>
                        <p className="text-xs text-muted-foreground">
                          {car.first_registration_year} · {fmt(car.mileage_km)} km · {car.price_amount} {car.price_currency}
                        </p>
                      </div>
                      {alreadyAdded && (
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">Tilføjet</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
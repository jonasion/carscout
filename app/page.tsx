"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { Car, FilterState, FilterOptions } from "@/lib/types"
import { FilterBar } from "@/components/filter-bar"
import { CarCard, CarCardSkeleton } from "@/components/car-card"
import { CarDetail } from "@/components/car-detail"
import { EmptyState } from "@/components/empty-state"
import { Search, ArrowUpDown, LayoutGrid, TableProperties, ArrowUp, ArrowDown, Settings as SettingsIcon } from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

type SortOption =
  | "added_desc" | "price_asc" | "price_desc" | "tco_asc" | "tco_desc"
  | "year_desc" | "year_asc" | "mileage_asc" | "mileage_desc" | "brand_asc" | "model_asc"

const sortLabels: Record<SortOption, string> = {
  added_desc: "Nyeste tilføjet", price_asc: "Pris (lav → høj)", price_desc: "Pris (høj → lav)",
  tco_asc: "TCO (lav → høj)", tco_desc: "TCO (høj → lav)", year_desc: "Årgang (nyeste)",
  year_asc: "Årgang (ældste)", mileage_asc: "Km (laveste)", mileage_desc: "Km (højeste)",
  brand_asc: "Mærke (A-Z)", model_asc: "Model (A-Z)",
}

const defaultFilters: FilterState = {
  brand: "all", model: "all", min_year: "all", max_year: "all", max_mileage: "all",
  min_price: "", max_price: "", fuel_type: "all", transmission: "all",
  min_power_kw: "", max_co2: "", country: "all", source: "all",
}

type CarWithTco = Car & {
  lowest_tco_monthly_dkk?: number | null
  registration_tax_dkk?: number | null
  lowest_lease_monthly_dkk?: number | null
  lease_monthly_dkk?: number | null
  listing_type?: string
}

type ViewMode = "grid" | "table"
type TableSortKey = "brand" | "model" | "variant" | "year" | "mileage" | "price" | "fuel" | "country" | "source" | "tco" | "lease" | "regTax" | "recommendation"
type TableSortDir = "asc" | "desc"

function fmt(num: number | null | undefined): string {
  if (num == null || !isFinite(num)) return "—"
  return new Intl.NumberFormat("da-DK").format(Math.round(num))
}

const countryFlags: Record<string, string> = {
  DK: "🇩🇰", DE: "🇩🇪", SE: "🇸🇪", NO: "🇳🇴", NL: "🇳🇱", BE: "🇧🇪", FR: "🇫🇷",
}
const countryNames: Record<string, string> = {
  DK: "Danmark", DE: "Tyskland", SE: "Sverige", NO: "Norge",
  NL: "Holland", BE: "Belgien", FR: "Frankrig",
}
const fuelLabels: Record<string, string> = {
  el: "Elektrisk", benzin: "Benzin", diesel: "Diesel", hybrid: "Hybrid", phev: "Plug-in",
}
const sourceLabels: Record<string, string> = {
  bilbasen: "Bilbasen", autoscout24: "AutoScout24", mobilede: "Mobile.de",
}

function getRecommendation(car: CarWithTco): { label: string; color: string } {
  const tco = car.lowest_tco_monthly_dkk
  const lease = car.lowest_lease_monthly_dkk ?? (car as any).lease_monthly_dkk
  if (!tco && !lease) return { label: "—", color: "" }
  if (!tco) return { label: "Kun leasing", color: "text-blue-400" }
  if (!lease) return { label: "Kun køb", color: "text-foreground" }
  if (lease < tco) return { label: "Leasing", color: "text-emerald-400" }
  if (tco < lease) return { label: "Køb", color: "text-blue-400" }
  return { label: "Ens", color: "text-muted-foreground" }
}

function sortCars(cars: CarWithTco[], sortBy: SortOption): CarWithTco[] {
  const sorted = [...cars]
  switch (sortBy) {
    case "added_desc": return sorted
    case "price_asc": return sorted.sort((a, b) => (a.price_amount ?? 0) - (b.price_amount ?? 0))
    case "price_desc": return sorted.sort((a, b) => (b.price_amount ?? 0) - (a.price_amount ?? 0))
    case "tco_asc": return sorted.sort((a, b) => (a.lowest_tco_monthly_dkk ?? Infinity) - (b.lowest_tco_monthly_dkk ?? Infinity))
    case "tco_desc": return sorted.sort((a, b) => (b.lowest_tco_monthly_dkk ?? -Infinity) - (a.lowest_tco_monthly_dkk ?? -Infinity))
    case "year_desc": return sorted.sort((a, b) => (b.first_registration_year ?? 0) - (a.first_registration_year ?? 0))
    case "year_asc": return sorted.sort((a, b) => (a.first_registration_year ?? 0) - (b.first_registration_year ?? 0))
    case "mileage_asc": return sorted.sort((a, b) => (a.mileage_km ?? 0) - (b.mileage_km ?? 0))
    case "mileage_desc": return sorted.sort((a, b) => (b.mileage_km ?? 0) - (a.mileage_km ?? 0))
    case "brand_asc": return sorted.sort((a, b) => (a.brand ?? "").localeCompare(b.brand ?? ""))
    case "model_asc": return sorted.sort((a, b) => {
      const bc = (a.brand ?? "").localeCompare(b.brand ?? "")
      return bc !== 0 ? bc : (a.model ?? "").localeCompare(b.model ?? "")
    })
    default: return sorted
  }
}

function tableSortCars(cars: CarWithTco[], key: TableSortKey, dir: TableSortDir): CarWithTco[] {
  const sorted = [...cars]
  const m = dir === "asc" ? 1 : -1
  const cmp = (a: any, b: any) => {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    if (typeof a === "string") return a.localeCompare(b) * m
    return (a - b) * m
  }
  switch (key) {
    case "brand": return sorted.sort((a, b) => cmp(a.brand, b.brand))
    case "model": return sorted.sort((a, b) => cmp(a.model, b.model))
    case "variant": return sorted.sort((a, b) => cmp(a.variant, b.variant))
    case "year": return sorted.sort((a, b) => cmp(a.first_registration_year, b.first_registration_year))
    case "mileage": return sorted.sort((a, b) => cmp(a.mileage_km, b.mileage_km))
    case "price": return sorted.sort((a, b) => cmp(a.price_amount, b.price_amount))
    case "fuel": return sorted.sort((a, b) => cmp(a.fuel_type, b.fuel_type))
    case "country": return sorted.sort((a, b) => cmp(a.country, b.country))
    case "source": return sorted.sort((a, b) => cmp(a.source, b.source))
    case "tco": return sorted.sort((a, b) => cmp(a.lowest_tco_monthly_dkk, b.lowest_tco_monthly_dkk))
    case "lease": return sorted.sort((a, b) => cmp(a.lowest_lease_monthly_dkk ?? (a as any).lease_monthly_dkk, b.lowest_lease_monthly_dkk ?? (b as any).lease_monthly_dkk))
    case "regTax": return sorted.sort((a, b) => cmp(a.registration_tax_dkk, b.registration_tax_dkk))
    case "recommendation": return sorted.sort((a, b) => cmp(getRecommendation(a).label, getRecommendation(b).label))
    default: return sorted
  }
}

function SortableHeader({ label, sortKey, currentKey, currentDir, onSort }: {
  label: string; sortKey: TableSortKey; currentKey: TableSortKey | null; currentDir: TableSortDir; onSort: (key: TableSortKey) => void
}) {
  const isActive = currentKey === sortKey
  return (
    <th
      className="px-2 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (currentDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </th>
  )
}

function CarTableView({ cars, onCarClick }: { cars: CarWithTco[]; onCarClick: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<TableSortKey | null>(null)
  const [sortDir, setSortDir] = useState<TableSortDir>("asc")

  const handleSort = (key: TableSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return cars
    return tableSortCars(cars, sortKey, sortDir)
  }, [cars, sortKey, sortDir])

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50">
          <tr className="border-b border-border">
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground w-16"></th>
            <SortableHeader label="Mærke" sortKey="brand" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Model" sortKey="model" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Variant" sortKey="variant" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Årgang" sortKey="year" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Km" sortKey="mileage" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Pris" sortKey="price" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Brændstof" sortKey="fuel" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Land" sortKey="country" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Kilde" sortKey="source" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="TCO kr/md" sortKey="tco" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Leasing kr/md" sortKey="lease" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Reg.afgift" sortKey="regTax" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortableHeader label="Anbefaling" sortKey="recommendation" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((car) => {
            const rec = getRecommendation(car)
            const leaseVal = car.lowest_lease_monthly_dkk ?? (car as any).lease_monthly_dkk
            return (
              <tr
                key={car.id}
                className="border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => onCarClick(car.id)}
              >
                <td className="px-2 py-1.5">
                  {car.stored_image_url ? (
                    <img
                      src={car.stored_image_url}
                      alt={`${car.brand} ${car.model}`}
                      className="h-10 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-16 items-center justify-center rounded bg-secondary text-xs font-bold text-muted-foreground">
                      {car.brand?.charAt(0) ?? "?"}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5 font-medium text-foreground">{car.brand}</td>
                <td className="px-2 py-1.5 text-foreground">{car.model}</td>
                <td className="px-2 py-1.5 text-muted-foreground text-xs max-w-[150px] truncate">{car.variant}</td>
                <td className="px-2 py-1.5 text-foreground">{car.first_registration_year}</td>
                <td className="px-2 py-1.5 text-foreground whitespace-nowrap">{fmt(car.mileage_km)}</td>
                <td className="px-2 py-1.5 text-foreground whitespace-nowrap">{fmt(car.price_amount)} {car.price_currency}</td>
                <td className="px-2 py-1.5 text-foreground">{fuelLabels[car.fuel_type] ?? car.fuel_type}</td>
                <td className="px-2 py-1.5 text-foreground whitespace-nowrap">{countryFlags[car.country] ?? ""} {countryNames[car.country] ?? car.country}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{sourceLabels[car.source] ?? car.source}</td>
                <td className="px-2 py-1.5 font-semibold text-primary whitespace-nowrap">{car.lowest_tco_monthly_dkk ? fmt(car.lowest_tco_monthly_dkk) : "—"}</td>
                <td className="px-2 py-1.5 text-foreground whitespace-nowrap">{leaseVal ? fmt(leaseVal) : "—"}</td>
                <td className="px-2 py-1.5 text-foreground whitespace-nowrap">{car.registration_tax_dkk ? fmt(car.registration_tax_dkk) : "—"}</td>
                <td className={`px-2 py-1.5 font-medium whitespace-nowrap ${rec.color}`}>{rec.label}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function CarScoutPage() {
  const [cars, setCars] = useState<CarWithTco[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("added_desc")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [showSettings, setShowSettings] = useState(false)
  const [settingsDownPayment, setSettingsDownPayment] = useState(200000)
  const [settingsLoanRate, setSettingsLoanRate] = useState(5.0)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        setSettingsDownPayment(data.down_payment_dkk)
        setSettingsLoanRate(data.loan_rate_pct)
      } catch { }
    }
    loadSettings()
  }, [])

  async function saveSettings() {
    setSettingsLoading(true)
    setSettingsSaved(false)
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ down_payment_dkk: settingsDownPayment, loan_rate_pct: settingsLoanRate }),
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch { }
    finally { setSettingsLoading(false) }
  }

  async function recomputeAll() {
    setSettingsLoading(true)
    try {
      await saveSettings()
      const allCars = (await (await fetch("/api/cars?limit=200")).json()).cars ?? []
      for (const c of allCars) {
        await fetch(`/api/cars/${c.id}/tco`, { method: "POST" }).catch(() => { })
      }
      await fetchCars()
    } catch { }
    finally { setSettingsLoading(false); setShowSettings(false) }
  }

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const res = await fetch("/api/cars/filters")
        const data = await res.json()
        setFilterOptions(data)
      } catch (error) {
        console.error("Error fetching filter options:", error)
      }
    }
    loadFilterOptions()
  }, [])

  const fetchCars = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.brand !== "all") params.set("brand", filters.brand)
      if (filters.model !== "all") params.set("model", filters.model)
      if (filters.min_year !== "all") params.set("min_year", filters.min_year)
      if (filters.max_year !== "all") params.set("max_year", filters.max_year)
      if (filters.max_mileage !== "all") params.set("max_mileage", filters.max_mileage)
      if (filters.min_price) params.set("min_price", filters.min_price)
      if (filters.max_price) params.set("max_price", filters.max_price)
      if (filters.fuel_type !== "all") params.set("fuel_type", filters.fuel_type)
      if (filters.transmission !== "all") params.set("transmission", filters.transmission)
      if (filters.min_power_kw) params.set("min_power_kw", filters.min_power_kw)
      if (filters.max_co2) params.set("max_co2", filters.max_co2)
      if (filters.country !== "all") params.set("country", filters.country)
      if (filters.source !== "all") params.set("source", filters.source)

      const response = await fetch(`/api/cars?${params.toString()}`)
      const data = await response.json()
      setCars(data.cars ?? [])
    } catch (error) {
      console.error("Error fetching cars:", error)
      setCars([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchCars() }, [fetchCars])

  const sortedCars = useMemo(() => sortCars(cars, sortBy), [cars, sortBy])

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "brand") next.model = "all"
      return next
    })
  }

  const handleReset = () => setFilters(defaultFilters)
  const handleCarClick = (carId: string) => setSelectedCarId(carId)
  const handleBackToList = () => setSelectedCarId(null)

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => { setSelectedCarId(null) }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Search className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">CarScout</h1>
                <p className="text-xs text-muted-foreground">TCO Biloversigt</p>
              </div>
            </div>
            {!selectedCarId && (
              <div className="flex items-center gap-3">
                {/* View mode toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                    title="Kortoversigt"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                    title="Tabeloversigt"
                  >
                    <TableProperties className="h-4 w-4" />
                  </button>
                </div>

                {/* Sort dropdown (grid view only) */}
                {viewMode === "grid" && (
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <Select value={sortBy} onValueChange={(v) => setSortBy((v ?? "added_desc") as SortOption)}>
                      <SelectTrigger className="w-[180px] bg-secondary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(sortLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  {loading ? "Indlæser..." : `${cars.length} biler fundet`}
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="rounded-lg border border-border bg-secondary p-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Indstillinger"
                >
                  <SettingsIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
            {showSettings && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowSettings(false)}>
                    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold text-foreground mb-4">Beregningsindstillinger</h2>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-muted-foreground">Udbetaling (DKK)</label>
                                <input
                                    type="number"
                                    value={settingsDownPayment}
                                    onChange={(e) => setSettingsDownPayment(Number(e.target.value))}
                                    className="rounded-md border border-border bg-secondary px-3 py-2 text-foreground"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-muted-foreground">Lånerente (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={settingsLoanRate}
                                    onChange={(e) => setSettingsLoanRate(Number(e.target.value))}
                                    className="rounded-md border border-border bg-secondary px-3 py-2 text-foreground"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={saveSettings}
                                    disabled={settingsLoading}
                                    className="rounded-md bg-secondary border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
                                >
                                    {settingsSaved ? "✓ Gemt" : "Gem"}
                                </button>
                                <button
                                    onClick={recomputeAll}
                                    disabled={settingsLoading}
                                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {settingsLoading ? "Beregner alle..." : "Gem & genberegn alle biler"}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Genberegning opdaterer TCO for alle {cars.length} biler med de nye indstillinger.
                            </p>
                        </div>
                    </div>
                </div>
            )}

      <div className={`mx-auto px-4 py-6 sm:px-6 lg:px-8 ${viewMode === "table" && !selectedCarId ? "max-w-full" : "max-w-7xl"}`}>
        {selectedCarId ? (
          <CarDetail carId={selectedCarId} onBack={handleBackToList} />
        ) : (
          <div className="space-y-6">
            <FilterBar
              filters={filters}
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
            />

            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <CarCardSkeleton key={i} />)}
              </div>
            ) : cars.length === 0 ? (
              <EmptyState />
            ) : viewMode === "table" ? (
              <CarTableView cars={sortedCars} onCarClick={handleCarClick} />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortedCars.map((car) => (
                  <CarCard key={car.id} car={car} onClick={() => handleCarClick(car.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
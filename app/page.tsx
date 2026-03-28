"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { Car, FilterState, FilterOptions } from "@/lib/types"
import { FilterBar } from "@/components/filter-bar"
import { CarCard, CarCardSkeleton } from "@/components/car-card"
import { CarDetail } from "@/components/car-detail"
import { EmptyState } from "@/components/empty-state"
import { Search, ArrowUpDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SortOption =
  | "added_desc"
  | "price_asc"
  | "price_desc"
  | "tco_asc"
  | "tco_desc"
  | "year_desc"
  | "year_asc"
  | "mileage_asc"
  | "mileage_desc"
  | "brand_asc"
  | "model_asc"

const sortLabels: Record<SortOption, string> = {
  added_desc: "Nyeste tilføjet",
  price_asc: "Pris (lav → høj)",
  price_desc: "Pris (høj → lav)",
  tco_asc: "TCO (lav → høj)",
  tco_desc: "TCO (høj → lav)",
  year_desc: "Årgang (nyeste)",
  year_asc: "Årgang (ældste)",
  mileage_asc: "Km (laveste)",
  mileage_desc: "Km (højeste)",
  brand_asc: "Mærke (A-Z)",
  model_asc: "Model (A-Z)",
}

const defaultFilters: FilterState = {
  brand: "all",
  model: "all",
  min_year: "all",
  max_year: "all",
  max_mileage: "all",
  min_price: "",
  max_price: "",
  fuel_type: "all",
  transmission: "all",
  min_power_kw: "",
  max_co2: "",
  country: "all",
  source: "all",
}

type CarWithTco = Car & { lowest_tco_monthly_dkk?: number | null }

function sortCars(cars: CarWithTco[], sortBy: SortOption): CarWithTco[] {
  const sorted = [...cars]
  switch (sortBy) {
    case "added_desc":
      return sorted // already ordered by scraped_at desc from API
    case "price_asc":
      return sorted.sort((a, b) => (a.price_amount ?? 0) - (b.price_amount ?? 0))
    case "price_desc":
      return sorted.sort((a, b) => (b.price_amount ?? 0) - (a.price_amount ?? 0))
    case "tco_asc":
      return sorted.sort((a, b) => {
        const aTco = a.lowest_tco_monthly_dkk ?? Infinity
        const bTco = b.lowest_tco_monthly_dkk ?? Infinity
        return aTco - bTco
      })
    case "tco_desc":
      return sorted.sort((a, b) => {
        const aTco = a.lowest_tco_monthly_dkk ?? -Infinity
        const bTco = b.lowest_tco_monthly_dkk ?? -Infinity
        return bTco - aTco
      })
    case "year_desc":
      return sorted.sort((a, b) => (b.first_registration_year ?? 0) - (a.first_registration_year ?? 0))
    case "year_asc":
      return sorted.sort((a, b) => (a.first_registration_year ?? 0) - (b.first_registration_year ?? 0))
    case "mileage_asc":
      return sorted.sort((a, b) => (a.mileage_km ?? 0) - (b.mileage_km ?? 0))
    case "mileage_desc":
      return sorted.sort((a, b) => (b.mileage_km ?? 0) - (a.mileage_km ?? 0))
    case "brand_asc":
      return sorted.sort((a, b) => (a.brand ?? "").localeCompare(b.brand ?? ""))
    case "model_asc":
      return sorted.sort((a, b) => {
        const brandCmp = (a.brand ?? "").localeCompare(b.brand ?? "")
        if (brandCmp !== 0) return brandCmp
        return (a.model ?? "").localeCompare(b.model ?? "")
      })
    default:
      return sorted
  }
}

export default function CarScoutPage() {
  const [cars, setCars] = useState<CarWithTco[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("added_desc")

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

  useEffect(() => {
    fetchCars()
  }, [fetchCars])

  const sortedCars = useMemo(() => sortCars(cars, sortBy), [cars, sortBy])

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "brand") {
        next.model = "all"
      }
      return next
    })
  }

  const handleReset = () => {
    setFilters(defaultFilters)
  }

  const handleCarClick = (carId: string) => {
    setSelectedCarId(carId)
  }

  const handleBackToList = () => {
    setSelectedCarId(null)
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Search className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">CarScout</h1>
                <p className="text-xs text-muted-foreground">TCO Biloversigt</p>
              </div>
            </div>
            {!selectedCarId && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={sortBy}
                    onValueChange={(v) => setSortBy((v ?? "added_desc") as SortOption)}
                  >
                    <SelectTrigger className="w-[180px] bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sortLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  {loading ? "Indlæser..." : `${cars.length} biler fundet`}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
                {Array.from({ length: 6 }).map((_, i) => (
                  <CarCardSkeleton key={i} />
                ))}
              </div>
            ) : cars.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortedCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onClick={() => handleCarClick(car.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
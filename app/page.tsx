"use client"

import { useState, useEffect, useCallback } from "react"
import type { Car, FilterState } from "@/lib/types"
import { FilterBar } from "@/components/filter-bar"
import { CarCard, CarCardSkeleton } from "@/components/car-card"
import { CarDetail } from "@/components/car-detail"
import { EmptyState } from "@/components/empty-state"
import { Search } from "lucide-react"

export default function CarScoutPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    fuel_type: "all",
    source: "all",
    country: "all",
    min_price: "",
    max_price: "",
  })

  const fetchCars = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.fuel_type !== "all") params.set("fuel_type", filters.fuel_type)
      if (filters.source !== "all") params.set("source", filters.source)
      if (filters.country !== "all") params.set("country", filters.country)
      if (filters.min_price) params.set("min_price", filters.min_price)
      if (filters.max_price) params.set("max_price", filters.max_price)

      const response = await fetch(`/api/cars?${params.toString()}`)
      const data = await response.json()
      setCars(data)
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

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleCarClick = (carId: string) => {
    setSelectedCarId(carId)
  }

  const handleBackToList = () => {
    setSelectedCarId(null)
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Search className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">CarScout</h1>
                <p className="text-xs text-muted-foreground">TCO Car Comparison</p>
              </div>
            </div>
            {!selectedCarId && (
              <div className="text-sm text-muted-foreground">
                {loading ? "Loading..." : `${cars.length} cars found`}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {selectedCarId ? (
          <CarDetail carId={selectedCarId} onBack={handleBackToList} />
        ) : (
          <div className="space-y-6">
            {/* Filter Bar */}
            <FilterBar filters={filters} onFilterChange={handleFilterChange} />

            {/* Car Grid */}
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CarCardSkeleton key={i} />
                ))}
              </div>
            ) : cars.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cars.map((car) => (
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

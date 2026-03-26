"use client"

import { useEffect, useState } from "react"
import type { Car, TCOData } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type CarCardProps = {
    car: Car
    onClick: () => void
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat("da-DK").format(num)
}

const countryFlags: Record<string, string> = {
    DK: "🇩🇰",
    DE: "🇩🇪",
    SE: "🇸🇪",
    NO: "🇳🇴",
    NL: "🇳🇱",
    BE: "🇧🇪",
    FR: "🇫🇷",
}

function FuelBadge({ fuelType }: { fuelType: Car["fuel_type"] }) {
    const config = {
        el: { label: "Electric", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
        benzin: { label: "Benzin", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
        diesel: { label: "Diesel", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
        hybrid: { label: "Hybrid", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    }
    const { label, className } = config[fuelType]
    return <Badge variant="outline" className={className}>{label}</Badge>
}

function CountryDisplay({ country }: { country: string }) {
    const flag = countryFlags[country] || ""
    return (
        <span className="text-sm">
            {flag} {country}
        </span>
    )
}

function CarPlaceholder({ brand }: { brand: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-5xl font-bold text-muted-foreground/50">
                {brand.charAt(0).toUpperCase()}
            </span>
        </div>
    )
}

export function CarCard({ car, onClick }: CarCardProps) {
    const [lowestTco, setLowestTco] = useState<number | null>(null)
    const [loadingTco, setLoadingTco] = useState(true)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        async function fetchTco() {
            try {
                const res = await fetch(`/api/cars/${car.id}/tco`)
                const data: TCOData = await res.json()
                const lowest = Math.min(...data.tco_scenarios.map(s => s.monthly_equivalent_dkk))
                setLowestTco(lowest)
            } catch {
                setLowestTco(null)
            } finally {
                setLoadingTco(false)
            }
        }
        fetchTco()
    }, [car.id])

    const showPlaceholder = !car.stored_image_url || imageError

    return (
        <Card
            className="group cursor-pointer overflow-hidden border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            onClick={onClick}
        >
            <div className="relative aspect-[16/10] overflow-hidden">
                {showPlaceholder ? (
                    <CarPlaceholder brand={car.brand} />
                ) : (
                    <img
                        src={car.stored_image_url ?? undefined}
                        alt={`${car.brand} ${car.model}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={() => setImageError(true)}
                    />
                )}
                <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    <FuelBadge fuelType={car.fuel_type} />
                </div>
            </div>
            <CardContent className="p-4">
                <div className="mb-2">
                    <h3 className="font-semibold text-foreground">
                        {car.brand} {car.model}
                    </h3>
                    <p className="text-sm text-muted-foreground">{car.variant}</p>
                </div>

                <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{car.first_registration_year}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <span>{formatNumber(car.mileage_km)} km</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <CountryDisplay country={car.country} />
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-lg font-bold text-foreground">
                            {formatNumber(car.price_amount)} {car.price_currency}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">From</p>
                        {loadingTco ? (
                            <div className="h-5 w-20 animate-pulse rounded bg-secondary" />
                        ) : lowestTco !== null ? (
                            <p className="font-semibold text-primary">
                                {formatNumber(lowestTco)} DKK/mo
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">--</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function CarCardSkeleton() {
    return (
        <Card className="overflow-hidden border-border bg-card">
            <div className="aspect-[16/10] animate-pulse bg-secondary" />
            <CardContent className="p-4">
                <div className="mb-2 space-y-2">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-secondary" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
                </div>
                <div className="mb-3 flex gap-3">
                    <div className="h-4 w-12 animate-pulse rounded bg-secondary" />
                    <div className="h-4 w-20 animate-pulse rounded bg-secondary" />
                </div>
                <div className="flex justify-between">
                    <div className="h-6 w-28 animate-pulse rounded bg-secondary" />
                    <div className="h-6 w-24 animate-pulse rounded bg-secondary" />
                </div>
            </CardContent>
        </Card>
    )
}

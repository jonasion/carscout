"use client"

import { useEffect, useState } from "react"
import type { Car } from "@/lib/types"
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
    DK: "🇩🇰", DE: "🇩🇪", SE: "🇸🇪", NO: "🇳🇴",
    NL: "🇳🇱", BE: "🇧🇪", FR: "🇫🇷",
}

const countryNames: Record<string, string> = {
    DK: "Danmark", DE: "Tyskland", SE: "Sverige", NO: "Norge",
    NL: "Holland", BE: "Belgien", FR: "Frankrig",
}

function FuelBadge({ fuelType }: { fuelType: string }) {
    const config: Record<string, { label: string; className: string }> = {
        el: { label: "Elektrisk", className: "bg-emerald-600/30 text-emerald-300 border-emerald-500/50" },
        benzin: { label: "Benzin", className: "bg-blue-600/30 text-blue-300 border-blue-500/50" },
        diesel: { label: "Diesel", className: "bg-zinc-600/30 text-zinc-300 border-zinc-500/50" },
        hybrid: { label: "Hybrid", className: "bg-purple-600/30 text-purple-300 border-purple-500/50" },
        phev: { label: "Plug-in", className: "bg-purple-600/30 text-purple-300 border-purple-500/50" },
    }
    const { label, className } = config[fuelType] ?? {
        label: fuelType || "Ukendt",
        className: "bg-zinc-600/30 text-zinc-300 border-zinc-500/50",
    }
    return <Badge variant="outline" className={className}>{label}</Badge>
}

function CarPlaceholder({ brand }: { brand: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-5xl font-bold text-muted-foreground/50">
                {brand?.charAt(0).toUpperCase() ?? "?"}
            </span>
        </div>
    )
}

export function CarCard({ car, onClick }: CarCardProps) {
    const [lowestTco, setLowestTco] = useState<number | null>(null)
    const [tcoStatus, setTcoStatus] = useState<'loading' | 'computing' | 'ready' | 'failed'>('loading')
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function fetchTco() {
            setTcoStatus('loading')
            try {
                const res = await fetch(`/api/cars/${car.id}/tco`)
                const data = await res.json()
                let scenarios = data.tco_scenarios ?? []

                if (scenarios.length === 0) {
                    if (cancelled) return
                    setTcoStatus('computing')
                    await fetch(`/api/cars/${car.id}/tco`, { method: 'POST' })
                    const res2 = await fetch(`/api/cars/${car.id}/tco`)
                    const data2 = await res2.json()
                    scenarios = data2.tco_scenarios ?? []
                }

                if (cancelled) return
                const values = scenarios
                    .map((s: any) => s.monthly_equivalent_dkk)
                    .filter((v: number) => v != null && isFinite(v) && v > 0)
                const lowest = values.length > 0 ? Math.min(...values) : null
                setLowestTco(lowest)
                setTcoStatus(lowest !== null ? 'ready' : 'failed')
            } catch {
                if (!cancelled) {
                    setLowestTco(null)
                    setTcoStatus('failed')
                }
            }
        }
        fetchTco()
        return () => { cancelled = true }
    }, [car.id])

    const showPlaceholder = !car.stored_image_url || imageError
    const flag = countryFlags[car.country] || ""
    const name = countryNames[car.country] ?? car.country

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
                    <span>{flag} {name}</span>
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        {(car as any).listing_type === "lease" && (car as any).lease_monthly_dkk ? (
                            <p className="text-lg font-bold text-foreground">
                                {formatNumber((car as any).lease_monthly_dkk)} kr/md
                            </p>
                        ) : (
                            <p className="text-lg font-bold text-foreground">
                                {formatNumber(car.price_amount)} {car.price_currency}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Fra</p>
                        {tcoStatus === 'loading' ? (
                            <div className="h-5 w-20 animate-pulse rounded bg-secondary" />
                        ) : tcoStatus === 'computing' ? (
                            <p className="text-sm text-muted-foreground">Beregnes...</p>
                        ) : tcoStatus === 'ready' && lowestTco !== null ? (
                            <p className="font-semibold text-primary">
                                {formatNumber(lowestTco)} kr/md
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">—</p>
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
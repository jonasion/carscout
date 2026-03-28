"use client"

import { useEffect, useState } from "react"
import type { Car, TCOData } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"
import {
    ArrowLeft,
    Calendar,
    Gauge,
    Fuel,
    Zap,
    Settings2,
    MapPin,
    Phone,
    Building2,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────

type CarDetailProps = {
    carId: string
    onBack: () => void
}

type PriceHistoryEntry = {
    price_amount: number
    price_currency: string
    scraped_at: string
}

type TcoStatus = "loading" | "computing" | "ready" | "failed"

// ── Helpers ──────────────────────────────────────────────────────

function formatNumber(num: number): string {
    return new Intl.NumberFormat("da-DK").format(num)
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("da-DK", {
        day: "numeric",
        month: "short",
    })
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

const countryNames: Record<string, string> = {
    DK: "Danmark",
    DE: "Tyskland",
    SE: "Sverige",
    NO: "Norge",
    NL: "Holland",
    BE: "Belgien",
    FR: "Frankrig",
}

const fuelLabels: Record<string, string> = {
    el: "Elektrisk",
    benzin: "Benzin",
    diesel: "Diesel",
    hybrid: "Hybrid",
}

const transmissionLabels: Record<string, string> = {
    automatic: "Automatisk",
    manual: "Manuel",
}

// ── Sub-components ───────────────────────────────────────────────

function FuelBadge({ fuelType }: { fuelType: Car["fuel_type"] }) {
    const config: Record<string, { label: string; className: string }> = {
        el: { label: "Elektrisk", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
        benzin: { label: "Benzin", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
        diesel: { label: "Diesel", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
        hybrid: { label: "Hybrid", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    }
    const { label, className } = config[fuelType] ?? {
        label: fuelType,
        className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    }
    return (
        <Badge variant="outline" className={className}>
            {label}
        </Badge>
    )
}

function CarPlaceholder({ brand }: { brand: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-8xl font-bold text-muted-foreground/50">
                {brand.charAt(0).toUpperCase()}
            </span>
        </div>
    )
}

function SpecItem({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType
    label: string
    value: string
}) {
    return (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary/50 p-3 text-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground">{value}</span>
        </div>
    )
}

// ── Main component ───────────────────────────────────────────────

export function CarDetail({ carId, onBack }: CarDetailProps) {
    const [car, setCar] = useState<Car | null>(null)
    const [tcoData, setTcoData] = useState<TCOData | null>(null)
    const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([])
    const [tcoStatus, setTcoStatus] = useState<TcoStatus>("loading")
    const [loading, setLoading] = useState(true)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function fetchData() {
            setLoading(true)
            setTcoStatus("loading")
            try {
                // ── Fetch car + price history ──
                const carRes = await fetch(`/api/cars/${carId}`)
                if (!carRes.ok) throw new Error("Car fetch failed")
                const carData = await carRes.json()
                if (cancelled) return

                // API returns { ...carFields, price_history: [...] }
                const { price_history, ...carFields } = carData
                setCar(carFields as Car)
                setPriceHistory(price_history ?? [])

                // ── Fetch TCO scenarios ──
                const tcoRes = await fetch(`/api/cars/${carId}/tco`)
                const tcoResult: TCOData = await tcoRes.json()
                let scenarios = tcoResult.tco_scenarios ?? []

                // If empty, trigger computation then re-fetch
                if (scenarios.length === 0) {
                    if (cancelled) return
                    setTcoStatus("computing")
                    await fetch(`/api/cars/${carId}/tco`, { method: "POST" })
                    const tcoRes2 = await fetch(`/api/cars/${carId}/tco`)
                    const tcoResult2: TCOData = await tcoRes2.json()
                    scenarios = tcoResult2.tco_scenarios ?? []
                }

                if (cancelled) return
                setTcoData({ ...tcoResult, tco_scenarios: scenarios })
                setTcoStatus(scenarios.length > 0 ? "ready" : "failed")
            } catch (error) {
                console.error("Fejl ved indlæsning:", error)
                if (!cancelled) setTcoStatus("failed")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchData()
        return () => {
            cancelled = true
        }
    }, [carId])

    // ── Loading skeleton ──
    if (loading) {
        return <CarDetailSkeleton onBack={onBack} />
    }

    // ── Not found ──
    if (!car) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground">Bilen blev ikke fundet</p>
                <Button variant="ghost" onClick={onBack} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tilbage til oversigt
                </Button>
            </div>
        )
    }

    // ── Derived data ──
    const scenarios = tcoData?.tco_scenarios ?? []
    const purchaseScenarios = scenarios.filter((s) => s.scenario_type === "purchase")
    const privateScenarios = purchaseScenarios
        .filter((s) => s.usage_type === "private")
        .sort((a, b) => a.holding_period_years - b.holding_period_years)
    const companyScenarios = purchaseScenarios
        .filter((s) => s.usage_type === "company")
        .sort((a, b) => a.holding_period_years - b.holding_period_years)

    const financingSensitivity = tcoData?.financing_sensitivity ?? []
    const finChartData = financingSensitivity.map((item) => ({
        downPayment: String(item.down_payment_dkk / 1000) + "k",
        Privat: item.private_monthly_dkk,
        Erhverv: item.company_monthly_dkk,
    }))

    const priceChartData = priceHistory
        .sort((a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime())
        .map((entry) => ({
            date: formatDate(entry.scraped_at),
            price: entry.price_amount,
        }))

    const allMonthly = scenarios
        .map((s) => s.monthly_equivalent_dkk)
        .filter((v) => v != null && isFinite(v) && v > 0)
    const lowestTco = allMonthly.length > 0 ? Math.min(...allMonthly) : null

    const showPlaceholder = !car.stored_image_url || imageError
    const hasDealer = car.dealer_name && car.dealer_name.trim() !== ""
    const hasDealerPhone = car.dealer_phone && car.dealer_phone.trim() !== ""
    const hasFinancing = finChartData.length > 0
    const hasPriceHistory = priceChartData.length > 1

    // ── Render ──
    return (
        <div className="space-y-6">
            {/* Back button */}
            <Button
                variant="ghost"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbage til oversigt
            </Button>

            {/* Hero image */}
            <div className="relative aspect-[21/9] overflow-hidden rounded-xl">
                {!showPlaceholder ? (
                    <img
                        src={car.stored_image_url ?? undefined}
                        alt={`${car.brand} ${car.model}`}
                        className="h-full w-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <CarPlaceholder brand={car.brand} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{countryFlags[car.country] || ""}</span>
                        <FuelBadge fuelType={car.fuel_type} />
                    </div>
                    <h1 className="mt-2 text-3xl font-bold text-foreground">
                        {car.brand} {car.model}
                    </h1>
                    <p className="text-lg text-muted-foreground">{car.variant}</p>
                    <p className="mt-2 text-2xl font-bold text-primary">
                        {formatNumber(car.price_amount)} {car.price_currency}
                    </p>
                </div>
            </div>

            {/* ── Two-column: Specs (left) + TCO summary (right) ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left column — Specs */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">Specifikationer</h2>
                    <div className="grid grid-cols-3 gap-3">
                        <SpecItem
                            icon={Calendar}
                            label="Årgang"
                            value={String(car.first_registration_year)}
                        />
                        <SpecItem
                            icon={Gauge}
                            label="Kilometertal"
                            value={formatNumber(car.mileage_km) + " km"}
                        />
                        <SpecItem
                            icon={Fuel}
                            label="Brændstof"
                            value={fuelLabels[car.fuel_type] ?? car.fuel_type}
                        />
                        <SpecItem
                            icon={Zap}
                            label="Effekt"
                            value={car.power_kw ? car.power_kw + " kW" : "N/A"}
                        />
                        <SpecItem
                            icon={Settings2}
                            label="Gearkasse"
                            value={transmissionLabels[car.transmission] ?? car.transmission ?? "N/A"}
                        />
                        <SpecItem
                            icon={MapPin}
                            label="Land"
                            value={
                                (countryFlags[car.country] || "") +
                                " " +
                                (countryNames[car.country] ?? car.country)
                            }
                        />
                    </div>
                </div>

                {/* Right column — TCO summary */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Totaløkonomi (TCO)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tcoStatus === "loading" ? (
                            <div className="space-y-3">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-5 w-1/2" />
                            </div>
                        ) : tcoStatus === "computing" ? (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                <p className="text-sm">Beregner totaløkonomi…</p>
                            </div>
                        ) : tcoStatus === "ready" && scenarios.length > 0 ? (
                            <div className="space-y-4">
                                {lowestTco !== null && (
                                    <div className="rounded-lg bg-primary/10 p-4 text-center">
                                        <p className="text-xs text-muted-foreground">
                                            Laveste månedlige TCO
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                            {formatNumber(lowestTco)} kr/md
                                        </p>
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                                                    Scenarie
                                                </th>
                                                {[2, 3, 5].map((y) => (
                                                    <th
                                                        key={y}
                                                        className="px-2 py-2 text-center font-medium text-muted-foreground"
                                                    >
                                                        {y} år
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {privateScenarios.length > 0 && (
                                                <tr className="border-b border-border/50">
                                                    <td className="px-2 py-2 font-medium text-foreground">
                                                        Privat
                                                    </td>
                                                    {privateScenarios.map((s) => (
                                                        <td
                                                            key={s.holding_period_years}
                                                            className="px-2 py-2 text-center font-semibold text-foreground"
                                                        >
                                                            {formatNumber(s.monthly_equivalent_dkk)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )}
                                            {companyScenarios.length > 0 && (
                                                <tr>
                                                    <td className="px-2 py-2 font-medium text-foreground">
                                                        Erhverv
                                                    </td>
                                                    {companyScenarios.map((s) => (
                                                        <td
                                                            key={s.holding_period_years}
                                                            className="px-2 py-2 text-center font-semibold text-foreground"
                                                        >
                                                            {formatNumber(s.monthly_equivalent_dkk)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                <p className="text-sm">TCO kunne ikke beregnes</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Price history chart (only if 2+ data points) ── */}
            {hasPriceHistory && (
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Prishistorik</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={priceChartData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border))"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        tickFormatter={(value: number) => formatNumber(value)}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                        }}
                                        labelStyle={{ color: "hsl(var(--foreground))" }}
                                        formatter={(value) => [
                                            formatNumber(Number(value)) + " " + car.price_currency,
                                            "Pris",
                                        ]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="price"
                                        name="Pris"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={{ fill: "hsl(var(--primary))" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Financing sensitivity chart (hidden when no data) ── */}
            {hasFinancing && (
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Finansieringsfølsomhed</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Månedlig TCO baseret på udbetaling (100k–400k DKK)
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={finChartData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border))"
                                    />
                                    <XAxis
                                        dataKey="downPayment"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        tickFormatter={(value: number) =>
                                            String(value / 1000) + "k"
                                        }
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                        }}
                                        labelStyle={{ color: "hsl(var(--foreground))" }}
                                        formatter={(value) => [
                                            formatNumber(Number(value)) + " kr/md",
                                        ]}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="Privat"
                                        stroke="hsl(var(--chart-1))"
                                        strokeWidth={2}
                                        dot={{ fill: "hsl(var(--chart-1))" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="Erhverv"
                                        stroke="hsl(var(--chart-2))"
                                        strokeWidth={2}
                                        dot={{ fill: "hsl(var(--chart-2))" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Dealer info (hidden when empty) ── */}
            {hasDealer && (
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Forhandler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        {car.dealer_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {car.source === "bilbasen"
                                            ? "Bilbasen"
                                            : "AutoScout24"}
                                    </p>
                                </div>
                            </div>
                            {hasDealerPhone && (
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        window.open("tel:" + car.dealer_phone)
                                    }
                                >
                                    <Phone className="h-4 w-4 mr-2" />
                                    {car.dealer_phone}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// ── Loading skeleton ─────────────────────────────────────────────

function CarDetailSkeleton({ onBack }: { onBack: () => void }) {
    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbage til oversigt
            </Button>
            <Skeleton className="aspect-[21/9] rounded-xl" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="grid grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-lg" />
                        ))}
                    </div>
                </div>
                <Card className="border-border bg-card">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

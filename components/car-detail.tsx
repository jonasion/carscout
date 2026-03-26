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

type CarDetailProps = {
    carId: string
    onBack: () => void
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
    const config: Record<string, { label: string; className: string }> = {
        el: { label: "Electric", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
        benzin: { label: "Benzin", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
        diesel: { label: "Diesel", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
        hybrid: { label: "Hybrid", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    }
    const { label, className } = config[fuelType] ?? { label: fuelType, className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" }
    return <Badge variant="outline" className={className}>{label}</Badge>
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

export function CarDetail({ carId, onBack }: CarDetailProps) {
    const [car, setCar] = useState<Car | null>(null)
    const [tcoData, setTcoData] = useState<TCOData | null>(null)
    const [loading, setLoading] = useState(true)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const [carRes, tcoRes] = await Promise.all([
                    fetch(`/api/cars/${carId}`),
                    fetch(`/api/cars/${carId}/tco`),
                ])
                const carData = await carRes.json()
                const tcoDataResult = await tcoRes.json()
                setCar(carData)
                setTcoData(tcoDataResult)
            } catch (error) {
                console.error("Error fetching car data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [carId])

    if (loading) {
        return <CarDetailSkeleton onBack={onBack} />
    }

    if (!car || !tcoData) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground">Car not found</p>
                <Button variant="ghost" onClick={onBack} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to list
                </Button>
            </div>
        )
    }

    const purchaseScenarios = tcoData.tco_scenarios.filter((s) => s.scenario_type === "purchase")
    const privateScenarios = purchaseScenarios
        .filter((s) => s.usage_type === "private")
        .sort((a, b) => a.holding_period_years - b.holding_period_years)
    const companyScenarios = purchaseScenarios
        .filter((s) => s.usage_type === "company")
        .sort((a, b) => a.holding_period_years - b.holding_period_years)

    const chartData = (tcoData.financing_sensitivity ?? []).map((item) => ({
        downPayment: String(item.down_payment_dkk / 1000) + "k",
        private: item.private_monthly_dkk,
        company: item.company_monthly_dkk,
    }))

    return (
        <div className="space-y-6">
            <Button
                variant="ghost"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to list
            </Button>

            <div className="relative aspect-[21/9] overflow-hidden rounded-xl">
                {car.stored_image_url && !imageError ? (
                    <img
                        src={car.stored_image_url ?? undefined}
                        alt={car.brand + " " + car.model}
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

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <SpecItem icon={Calendar} label="Year" value={String(car.first_registration_year)} />
                <SpecItem icon={Gauge} label="Mileage" value={formatNumber(car.mileage_km) + " km"} />
                <SpecItem icon={Fuel} label="Fuel" value={car.fuel_type} />
                <SpecItem icon={Zap} label="Power" value={String(car.power_kw) + " kW"} />
                <SpecItem icon={Settings2} label="Transmission" value={car.transmission} />
                <SpecItem icon={MapPin} label="Country" value={(countryFlags[car.country] || "") + " " + car.country} />
            </div>

            <Card className="border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg">TCO Scenarios (Monthly Equivalent in DKK)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Scenario</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">2 years</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">3 years</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">5 years</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-border/50">
                                    <td className="px-4 py-3 text-sm font-medium text-foreground">Purchase — Private</td>
                                    {privateScenarios.map((s) => (
                                        <td key={s.holding_period_years} className="px-4 py-3 text-center">
                                            <span className="font-semibold text-foreground">{formatNumber(s.monthly_equivalent_dkk)}</span>
                                            <span className="ml-1 text-xs text-muted-foreground">DKK</span>
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-foreground">Purchase — Company</td>
                                    {companyScenarios.map((s) => (
                                        <td key={s.holding_period_years} className="px-4 py-3 text-center">
                                            <span className="font-semibold text-foreground">{formatNumber(s.monthly_equivalent_dkk)}</span>
                                            <span className="ml-1 text-xs text-muted-foreground">DKK</span>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg">Financing Sensitivity</CardTitle>
                    <p className="text-sm text-muted-foreground">Monthly equivalent based on down payment (100k - 400k DKK)</p>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="downPayment" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} tickFormatter={(value: number) => String(value / 1000) + "k"} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                                    labelStyle={{ color: "hsl(var(--foreground))" }}
                                    formatter={(value) => [formatNumber(Number(value)) + " DKK/mo"]}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="private" name="Private" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-1))" }} />
                                <Line type="monotone" dataKey="company" name="Company" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg">Dealer Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium text-foreground">{car.dealer_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {car.source === "bilbasen" ? "Bilbasen" : "AutoScout24"}
                                </p>
                            </div>
                        </div>

                        <Button variant="outline" onClick={() => window.open("tel:" + car.dealer_phone)}>
                            <Phone className="h-4 w-4 mr-2" />
                            {car.dealer_phone}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}

function CarDetailSkeleton({ onBack }: { onBack: () => void }) {
    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to list
            </Button>
            <Skeleton className="aspect-[21/9] rounded-xl" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
            </div>
            <Card className="border-border bg-card">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
            <Card className="border-border bg-card">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        </div>
    )
}
"use client"

import { useEffect, useState } from "react"
import type { Car, TCOData, TCOScenario } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
    ArrowLeft, Calendar, Gauge, Fuel, Zap, Settings2, MapPin,
    Phone, Building2, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react"

type CarDetailProps = { carId: string; onBack: () => void }
type PriceHistoryEntry = { price_amount: number; price_currency: string; scraped_at: string }
type TcoStatus = "loading" | "computing" | "ready" | "failed"
type UsageToggle = "private" | "company"

function fmt(num: number | null | undefined): string {
    if (num == null) return "—"
    return new Intl.NumberFormat("da-DK").format(Math.round(num))
}
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "short" })
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
const transmissionLabels: Record<string, string> = {
    automatic: "Automatisk", manual: "Manuel", Automatisk: "Automatisk", Manuel: "Manuel",
}
const originLabels: Record<string, string> = {
    dk_registered: "DK registreret", dk_unregistered: "DK uden afgift", eu_import: "EU import",
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
        label: fuelType || "Ukendt", className: "bg-zinc-600/30 text-zinc-300 border-zinc-500/50",
    }
    return <Badge variant="outline" className={className}>{label}</Badge>
}

function CarPlaceholder({ brand }: { brand: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-8xl font-bold text-muted-foreground/50">{brand?.charAt(0).toUpperCase() ?? "?"}</span>
        </div>
    )
}

function SpecItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary/50 p-3 text-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground">{value}</span>
        </div>
    )
}

function BreakdownRow({ label, value, bold, indent }: { label: string; value: string; bold?: boolean; indent?: boolean }) {
    return (
        <tr className={bold ? "border-t border-border" : ""}>
            <td className={`py-1.5 pr-4 text-sm ${indent ? "pl-4" : ""} ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</td>
            <td className={`py-1.5 text-right text-sm ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</td>
        </tr>
    )
}

function SectionHeader({ title }: { title: string }) {
    return (
        <tr><td colSpan={2} className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</td></tr>
    )
}

function PurchaseBreakdown({ scenario }: { scenario: TCOScenario }) {
    const [expanded, setExpanded] = useState(false)
    const s = scenario
    const isImport = s.origin === "eu_import"
    const hasRegTax = (s.registration_tax_dkk ?? 0) > 0
    const isCompany = s.usage_type === "company"

    return (
        <div className="rounded-lg border border-border bg-card">
            <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4 text-left">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{s.holding_period_years} {s.holding_period_years === 1 ? "år" : "år"} — Køb</span>
                        <Badge variant="outline" className="bg-zinc-600/30 text-zinc-300 border-zinc-500/50 text-xs">
                            {originLabels[s.origin] ?? s.origin}
                        </Badge>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-primary">{fmt(s.monthly_equivalent_dkk)} kr/md</p>
                </div>
                {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </button>
            {expanded && (
                <div className="border-t border-border px-4 pb-4">
                    <table className="w-full"><tbody>
                        <SectionHeader title="Anskaffelse" />
                        <BreakdownRow label="Købspris" value={fmt(s.purchase_price_dkk) + " kr"} />
                        {hasRegTax && <BreakdownRow label="Registreringsafgift" value={fmt(s.registration_tax_dkk) + " kr"} indent />}
                        {(s.ev_deduction_applied_dkk ?? 0) > 0 && <BreakdownRow label="EV-fradrag" value={"−" + fmt(s.ev_deduction_applied_dkk) + " kr"} indent />}
                        {isImport && (s.vat_saved_dkk ?? 0) > 0 && <BreakdownRow label="Moms-besparelse" value={"−" + fmt(s.vat_saved_dkk) + " kr"} indent />}
                        {isImport && (s.import_costs_dkk ?? 0) > 0 && <BreakdownRow label="Importomkostninger" value={fmt(s.import_costs_dkk) + " kr"} indent />}
                        <BreakdownRow label="Pris på vejen" value={fmt(s.total_on_road_cost_dkk) + " kr"} bold />

                        <SectionHeader title="Finansiering" />
                        <BreakdownRow label="Udbetaling" value={fmt(s.down_payment_dkk) + " kr"} />
                        <BreakdownRow label="Lånebeløb" value={fmt(s.financed_amount_dkk) + " kr"} />
                        <BreakdownRow label="Rente" value={(s.loan_rate_pct ?? 0) + "%"} />
                        <BreakdownRow label="Løbetid" value={(s.loan_term_months ?? 0) + " mdr"} />
                        <BreakdownRow label="Månedlig ydelse" value={fmt(s.monthly_loan_payment_dkk) + " kr/md"} bold />

                        {isCompany && (s.company_car_tax_total_dkk ?? 0) > 0 && (
                            <>
                                <SectionHeader title="Firmabilskat" />
                                <BreakdownRow label={"Firmabilskat (" + s.holding_period_years + " år)"} value={fmt(s.company_car_tax_total_dkk) + " kr"} />
                            </>
                        )}

                        <SectionHeader title="Værditab" />
                        <BreakdownRow label="Estimeret salgsværdi" value={fmt(s.estimated_market_value_at_exit_dkk) + " kr"} />
                        <BreakdownRow label="Kilde" value={s.depreciation_source === "tier1_scraped" ? "Markedsdata" : "Estimat"} />

                        <SectionHeader title="Samlet" />
                        <BreakdownRow label="Total ud af lommen" value={fmt(s.total_outofpocket_dkk) + " kr"} bold />
                        <BreakdownRow label="Månedlig TCO" value={fmt(s.monthly_equivalent_dkk) + " kr/md"} bold />
                        {s.notes && <tr><td colSpan={2} className="pt-2 text-xs text-muted-foreground">{s.notes}</td></tr>}
                    </tbody></table>
                </div>
            )}
        </div>
    )
}

function LeaseBreakdown({ scenario }: { scenario: TCOScenario }) {
    const [expanded, setExpanded] = useState(false)
    const s = scenario
    const isCompany = s.usage_type === "company"

    return (
        <div className="rounded-lg border border-border bg-card">
            <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4 text-left">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{s.holding_period_years} {s.holding_period_years === 1 ? "år" : "år"} — Leasing</span>
                        <Badge variant="outline" className="bg-blue-600/30 text-blue-300 border-blue-500/50 text-xs">Flexleasing</Badge>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-primary">{fmt(s.monthly_equivalent_dkk)} kr/md</p>
                </div>
                {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </button>
            {expanded && (
                <div className="border-t border-border px-4 pb-4">
                    <table className="w-full"><tbody>
                        <SectionHeader title="Leasing" />
                        <BreakdownRow label="Månedlig ydelse (inkl. moms)" value={fmt(s.lease_monthly_payment_dkk) + " kr/md"} />
                        <BreakdownRow label="Periode" value={(s.lease_term_months ?? 0) + " mdr"} />
                        <BreakdownRow label="Samlede leasingydelser" value={fmt(s.lease_total_payments_dkk) + " kr"} />
                        {isCompany && (s.company_car_tax_total_dkk ?? 0) > 0 && (
                            <>
                                <SectionHeader title="Firmabilskat" />
                                <BreakdownRow label={"Firmabilskat (" + s.holding_period_years + " år)"} value={fmt(s.company_car_tax_total_dkk) + " kr"} />
                            </>
                        )}
                        <SectionHeader title="Samlet" />
                        <BreakdownRow label="Total ud af lommen" value={fmt(s.total_outofpocket_dkk) + " kr"} bold />
                        <BreakdownRow label="Månedlig TCO" value={fmt(s.monthly_equivalent_dkk) + " kr/md"} bold />
                    </tbody></table>
                </div>
            )}
        </div>
    )
}

function ComparisonTable({ purchaseScenarios, leaseScenarios }: {
    purchaseScenarios: TCOScenario[]
    leaseScenarios: TCOScenario[]
}) {
    const periods = [1, 2, 3]

    const getBest = (scenarios: TCOScenario[], years: number): TCOScenario | null => {
        const forPeriod = scenarios.filter((s) => s.holding_period_years === years)
        if (forPeriod.length === 0) return null
        return forPeriod.reduce((best, s) => s.monthly_equivalent_dkk < best.monthly_equivalent_dkk ? s : best)
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground"></th>
                        {periods.map((y) => (
                            <th key={y} className="px-3 py-2 text-center font-medium text-muted-foreground">{y} {y === 1 ? "år" : "år"}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {purchaseScenarios.length > 0 && (
                        <tr className="border-b border-border/50">
                            <td className="px-3 py-3 font-medium text-foreground">Køb</td>
                            {periods.map((y) => {
                                const s = getBest(purchaseScenarios, y)
                                return (
                                    <td key={y} className="px-3 py-3 text-center font-semibold text-foreground">
                                        {s ? fmt(s.monthly_equivalent_dkk) + " kr" : "—"}
                                    </td>
                                )
                            })}
                        </tr>
                    )}
                    {leaseScenarios.length > 0 && (
                        <tr className="border-b border-border/50">
                            <td className="px-3 py-3 font-medium text-foreground">Leasing</td>
                            {periods.map((y) => {
                                const s = getBest(leaseScenarios, y)
                                return (
                                    <td key={y} className="px-3 py-3 text-center font-semibold text-foreground">
                                        {s ? fmt(s.monthly_equivalent_dkk) + " kr" : "—"}
                                    </td>
                                )
                            })}
                        </tr>
                    )}
                    {purchaseScenarios.length > 0 && leaseScenarios.length > 0 && (
                        <tr>
                            <td className="px-3 py-3 font-medium text-muted-foreground">Forskel</td>
                            {periods.map((y) => {
                                const p = getBest(purchaseScenarios, y)
                                const l = getBest(leaseScenarios, y)
                                if (!p || !l) return <td key={y} className="px-3 py-3 text-center">—</td>
                                const diff = p.monthly_equivalent_dkk - l.monthly_equivalent_dkk
                                const cheaper = diff > 0 ? "lease" : "purchase"
                                const color = cheaper === "lease" ? "text-emerald-400" : "text-blue-400"
                                const label = cheaper === "lease" ? "Leasing billigere" : "Køb billigere"
                                return (
                                    <td key={y} className="px-3 py-3 text-center">
                                        <span className={`font-semibold ${color}`}>{fmt(Math.abs(diff))} kr</span>
                                        <p className={`text-xs ${color}`}>{label}</p>
                                    </td>
                                )
                            })}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

export function CarDetail({ carId, onBack }: CarDetailProps) {
    const [car, setCar] = useState<Car | null>(null)
    const [tcoData, setTcoData] = useState<TCOData | null>(null)
    const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([])
    const [tcoStatus, setTcoStatus] = useState<TcoStatus>("loading")
    const [loading, setLoading] = useState(true)
    const [imageError, setImageError] = useState(false)
    const [usageType, setUsageType] = useState<UsageToggle>("private")

    useEffect(() => {
        let cancelled = false
        async function fetchData() {
            setLoading(true); setTcoStatus("loading")
            try {
                const carRes = await fetch(`/api/cars/${carId}`)
                if (!carRes.ok) throw new Error("Car fetch failed")
                const carData = await carRes.json()
                if (cancelled) return
                const { price_history, ...carFields } = carData
                setCar(carFields as Car)
                setPriceHistory(price_history ?? [])

                const tcoRes = await fetch(`/api/cars/${carId}/tco`)
                const tcoResult: TCOData = await tcoRes.json()
                let scenarios = tcoResult.tco_scenarios ?? []
                if (scenarios.length === 0) {
                    if (cancelled) return; setTcoStatus("computing")
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
            } finally { if (!cancelled) setLoading(false) }
        }
        fetchData()
        return () => { cancelled = true }
    }, [carId])

    if (loading) return <CarDetailSkeleton onBack={onBack} />
    if (!car) return (
        <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">Bilen blev ikke fundet</p>
            <Button variant="ghost" onClick={onBack} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" />Tilbage til oversigt</Button>
        </div>
    )

    const scenarios = tcoData?.tco_scenarios ?? []
    const purchaseScenarios = scenarios.filter((s) => s.scenario_type === "purchase" && s.usage_type === usageType)
    const leaseScenarios = scenarios.filter((s) => s.scenario_type === "flexlease" && s.usage_type === usageType)
    const hasPurchase = purchaseScenarios.length > 0
    const hasLease = leaseScenarios.length > 0
    const hasComparison = hasPurchase && hasLease

    // Best purchase per period
    const purchasePeriods = hasPurchase ? [1, 2, 3, 5] : []
    const bestPurchase = purchasePeriods.map((years) => {
        const forPeriod = purchaseScenarios.filter((s) => s.holding_period_years === years)
        if (forPeriod.length === 0) return null
        return forPeriod.reduce((best, s) => s.monthly_equivalent_dkk < best.monthly_equivalent_dkk ? s : best)
    }).filter(Boolean) as TCOScenario[]

    // Best lease per period
    const bestLease = [1, 2, 3].map((years) => {
        const forPeriod = leaseScenarios.filter((s) => s.holding_period_years === years)
        if (forPeriod.length === 0) return null
        return forPeriod.reduce((best, s) => s.monthly_equivalent_dkk < best.monthly_equivalent_dkk ? s : best)
    }).filter(Boolean) as TCOScenario[]

    const allMonthly = [...purchaseScenarios, ...leaseScenarios]
        .map((s) => s.monthly_equivalent_dkk).filter((v) => v != null && isFinite(v) && v > 0)
    const lowestTco = allMonthly.length > 0 ? Math.min(...allMonthly) : null

    const priceChartData = priceHistory
        .sort((a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime())
        .map((entry) => ({ date: formatDate(entry.scraped_at), price: entry.price_amount }))

    const showPlaceholder = !car.stored_image_url || imageError
    const hasDealer = car.dealer_name && car.dealer_name.trim() !== ""
    const hasDealerPhone = car.dealer_phone && car.dealer_phone.trim() !== ""
    const hasPriceHistory = priceChartData.length > 1
    const carUrl = (car as any).url
    const isLeaseListing = (car as any).listing_type === "lease"

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />Tilbage til oversigt
                </Button>
                {carUrl && (
                    <Button variant="outline" size="sm" onClick={() => window.open(carUrl, "_blank")}>
                        <ExternalLink className="mr-2 h-4 w-4" />Se original annonce
                    </Button>
                )}
            </div>

            <div className="relative aspect-[21/9] overflow-hidden rounded-xl">
                {!showPlaceholder ? (
                    <img src={car.stored_image_url ?? undefined} alt={`${car.brand} ${car.model}`}
                        className="h-full w-full object-cover" onError={() => setImageError(true)} />
                ) : <CarPlaceholder brand={car.brand} />}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{countryFlags[car.country] || ""}</span>
                        <FuelBadge fuelType={car.fuel_type} />
                        {isLeaseListing && <Badge variant="outline" className="bg-blue-600/30 text-blue-300 border-blue-500/50">Leasing</Badge>}
                    </div>
                    <h1 className="mt-2 text-3xl font-bold text-foreground">{car.brand} {car.model}</h1>
                    <p className="text-lg text-muted-foreground">{car.variant}</p>
                    {isLeaseListing && (car as any).lease_monthly_dkk ? (
                        <p className="mt-2 text-2xl font-bold text-primary">{fmt((car as any).lease_monthly_dkk)} kr/md</p>
                    ) : (
                        <p className="mt-2 text-2xl font-bold text-primary">{fmt(car.price_amount)} {car.price_currency}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">Specifikationer</h2>
                    <div className="grid grid-cols-3 gap-3">
                        <SpecItem icon={Calendar} label="Årgang" value={String(car.first_registration_year)} />
                        <SpecItem icon={Gauge} label="Kilometertal" value={fmt(car.mileage_km) + " km"} />
                        <SpecItem icon={Fuel} label="Brændstof" value={fuelLabels[car.fuel_type] ?? car.fuel_type} />
                        <SpecItem icon={Zap} label="Effekt" value={car.power_kw ? car.power_kw + " kW" : "N/A"} />
                        <SpecItem icon={Settings2} label="Gearkasse" value={transmissionLabels[car.transmission] ?? car.transmission ?? "N/A"} />
                        <SpecItem icon={MapPin} label="Land" value={(countryFlags[car.country] || "") + " " + (countryNames[car.country] ?? car.country)} />
                    </div>
                </div>

                <Card className="border-border bg-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Totaløkonomi (TCO)</CardTitle>
                            <div className="flex rounded-lg border border-border overflow-hidden">
                                <button onClick={() => setUsageType("private")}
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${usageType === "private" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                                    Privat
                                </button>
                                <button onClick={() => setUsageType("company")}
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${usageType === "company" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                                    Erhverv
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {tcoStatus === "loading" ? (
                            <div className="space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></div>
                        ) : tcoStatus === "computing" ? (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground"><p className="text-sm">Beregner totaløkonomi…</p></div>
                        ) : tcoStatus === "ready" && lowestTco !== null ? (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-primary/10 p-4 text-center">
                                    <p className="text-xs text-muted-foreground">Laveste månedlige TCO ({usageType === "private" ? "privat" : "erhverv"})</p>
                                    <p className="text-2xl font-bold text-primary">{fmt(lowestTco)} kr/md</p>
                                </div>
                                {hasComparison && <ComparisonTable purchaseScenarios={purchaseScenarios} leaseScenarios={leaseScenarios} />}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground"><p className="text-sm">TCO kunne ikke beregnes</p></div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Purchase breakdowns */}
            {bestPurchase.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">Køb — {usageType === "private" ? "Privat" : "Erhverv"}</h2>
                    <p className="text-sm text-muted-foreground">Klik for detaljeret beregning pr. ejerperiode</p>
                    <div className="space-y-3">
                        {bestPurchase.map((s) => <PurchaseBreakdown key={s.id} scenario={s} />)}
                    </div>
                </div>
            )}

            {/* Lease breakdowns */}
            {bestLease.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">Leasing — {usageType === "private" ? "Privat" : "Erhverv"}</h2>
                    <p className="text-sm text-muted-foreground">Klik for detaljeret beregning pr. leasingperiode</p>
                    <div className="space-y-3">
                        {bestLease.map((s) => <LeaseBreakdown key={s.id} scenario={s} />)}
                    </div>
                </div>
            )}

            {hasPriceHistory && (
                <Card className="border-border bg-card">
                    <CardHeader><CardTitle className="text-lg">Prishistorik</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={priceChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} tickFormatter={(value: number) => fmt(value)} />
                                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                                        labelStyle={{ color: "hsl(var(--foreground))" }}
                                        formatter={(value) => [fmt(Number(value)) + " " + car.price_currency, "Pris"]} />
                                    <Line type="monotone" dataKey="price" name="Pris" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {hasDealer && (
                <Card className="border-border bg-card">
                    <CardHeader><CardTitle className="text-lg">Forhandler</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Building2 className="h-5 w-5 text-muted-foreground" /></div>
                                <div>
                                    <p className="font-medium text-foreground">{car.dealer_name}</p>
                                    <p className="text-sm text-muted-foreground">{car.source === "bilbasen" ? "Bilbasen" : "AutoScout24"}</p>
                                </div>
                            </div>
                            {hasDealerPhone && (
                                <Button variant="outline" onClick={() => window.open("tel:" + car.dealer_phone)}>
                                    <Phone className="h-4 w-4 mr-2" />{car.dealer_phone}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function CarDetailSkeleton({ onBack }: { onBack: () => void }) {
    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground"><ArrowLeft className="mr-2 h-4 w-4" />Tilbage til oversigt</Button>
            <Skeleton className="aspect-[21/9] rounded-xl" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="grid grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
                </div>
                <Card className="border-border bg-card"><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
            </div>
        </div>
    )
}
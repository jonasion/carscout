"use client"

import { useState } from "react"
import type { FilterState, FilterOptions } from "@/lib/types"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react"

type FilterBarProps = {
    filters: FilterState
    filterOptions: FilterOptions | null
    onFilterChange: (key: keyof FilterState, value: string) => void
    onReset: () => void
}

const fuelLabels: Record<string, string> = {
    el: "Elektrisk",
    benzin: "Benzin",
    diesel: "Diesel",
    hybrid: "Hybrid",
    phev: "Plug-in Hybrid",
}

const transmissionLabels: Record<string, string> = {
    automatic: "Automatisk",
    manual: "Manuel",
}

const countryLabels: Record<string, string> = {
    DK: "🇩🇰 Danmark",
    DE: "🇩🇪 Tyskland",
    SE: "🇸🇪 Sverige",
    NO: "🇳🇴 Norge",
    NL: "🇳🇱 Holland",
    BE: "🇧🇪 Belgien",
    FR: "🇫🇷 Frankrig",
}

const sourceLabels: Record<string, string> = {
    bilbasen: "Bilbasen",
    autoscout24: "AutoScout24",
}

const mileageSteps = [
    { value: "25000", label: "25.000 km" },
    { value: "50000", label: "50.000 km" },
    { value: "75000", label: "75.000 km" },
    { value: "100000", label: "100.000 km" },
    { value: "150000", label: "150.000 km" },
    { value: "200000", label: "200.000 km" },
    { value: "300000", label: "300.000 km" },
]

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </div>
    )
}

export function FilterBar({ filters, filterOptions, onFilterChange, onReset }: FilterBarProps) {
    const [showAdvanced, setShowAdvanced] = useState(false)

    const models = filters.brand && filters.brand !== "all"
        ? filterOptions?.modelsByBrand[filters.brand] ?? []
        : []

    const yearMin = filterOptions?.yearRange.min ?? 2000
    const yearMax = filterOptions?.yearRange.max ?? new Date().getFullYear()
    const yearOptions: number[] = []
    for (let y = yearMax; y >= yearMin; y--) {
        yearOptions.push(y)
    }

    const hasActiveFilters = Object.entries(filters).some(
        ([, v]) => v !== "" && v !== "all"
    )

    return (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            {/* ── Primary filters ── */}
            <div className="flex flex-wrap items-end gap-3">
                <LabeledField label="Mærke">
                    <Select
                        value={filters.brand}
                        onValueChange={(v) => onFilterChange("brand", v ?? "")}
                    >
                        <SelectTrigger className="w-[150px] bg-secondary">
                            <SelectValue placeholder="Alle mærker" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle mærker</SelectItem>
                            {filterOptions?.brands.map((b) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </LabeledField>

                <LabeledField label="Model">
                    <Select
                        value={filters.model}
                        onValueChange={(v) => onFilterChange("model", v ?? "")}
                        disabled={models.length === 0}
                    >
                        <SelectTrigger className="w-[150px] bg-secondary">
                            <SelectValue placeholder="Alle modeller" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle modeller</SelectItem>
                            {models.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </LabeledField>

                <LabeledField label="Årgang fra">
                    <Select
                        value={filters.min_year}
                        onValueChange={(v) => onFilterChange("min_year", v ?? "")}
                    >
                        <SelectTrigger className="w-[110px] bg-secondary">
                            <SelectValue placeholder="Fra" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Fra</SelectItem>
                            {yearOptions.map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </LabeledField>

                <LabeledField label="Årgang til">
                    <Select
                        value={filters.max_year}
                        onValueChange={(v) => onFilterChange("max_year", v ?? "")}
                    >
                        <SelectTrigger className="w-[110px] bg-secondary">
                            <SelectValue placeholder="Til" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Til</SelectItem>
                            {yearOptions.map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </LabeledField>

                <LabeledField label="Max km">
                    <Select
                        value={filters.max_mileage}
                        onValueChange={(v) => onFilterChange("max_mileage", v ?? "")}
                    >
                        <SelectTrigger className="w-[140px] bg-secondary">
                            <SelectValue placeholder="Alle" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle</SelectItem>
                            {mileageSteps.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </LabeledField>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <LabeledField label="Pris fra">
                    <Input
                        type="number"
                        placeholder="Min DKK"
                        value={filters.min_price}
                        onChange={(e) => onFilterChange("min_price", e.target.value)}
                        className="w-[130px] bg-secondary"
                    />
                </LabeledField>

                <LabeledField label="Pris til">
                    <Input
                        type="number"
                        placeholder="Max DKK"
                        value={filters.max_price}
                        onChange={(e) => onFilterChange("max_price", e.target.value)}
                        className="w-[130px] bg-secondary"
                    />
                </LabeledField>

                <LabeledField label="Brændstof">
                    <Select
                        value={filters.fuel_type}
                        onValueChange={(v) => onFilterChange("fuel_type", v ?? "")}
                    >
                        <SelectTrigger className="w-[150px] bg-secondary">
                            <SelectValue placeholder="Alle typer" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle typer</SelectItem>
                            {filterOptions?.fuelTypes.map((f) => (
                                <SelectItem key={f} value={f}>
                                    {fuelLabels[f] ?? f}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </LabeledField>
            </div>

            {/* ── Toggle + reset row ── */}
            <div className="flex items-center justify-between pt-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-muted-foreground hover:text-foreground"
                >
                    {showAdvanced ? (
                        <ChevronUp className="mr-1 h-4 w-4" />
                    ) : (
                        <ChevronDown className="mr-1 h-4 w-4" />
                    )}
                    Flere filtre
                </Button>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <RotateCcw className="mr-1 h-4 w-4" />
                        Nulstil filtre
                    </Button>
                )}
            </div>

            {/* ── Advanced filters ── */}
            {showAdvanced && (
                <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
                    <LabeledField label="Gearkasse">
                        <Select
                            value={filters.transmission}
                            onValueChange={(v) => onFilterChange("transmission", v ?? "")}
                        >
                            <SelectTrigger className="w-[150px] bg-secondary">
                                <SelectValue placeholder="Alle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                {filterOptions?.transmissions.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {transmissionLabels[t] ?? t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </LabeledField>

                    <LabeledField label="Min effekt (kW)">
                        <Input
                            type="number"
                            placeholder="kW"
                            value={filters.min_power_kw}
                            onChange={(e) => onFilterChange("min_power_kw", e.target.value)}
                            className="w-[110px] bg-secondary"
                        />
                    </LabeledField>

                    <LabeledField label="Max CO₂ (g/km)">
                        <Input
                            type="number"
                            placeholder="g/km"
                            value={filters.max_co2}
                            onChange={(e) => onFilterChange("max_co2", e.target.value)}
                            className="w-[110px] bg-secondary"
                        />
                    </LabeledField>

                    <LabeledField label="Land">
                        <Select
                            value={filters.country}
                            onValueChange={(v) => onFilterChange("country", v ?? "")}
                        >
                            <SelectTrigger className="w-[150px] bg-secondary">
                                <SelectValue placeholder="Alle lande" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle lande</SelectItem>
                                {filterOptions?.countries.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {countryLabels[c] ?? c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </LabeledField>

                    <LabeledField label="Kilde">
                        <Select
                            value={filters.source}
                            onValueChange={(v) => onFilterChange("source", v ?? "")}
                        >
                            <SelectTrigger className="w-[150px] bg-secondary">
                                <SelectValue placeholder="Alle kilder" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle kilder</SelectItem>
                                {filterOptions?.sources.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {sourceLabels[s] ?? s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </LabeledField>
                </div>
            )}
        </div>
    )
}
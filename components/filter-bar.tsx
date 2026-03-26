"use client"

import type { FilterState } from "@/lib/types"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Fuel, Globe, MapPin, DollarSign } from "lucide-react"

type FilterBarProps = {
    filters: FilterState
    onFilterChange: (key: keyof FilterState, value: string) => void
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                <Select
                    value={filters.fuel_type}
                    onValueChange={(value) => onFilterChange("fuel_type", value)}
                >
                    <SelectTrigger className="w-[130px] bg-secondary">
                        <SelectValue placeholder="Fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All fuels</SelectItem>
                        <SelectItem value="el">Electric</SelectItem>
                        <SelectItem value="benzin">Benzin</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Select
                    value={filters.source}
                    onValueChange={(value) => onFilterChange("source", value)}
                >
                    <SelectTrigger className="w-[150px] bg-secondary">
                        <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All sources</SelectItem>
                        <SelectItem value="bilbasen">Bilbasen</SelectItem>
                        <SelectItem value="autoscout24">AutoScout24</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Select
                    value={filters.country}
                    onValueChange={(value) => onFilterChange("country", value)}
                >
                    <SelectTrigger className="w-[130px] bg-secondary">
                        <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All countries</SelectItem>
                        <SelectItem value="DK">Denmark 🇩🇰</SelectItem>
                        <SelectItem value="DE">Germany 🇩🇪</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                    type="number"
                    placeholder="Min DKK"
                    value={filters.min_price}
                    onChange={(e) => onFilterChange("min_price", e.target.value)}
                    className="w-[120px] bg-secondary"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                    type="number"
                    placeholder="Max DKK"
                    value={filters.max_price}
                    onChange={(e) => onFilterChange("max_price", e.target.value)}
                    className="w-[120px] bg-secondary"
                />
            </div>
        </div>
    )
}

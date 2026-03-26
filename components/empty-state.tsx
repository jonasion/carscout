"use client"

import { Car } from "lucide-react"

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Car className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No cars found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters to see more results
            </p>
        </div>
    )
}

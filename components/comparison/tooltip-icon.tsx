'use client'

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

interface TooltipIconProps {
    text: string
}

export function TooltipIcon({ text }: TooltipIconProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                type="button"
                className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setOpen(!open)}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                <Info className="h-3.5 w-3.5" />
            </button>
            {open && (
                <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
                    {text}
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
                </div>
            )}
        </div>
    )
}
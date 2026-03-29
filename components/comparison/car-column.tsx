'use client'

import type { CarComparisonResult, Origin } from '@/lib/comparison/types'
import { TooltipIcon } from './tooltip-icon'
import { useLocale } from '@/lib/i18n/useLocale'
import { X } from 'lucide-react'

interface CarColumnProps {
    result: CarComparisonResult
    isLowestPurchase: boolean
    isLowestFlexlease: boolean
    onRemove: () => void
}

function fmt(num: number | null | undefined): string {
    if (num == null || !isFinite(num)) return '—'
    return new Intl.NumberFormat('da-DK').format(Math.round(num))
}

const countryFlags: Record<string, string> = {
    DK: '🇩🇰', DE: '🇩🇪', SE: '🇸🇪', NO: '🇳🇴',
    NL: '🇳🇱', BE: '🇧🇪', FR: '🇫🇷',
}

const originLabels: Record<Origin, { da: string; en: string }> = {
    dk_registered: { da: 'DK registreret', en: 'DK registered' },
    dk_exlease: { da: 'DK ex-leasing', en: 'DK ex-lease' },
    de_import: { da: 'DE import (brugtmoms)', en: 'DE import (margin scheme)' },
    de_import_exlease: { da: 'DE import (ex-leasing)', en: 'DE import (ex-lease)' },
}

function Row({ label, tooltip, children, highlight, bold, separator }: {
    label: string
    tooltip?: string
    children: React.ReactNode
    highlight?: boolean
    bold?: boolean
    separator?: boolean
}) {
    return (
        <div className={`flex items-center justify-between py-1.5 px-2 text-sm ${separator ? 'border-t border-border mt-1 pt-2' : ''
            } ${highlight ? 'bg-primary/10 rounded' : ''}`}>
            <span className={`text-muted-foreground flex items-center ${bold ? 'font-medium text-foreground' : ''}`}>
                {label}
                {tooltip && <TooltipIcon text={tooltip} />}
            </span>
            <span className={`text-foreground tabular-nums ${bold ? 'font-semibold' : ''}`}>
                {children}
            </span>
        </div>
    )
}

function PurchaseSection({ result }: { result: CarComparisonResult }) {
    const { locale, t } = useLocale()
    // Show the first origin's breakdown (for DE cars, show de_import first)
    const origins = result.origins

    return (
        <div className="space-y-1">
            {origins.map((origin) => {
                const p = result.purchase[origin]
                if (!p) return null
                const label = locale === 'en' ? originLabels[origin].en : originLabels[origin].da

                return (
                    <div key={origin} className="space-y-0">
                        <div className="px-2 py-1.5 text-xs font-medium text-primary uppercase tracking-wide">
                            {label}
                            <TooltipIcon text={t(`tooltip.${origin.replace(/-/g, '_')}`)} />
                        </div>

                        <Row label="Markedsværdi ex. afgift" tooltip={locale === 'en' ? 'Base value before tax and VAT' : 'Bilens grundpris før afgift og moms'}>
                            {fmt(p.baseValue)} kr
                        </Row>
                        <Row label="Moms 25%" tooltip={t('tooltip.dk_exlease')}>
                            {fmt(p.momsAmount)} kr
                        </Row>
                        <Row label="Afgiftspligtig værdi" tooltip={t('tooltip.afgiftspligtig_vaerdi')}>
                            {fmt(p.afgiftspligtigVaerdi)} kr
                        </Row>
                        <Row label="Registreringsafgift" tooltip={t('tooltip.fuld_registreringsafgift')}>
                            {fmt(p.registrationTax)} kr
                        </Row>
                        {p.evDeductionApplied > 0 && (
                            <Row label="EV fradrag" tooltip={t('tooltip.ev_fradrag')}>
                                -{fmt(p.evDeductionApplied)} kr
                            </Row>
                        )}
                        {p.importCosts > 0 && (
                            <Row label="Importomkostninger">
                                {fmt(p.importCosts)} kr
                            </Row>
                        )}
                        <Row label="Totalpris på plader" tooltip={t('tooltip.totalpris_paa_plader')} bold separator>
                            {fmt(p.totalPriceOnPlates)} kr
                        </Row>

                        <Row label="Udbetaling" tooltip={t('tooltip.foerstegangsydelse')}>
                            {fmt(p.downPayment)} kr
                        </Row>
                        <Row label="Banklån">
                            {fmt(p.bankLoan)} kr
                        </Row>
                        <Row label="Renteomkostninger">
                            {fmt(p.interestCost)} kr
                        </Row>
                        <Row label="Nedskrivning" tooltip={t('tooltip.nedskrivning')}>
                            {fmt(p.depreciation)} kr
                        </Row>
                        <Row label="Oprettelsesgebyr">
                            {fmt(p.establishmentFee)} kr
                        </Row>

                        <Row label="TCO total" bold separator highlight>
                            {fmt(p.tcoTotal)} kr
                        </Row>
                        <Row label="≈ månedlig" bold>
                            {fmt(p.monthlyEquivalent)} kr/md
                        </Row>

                        {origins.length > 1 && <div className="border-b border-border/50 my-2" />}
                    </div>
                )
            })}
        </div>
    )
}

function FlexleaseSection({ result }: { result: CarComparisonResult }) {
    const { locale, t } = useLocale()
    const f = result.flexlease

    // Detect rate transitions
    const rates = new Set(f.taxBracketBreakdown.map(m => m.rate))
    const hasTransition = rates.size > 1
    const ageLabel = `${f.vehicleAgeMonths} mdr.`
    const bracketLabel = hasTransition
        ? 'Skifter sats i perioden'
        : `${(f.taxBracketBreakdown[0]?.rate ?? 0) * 100}% sats`

    return (
        <div className="space-y-0">
            <div className="px-2 py-1.5 text-xs font-medium text-primary uppercase tracking-wide">
                Flexleasing (privat)
            </div>

            <Row label="Markedsværdi ex. afgift">
                {fmt(f.baseValue)} kr
            </Row>
            <Row label="Fuld registreringsafgift" tooltip={t('tooltip.fuld_registreringsafgift')}>
                {fmt(f.fullRegistrationTax)} kr
            </Row>
            <Row label="Alder">
                {ageLabel} — {bracketLabel}
            </Row>

            <div className="px-2 py-1.5 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                Månedlig ydelse (ex. moms)
            </div>

            <Row label="Forholdsmæssig afgift/md" tooltip={t('tooltip.forholdsmassig_afgift')}>
                {fmt(hasTransition ? f.monthlyFlexTaxAvg : f.monthlyFlexTax)} kr
                {hasTransition && <span className="text-xs text-muted-foreground ml-1">(gns.)</span>}
            </Row>
            <Row label="Rente af restafgift/md">
                {fmt(f.monthlyStateInterest)} kr
            </Row>
            <Row label="Finansieringsrente/md">
                {fmt(f.monthlyFinanceInterest)} kr
            </Row>
            <Row label="Administrationsgebyr/md">
                {fmt(f.monthlyAdminFee)} kr
            </Row>
            <Row label="Total ex. moms" bold separator>
                {fmt(f.totalMonthlyExMoms)} kr
            </Row>
            <Row label="Total inkl. moms" bold>
                {fmt(f.totalMonthlyInclMoms)} kr/md
            </Row>

            {f.listedMonthlyPayment && (
                <Row label="Annonceret ydelse">
                    {fmt(f.listedMonthlyPayment)} kr/md
                </Row>
            )}

            <div className="px-2 py-1.5 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                Periodeomkostninger
            </div>

            <Row label="Førstegangsydelse" tooltip={t('tooltip.foerstegangsydelse')}>
                {fmt(f.downPayment)} kr
            </Row>
            <Row label="Oprettelse inkl. moms">
                {fmt(f.establishmentFeeInclMoms)} kr
            </Row>
            <Row label="Nedskrivning inkl. moms" tooltip={t('tooltip.nedskrivning')}>
                {fmt(f.depreciationInclMoms)} kr
            </Row>

            <Row label="TCO total" bold separator highlight>
                {fmt(f.tcoTotal)} kr
            </Row>
            <Row label="≈ månedlig" bold>
                {fmt(f.monthlyEquivalent)} kr/md
            </Row>
        </div>
    )
}

export function CarColumn({ result, isLowestPurchase, isLowestFlexlease, onRemove }: CarColumnProps) {
    const car = result.car
    const flag = countryFlags[car.country] || ''

    // Best purchase (lowest monthly across all origins)
    const bestPurchaseMonthly = Math.min(
        ...result.origins.map(o => result.purchase[o]?.monthlyEquivalent ?? Infinity)
    )

    return (
        <div className="min-w-[320px] border border-border rounded-xl bg-card overflow-hidden">
            {/* Car header */}
            <div className="relative">
                {car.stored_image_url ? (
                    <img
                        src={car.stored_image_url}
                        alt={`${car.brand} ${car.model}`}
                        className="h-40 w-full object-cover"
                    />
                ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-secondary">
                        <span className="text-4xl font-bold text-muted-foreground/50">
                            {car.brand?.charAt(0) ?? '?'}
                        </span>
                    </div>
                )}
                <button
                    onClick={onRemove}
                    className="absolute top-2 right-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-foreground">{car.brand} {car.model}</h3>
                <p className="text-xs text-muted-foreground">{car.variant}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{car.first_registration_year}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <span>{fmt(car.mileage_km)} km</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <span>{flag} {car.country}</span>
                </div>
                <div className="mt-1.5">
                    <span className="text-sm font-semibold text-foreground">{fmt(result.priceDkk)} DKK</span>
                    {car.price_currency === 'EUR' && (
                        <span className="text-xs text-muted-foreground ml-1">({fmt(car.price_amount)} EUR)</span>
                    )}
                </div>
            </div>

            {/* TCO Summary */}
            <div className="grid grid-cols-2 border-b border-border">
                <div className={`p-3 text-center ${isLowestPurchase ? 'bg-emerald-500/10' : ''}`}>
                    <p className="text-xs text-muted-foreground">Køb</p>
                    <p className={`text-lg font-bold ${isLowestPurchase ? 'text-emerald-400' : 'text-foreground'}`}>
                        {fmt(bestPurchaseMonthly)}
                    </p>
                    <p className="text-xs text-muted-foreground">kr/md</p>
                </div>
                <div className={`p-3 text-center border-l border-border ${isLowestFlexlease ? 'bg-emerald-500/10' : ''}`}>
                    <p className="text-xs text-muted-foreground">Flexleasing</p>
                    <p className={`text-lg font-bold ${isLowestFlexlease ? 'text-emerald-400' : 'text-foreground'}`}>
                        {fmt(result.flexlease.monthlyEquivalent)}
                    </p>
                    <p className="text-xs text-muted-foreground">kr/md</p>
                </div>
            </div>

            {/* Detailed breakdowns */}
            <div className="divide-y divide-border">
                <div className="py-2">
                    <PurchaseSection result={result} />
                </div>
                <div className="py-2">
                    <FlexleaseSection result={result} />
                </div>
            </div>
        </div>
    )
}
'use client'

import type { CarComparisonResult, Origin } from '@/lib/comparison/types'
import { TooltipIcon } from './tooltip-icon'
import { useLocale } from '@/lib/i18n/useLocale'
import { X } from 'lucide-react'

interface CarColumnProps {
    result: CarComparisonResult
    isLowestPurchase: boolean
    isLowestFlexlease: boolean
    isLowestCompanyFlex: boolean
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

function Row({ label, tooltip, value, highlight, bold, separator, na }: {
    label: string
    tooltip?: string
    value: string
    highlight?: boolean
    bold?: boolean
    separator?: boolean
    na?: boolean
}) {
    return (
        <div className={`flex items-center justify-between py-1.5 px-2 text-sm ${separator ? 'border-t border-border mt-1 pt-2' : ''
            } ${highlight ? 'bg-primary/10 rounded' : ''}`}>
            <span className={`text-muted-foreground flex items-center ${bold ? 'font-medium text-foreground' : ''}`}>
                {label}
                {tooltip && <TooltipIcon text={tooltip} />}
            </span>
            {na ? (
                <span className="text-muted-foreground/50 text-xs italic">Ikke relevant</span>
            ) : (
                <span className={`text-foreground tabular-nums ${bold ? 'font-semibold' : ''}`}>
                    {value}
                </span>
            )}
        </div>
    )
}

function PurchaseSection({ result }: { result: CarComparisonResult }) {
    const { locale, t } = useLocale()
    const origins = result.origins

    return (
        <div className="space-y-1">
            {origins.map((origin) => {
                const p = result.purchase[origin]
                if (!p) return null
                const label = locale === 'en' ? originLabels[origin].en : originLabels[origin].da
                const showMoms = origin === 'dk_exlease' || origin === 'de_import_exlease'
                const showImport = origin === 'de_import' || origin === 'de_import_exlease'
                const showRegTax = origin !== 'dk_registered'

                return (
                    <div key={origin} className="space-y-0">
                        <div className="px-2 py-1.5 text-xs font-medium text-primary uppercase tracking-wide">
                            {label}
                            <TooltipIcon text={t(`tooltip.${origin.replace(/-/g, '_')}`)} />
                        </div>

                        <Row label="Markedsværdi ex. afgift" value={`${fmt(p.baseValue)} kr`} />
                        <Row label="Moms 25%" tooltip={t('tooltip.dk_exlease')} value={`${fmt(p.momsAmount)} kr`} na={!showMoms} />
                        <Row label="Afgiftspligtig værdi" tooltip={t('tooltip.afgiftspligtig_vaerdi')} value={`${fmt(p.afgiftspligtigVaerdi)} kr`} na={!showRegTax} />
                        <Row label="Registreringsafgift" tooltip={t('tooltip.fuld_registreringsafgift')} value={`${fmt(p.registrationTax)} kr`} na={!showRegTax} />
                        {p.evDeductionApplied > 0 && (
                            <Row label="EV fradrag" tooltip={t('tooltip.ev_fradrag')} value={`-${fmt(p.evDeductionApplied)} kr`} />
                        )}
                        <Row label="Importomkostninger" value={`${fmt(p.importCosts)} kr`} na={!showImport} />
                        <Row label="Totalpris på plader" tooltip={t('tooltip.totalpris_paa_plader')} value={`${fmt(p.totalPriceOnPlates)} kr`} bold separator />

                        <Row label="Udbetaling" value={`${fmt(p.downPayment)} kr`} />
                        <Row label="Banklån" value={`${fmt(p.bankLoan)} kr`} />
                        <Row label="Renteomkostninger" value={`${fmt(p.interestCost)} kr`} />
                        <Row label="Nedskrivning" tooltip={t('tooltip.nedskrivning')} value={`${fmt(p.depreciation)} kr`} />
                        <Row label="Oprettelsesgebyr" value={`${fmt(p.establishmentFee)} kr`} />

                        <Row label="TCO total" value={`${fmt(p.tcoTotal)} kr`} bold separator highlight />
                        <Row label="≈ månedlig" value={`${fmt(p.monthlyEquivalent)} kr/md`} bold />

                        {origins.length > 1 && <div className="border-b border-border/50 my-2" />}
                    </div>
                )
            })}
        </div>
    )
}

function FlexleaseSection({ result }: { result: CarComparisonResult }) {
    const { t } = useLocale()
    const f = result.flexlease

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

            <Row label="Markedsværdi ex. afgift" value={`${fmt(f.baseValue)} kr`} />
            <Row label="Fuld registreringsafgift" tooltip={t('tooltip.fuld_registreringsafgift')} value={`${fmt(f.fullRegistrationTax)} kr`} />
            <Row label="Alder" value={`${ageLabel} — ${bracketLabel}`} />

            <div className="px-2 py-1.5 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                Månedlig ydelse (ex. moms)
            </div>

            <Row label="Forholdsmæssig afgift/md" tooltip={t('tooltip.forholdsmassig_afgift')}
                value={`${fmt(hasTransition ? f.monthlyFlexTaxAvg : f.monthlyFlexTax)} kr${hasTransition ? ' (gns.)' : ''}`} />
            <Row label="Rente af restafgift/md" value={`${fmt(f.monthlyStateInterest)} kr`} />
            <Row label="Finansieringsrente/md" value={`${fmt(f.monthlyFinanceInterest)} kr`} />
            <Row label="Administrationsgebyr/md" value={`${fmt(f.monthlyAdminFee)} kr`} />
            <Row label="Total ex. moms" value={`${fmt(f.totalMonthlyExMoms)} kr`} bold separator />
            <Row label="Total inkl. moms" value={`${fmt(f.totalMonthlyInclMoms)} kr/md`} bold />

            {f.listedMonthlyPayment && (
                <Row label="Annonceret ydelse" value={`${fmt(f.listedMonthlyPayment)} kr/md`} />
            )}

            <div className="px-2 py-1.5 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                Periodeomkostninger
            </div>

            <Row label="Førstegangsydelse" tooltip={t('tooltip.foerstegangsydelse')} value={`${fmt(f.downPayment)} kr`} />
            <Row label="Oprettelse inkl. moms" value={`${fmt(f.establishmentFeeInclMoms)} kr`} />
            <Row label="Nedskrivning inkl. moms" tooltip={t('tooltip.nedskrivning')} value={`${fmt(f.depreciationInclMoms)} kr`} />

            <Row label="TCO total" value={`${fmt(f.tcoTotal)} kr`} bold separator highlight />
            <Row label="≈ månedlig" value={`${fmt(f.monthlyEquivalent)} kr/md`} bold />
        </div>
    )
}

function CompanyFlexleaseSection({ result }: { result: CarComparisonResult }) {
    const { t } = useLocale()
    const c = result.companyFlexlease

    return (
        <div className="space-y-0">
            <div className="px-2 py-1.5 text-xs font-medium text-primary uppercase tracking-wide">
                Erhvervsleasing
            </div>

            {/* Company cost */}
            <div className="px-2 py-1.5 mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                Virksomhedens omkostning
            </div>

            <Row label="Forholdsmæssig afgift/md" tooltip={t('tooltip.forholdsmassig_afgift')} value={`${fmt(c.monthlyFlexTax)} kr`} />
            <Row label="Rente af restafgift/md" value={`${fmt(c.monthlyStateInterest)} kr`} />
            <Row label="Finansieringsrente/md" value={`${fmt(c.monthlyFinanceInterest)} kr`} />
            <Row label="Administrationsgebyr/md" value={`${fmt(c.monthlyAdminFee)} kr`} />
            <Row label="Månedlig ydelse ex. moms" value={`${fmt(c.companyCostMonthlyExMoms)} kr/md`} bold separator />
            <Row label="Oprettelse ex. moms" value={`${fmt(c.establishmentFeeExMoms)} kr`} />

            {/* Employee taxation */}
            <div className="px-2 py-1.5 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                Medarbejderens nettopris
            </div>

            <Row label="Beskatningsgrundlag" tooltip={t('tooltip.beskatningsgrundlag')} value={`${fmt(c.beskatningsgrundlag)} kr`} />
            <Row label="Årlig skattepligtig fordel" value={`${fmt(c.annualTaxableBenefit)} kr`} />
            <Row label="Miljøtillæg" tooltip={t('tooltip.miljoe_tillaeg')} value={`${fmt(c.miljoeTillaeg)} kr`} />
            <Row label="Månedlig beskatning" value={`${fmt(c.monthlyTaxableBenefit)} kr`} bold separator />
            <Row label={`Nettopris (${Math.round(c.marginalTaxRate * 100)}% skat)`} value={`${fmt(c.employeeNetCostMonthly)} kr/md`} bold highlight />
        </div>
    )
}

export function CarColumn({ result, isLowestPurchase, isLowestFlexlease, isLowestCompanyFlex, onRemove }: CarColumnProps) {
    const car = result.car
    const flag = countryFlags[car.country] || ''

    const bestPurchaseMonthly = Math.min(
        ...result.origins.map(o => result.purchase[o]?.monthlyEquivalent ?? Infinity)
    )

    return (
        <div className="min-w-[320px] border border-border rounded-xl bg-card overflow-hidden">
            {/* Car header */}
            <div className="relative">
                {car.stored_image_url ? (
                    <img src={car.stored_image_url} alt={`${car.brand} ${car.model}`} className="h-40 w-full object-cover" />
                ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-secondary">
                        <span className="text-4xl font-bold text-muted-foreground/50">{car.brand?.charAt(0) ?? '?'}</span>
                    </div>
                )}
                <button onClick={onRemove} className="absolute top-2 right-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground transition-colors">
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

            {/* TCO Summary — 3 columns */}
            <div className="grid grid-cols-3 border-b border-border">
                <div className={`p-2 text-center ${isLowestPurchase ? 'bg-emerald-500/10' : ''}`}>
                    <p className="text-[10px] text-muted-foreground">Køb</p>
                    <p className={`text-base font-bold ${isLowestPurchase ? 'text-emerald-400' : 'text-foreground'}`}>{fmt(bestPurchaseMonthly)}</p>
                    <p className="text-[10px] text-muted-foreground">kr/md</p>
                </div>
                <div className={`p-2 text-center border-l border-border ${isLowestFlexlease ? 'bg-emerald-500/10' : ''}`}>
                    <p className="text-[10px] text-muted-foreground">Privat flex</p>
                    <p className={`text-base font-bold ${isLowestFlexlease ? 'text-emerald-400' : 'text-foreground'}`}>{fmt(result.flexlease.monthlyEquivalent)}</p>
                    <p className="text-[10px] text-muted-foreground">kr/md</p>
                </div>
                <div className={`p-2 text-center border-l border-border ${isLowestCompanyFlex ? 'bg-emerald-500/10' : ''}`}>
                    <p className="text-[10px] text-muted-foreground">Erhverv flex</p>
                    <p className={`text-base font-bold ${isLowestCompanyFlex ? 'text-emerald-400' : 'text-foreground'}`}>{fmt(result.companyFlexlease.employeeNetCostMonthly)}</p>
                    <p className="text-[10px] text-muted-foreground">kr/md netto</p>
                </div>
            </div>

            {/* Detailed breakdowns */}
            <div className="divide-y divide-border">
                <div className="py-2"><PurchaseSection result={result} /></div>
                <div className="py-2"><FlexleaseSection result={result} /></div>
                <div className="py-2"><CompanyFlexleaseSection result={result} /></div>
            </div>
        </div>
    )
}
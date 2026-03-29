'use client'

import { useState } from 'react'
import type { CarComparisonResult, Origin } from '@/lib/comparison/types'
import { TooltipIcon } from './tooltip-icon'
import { useLocale } from '@/lib/i18n/useLocale'
import { X, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

interface CarColumnProps {
    result: CarComparisonResult
    isLowestPurchase: boolean
    isLowestFlexlease: boolean
    isLowestCompanyFlex: boolean
    bankRate: number
    onRemove: () => void
}

function fmt(num: number | null | undefined): string {
    if (num == null || !isFinite(num)) return '—'
    return new Intl.NumberFormat('da-DK').format(Math.round(num))
}

function pct(num: number): string {
    return `${num.toFixed(1)}%`
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

const originShortLabels: Record<Origin, string> = {
    dk_registered: 'DK reg.',
    dk_exlease: 'DK ex-lease',
    de_import: 'Brugtmoms',
    de_import_exlease: 'Ex-lease',
}

function Row({ label, tooltip, value, highlight, bold, separator, na }: {
    label: string; tooltip?: string; value: string; highlight?: boolean; bold?: boolean; separator?: boolean; na?: boolean
}) {
    return (
        <div className={`flex items-center justify-between py-1.5 px-2 text-sm ${separator ? 'border-t border-border mt-1 pt-2' : ''} ${highlight ? 'bg-primary/10 rounded' : ''}`}>
            <span className={`text-muted-foreground flex items-center ${bold ? 'font-medium text-foreground' : ''}`}>
                {label}{tooltip && <TooltipIcon text={tooltip} />}
            </span>
            {na ? (
                <span className="text-muted-foreground/50 text-xs italic">Ikke relevant</span>
            ) : (
                <span className={`text-foreground tabular-nums ${bold ? 'font-semibold' : ''}`}>{value}</span>
            )}
        </div>
    )
}

function Accordion({ title, defaultOpen, children }: {
    title: string; defaultOpen?: boolean; children: React.ReactNode
}) {
    const [open, setOpen] = useState(defaultOpen ?? false)
    return (
        <div>
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <span>{title}</span>
                {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {open && <div>{children}</div>}
        </div>
    )
}

function InsightNote({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-1.5 px-2 py-1.5 mx-2 mb-1 rounded bg-amber-500/10 text-[11px] text-amber-300 leading-tight">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{text}</span>
        </div>
    )
}

function PurchaseSection({ result, bankRate }: {
    result: CarComparisonResult; bankRate: number
}) {
    const { locale, t } = useLocale()
    const origins = result.origins
    const leaseTermMonths = result.flexlease.leaseTermMonths

    return (
        <div className="space-y-1">
            {origins.map((origin) => {
                const p = result.purchase[origin]
                if (!p) return null
                const label = locale === 'en' ? originLabels[origin].en : originLabels[origin].da
                const showMoms = origin === 'dk_exlease' || origin === 'de_import_exlease'
                const showImport = origin === 'de_import' || origin === 'de_import_exlease'
                const showRegTax = origin !== 'dk_registered'
                const isBest = origin === result.bestPurchaseOrigin

                return (
                    <div key={origin} className="space-y-0">
                        <div className="px-2 py-1.5 text-xs font-medium text-primary uppercase tracking-wide flex items-center gap-1">
                            {label}
                            {isBest && origins.length > 1 && <span className="text-[9px] text-emerald-400 font-normal">(billigst)</span>}
                            <TooltipIcon text={t(`tooltip.${origin.replace(/-/g, '_')}`)} />
                        </div>

                        <Row label="Totalpris på plader" tooltip={t('tooltip.totalpris_paa_plader')} value={`${fmt(p.totalPriceOnPlates)} kr`} bold />
                        <Row label={`TCO ${leaseTermMonths} mdr`} value={`${fmt(p.tcoTotal)} kr`} bold separator highlight />
                        <Row label="≈ månedlig" value={`${fmt(p.monthlyEquivalent)} kr/md`} bold />

                        <Accordion title="Se beregningsdetaljer">
                            <Row label="Markedsværdi ex. afgift" value={`${fmt(p.baseValue)} kr`} />
                            <Row label="Moms 25%" tooltip={t('tooltip.dk_exlease')} value={`${fmt(p.momsAmount)} kr`} na={!showMoms} />
                            <Row label="Afgiftspligtig værdi" tooltip={t('tooltip.afgiftspligtig_vaerdi')} value={`${fmt(p.afgiftspligtigVaerdi)} kr`} na={!showRegTax} />
                            <Row label="Registreringsafgift" tooltip={t('tooltip.fuld_registreringsafgift')} value={`${fmt(p.registrationTax)} kr`} na={!showRegTax} />
                            {p.evDeductionApplied > 0 && (
                                <Row label="EV fradrag" tooltip={`${t('tooltip.ev_fradrag')} (Allerede fratrukket i afgiften ovenfor)`} value={`${fmt(p.evDeductionApplied)} kr (inkl. i afgift)`} />
                            )}
                            <Row label="Importomkostninger" value={`${fmt(p.importCosts)} kr`} na={!showImport} />
                            <div className="px-2 py-1 mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                                Finansiering (lån: {p.loanTermMonths} mdr)
                            </div>
                            <Row label="Udbetaling" value={`${fmt(p.downPayment)} kr`} />
                            <Row label="Banklån" value={`${fmt(p.bankLoan)} kr`} />
                            <Row label={`Renteomkostninger (${pct(bankRate)})`} value={`${fmt(p.interestCost)} kr`} />
                            <Row label={`Nedskrivning (${pct(p.depreciationPct)})`}
                                tooltip={`${t('tooltip.nedskrivning')} Restværdi: ${fmt(p.restvaerdi)} kr`}
                                value={`${fmt(p.depreciation)} kr`} />
                            <Row label="Oprettelsesgebyr" value={`${fmt(p.establishmentFee)} kr`} />
                        </Accordion>

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
                Flexleasing (privat) — {f.leaseTermMonths} mdr
            </div>

            <Row label="Månedlig inkl. moms" value={`${fmt(f.totalMonthlyInclMoms)} kr/md`} bold />
            {f.listedMonthlyPayment && (
                <Row label="Annonceret ydelse" value={`${fmt(f.listedMonthlyPayment)} kr/md`} />
            )}
            <Row label={`Førstegangsydelse${f.autoMatched ? ' (auto)' : ''}`} tooltip={f.autoMatched ? 'Automatisk sat lig forventet nedskrivning' : undefined} value={`${fmt(f.downPayment)} kr`} />
            {f.downPaymentSurplus > 0 && (
                <Row label="Heraf refunderbart overskud" value={`${fmt(f.downPaymentSurplus)} kr`} />
            )}
            <Row label={`Restværdi (${pct(100 - f.depreciationPct)})`}
                tooltip="Forventet værdi ved leasingens udløb. Hvis markedsværdien er lavere, bærer du risikoen."
                value={`${fmt(f.restvaerdiInclMoms)} kr`} />
            <Row label={`TCO ${f.leaseTermMonths} mdr`} value={`${fmt(f.tcoTotal)} kr`} bold separator highlight />
            <Row label="≈ månedlig" value={`${fmt(f.monthlyEquivalent)} kr/md`} bold />

            <Accordion title="Se beregningsdetaljer">
                <Row label="Markedsværdi ex. afgift" value={`${fmt(f.baseValue)} kr`} />
                <Row label="Fuld registreringsafgift" tooltip={t('tooltip.fuld_registreringsafgift')} value={`${fmt(f.fullRegistrationTax)} kr`} />
                <Row label="Alder" value={`${ageLabel} — ${bracketLabel}`} />

                <div className="px-2 py-1 mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                    Månedlig ydelse (ex. moms)
                </div>
                <Row label="Forholdsmæssig afgift/md" tooltip={t('tooltip.forholdsmassig_afgift')}
                    value={`${fmt(hasTransition ? f.monthlyFlexTaxAvg : f.monthlyFlexTax)} kr${hasTransition ? ' (gns.)' : ''}`} />
                <Row label="Rente af restafgift/md" value={`${fmt(f.monthlyStateInterest)} kr`} />
                <Row label="Finansieringsrente/md" value={`${fmt(f.monthlyFinanceInterest)} kr`} />
                <Row label="Administrationsgebyr/md" value={`${fmt(f.monthlyAdminFee)} kr`} />
                <Row label="Total ex. moms" value={`${fmt(f.totalMonthlyExMoms)} kr`} bold separator />

                <div className="px-2 py-1 mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                    Periodeomkostninger
                </div>
                <Row label="Oprettelse inkl. moms" value={`${fmt(f.establishmentFeeInclMoms)} kr`} />
                <Row label={`Nedskrivning inkl. moms (${pct(f.depreciationPct)})`}
                    tooltip={`${t('tooltip.nedskrivning')} Restværdi: ${fmt(f.restvaerdiInclMoms)} kr`}
                    value={`${fmt(f.depreciationInclMoms)} kr`} />
            </Accordion>
        </div>
    )
}

function CompanyFlexleaseSection({ result }: { result: CarComparisonResult }) {
    const { t } = useLocale()
    const c = result.companyFlexlease

    const ageNote = c.vehicleAgeMonths > 36
        ? 'Baseret på aktuel markedsværdi (bil >36 mdr.)'
        : 'Baseret på nypris (bil ≤36 mdr.)'

    return (
        <div className="space-y-0">
            <div className="px-2 py-1.5 text-xs font-medium text-primary uppercase tracking-wide">
                Erhvervsleasing — {c.leaseTermMonths} mdr
            </div>

            <Row label="Virksomhedens ydelse ex. moms" value={`${fmt(c.companyCostMonthlyExMoms)} kr/md`} bold />
            <Row label="Virksomhedens TCO inkl. nedskrivning"
                tooltip="Samlet virksomhedsomkostning inkl. månedlige ydelser, oprettelse og nedskrivning over perioden"
                value={`${fmt(c.companyMonthlyCostIncDepreciation)} kr/md`} bold />
            <Row label={`Din nettopris (${Math.round(c.marginalTaxRate * 100)}% skat)`}
                value={`${fmt(c.employeeNetCostMonthly)} kr/md`} bold highlight />

            <Accordion title="Se beregningsdetaljer">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                    Virksomhedens omkostning
                </div>
                <Row label="Forholdsmæssig afgift/md" tooltip={t('tooltip.forholdsmassig_afgift')} value={`${fmt(c.monthlyFlexTax)} kr`} />
                <Row label="Rente af restafgift/md" value={`${fmt(c.monthlyStateInterest)} kr`} />
                <Row label="Finansieringsrente/md" value={`${fmt(c.monthlyFinanceInterest)} kr`} />
                <Row label="Administrationsgebyr/md" value={`${fmt(c.monthlyAdminFee)} kr`} />
                <Row label="Månedlig ydelse ex. moms" value={`${fmt(c.companyCostMonthlyExMoms)} kr/md`} bold separator />
                <Row label="Oprettelse ex. moms" value={`${fmt(c.establishmentFeeExMoms)} kr`} />
                <Row label={`Nedskrivning ex. moms (${pct(c.depreciationPct)})`}
                    tooltip={`${t('tooltip.nedskrivning')} Restværdi: ${fmt(c.restvaerdiExMoms)} kr`}
                    value={`${fmt(c.depreciationExMoms)} kr`} />
                <Row label={`Samlet virksomhed ${c.leaseTermMonths} mdr`}
                    value={`${fmt(c.companyTotalCost)} kr`} bold separator highlight />

                <div className="px-2 py-1 mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border">
                    Medarbejderens beskatning
                </div>
                <Row label="Beskatningsgrundlag" tooltip={`${t('tooltip.beskatningsgrundlag')} ${ageNote}`}
                    value={`${fmt(c.beskatningsgrundlag)} kr`} />
                <div className="px-2 py-0.5 text-[10px] text-muted-foreground/70 italic">{ageNote}</div>
                <Row label="Årlig skattepligtig fordel" value={`${fmt(c.annualTaxableBenefit)} kr`} />
                <Row label="Miljøtillæg" tooltip={t('tooltip.miljoe_tillaeg')} value={`${fmt(c.miljoeTillaeg)} kr`} />
                <Row label="Månedlig beskatning" value={`${fmt(c.monthlyTaxableBenefit)} kr`} bold separator />
                <Row label={`Nettopris (${Math.round(c.marginalTaxRate * 100)}% skat)`}
                    tooltip={t('tooltip.marginal_skattesats')}
                    value={`${fmt(c.employeeNetCostMonthly)} kr/md`} bold highlight />
            </Accordion>
        </div>
    )
}

export function CarColumn({ result, isLowestPurchase, isLowestFlexlease, isLowestCompanyFlex, bankRate, onRemove }: CarColumnProps) {
    const car = result.car
    const flag = countryFlags[car.country] || ''
    const leaseTermMonths = result.flexlease.leaseTermMonths
    const bestPurchase = result.purchase[result.bestPurchaseOrigin]
    const bestOriginLabel = originShortLabels[result.bestPurchaseOrigin]
    const insights = result.insights

    return (
        <div className="min-w-[340px] max-w-[380px] border border-border rounded-xl bg-card overflow-hidden flex flex-col">
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

            {/* TCO Summary cards — wider with upfront capital */}
            <div className="grid grid-cols-3 border-b border-border">
                <div className={`p-2.5 text-center ${isLowestPurchase ? 'bg-emerald-500/10' : ''}`}>
                    <p className="text-[10px] text-muted-foreground leading-tight">Privat køb</p>
                    <p className="text-[8px] text-muted-foreground/60">{bestOriginLabel}</p>
                    <p className={`text-lg font-bold leading-tight ${isLowestPurchase ? 'text-emerald-400' : 'text-foreground'}`}>{fmt(bestPurchase?.monthlyEquivalent)}</p>
                    <p className="text-[9px] text-muted-foreground">kr/md TCO</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Udb: {fmt(bestPurchase?.downPayment)} kr</p>
                </div>
                <div className={`p-2.5 text-center border-l border-border ${isLowestFlexlease ? 'bg-emerald-500/10' : ''}`}>
                    <p className="text-[10px] text-muted-foreground leading-tight">Privat flex</p>
                    <p className="text-[8px] text-muted-foreground/60">{leaseTermMonths} mdr</p>
                    <p className={`text-lg font-bold leading-tight ${isLowestFlexlease ? 'text-emerald-400' : 'text-foreground'}`}>{fmt(result.flexlease.monthlyEquivalent)}</p>
                    <p className="text-[9px] text-muted-foreground">kr/md TCO</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">1. ydelse: {fmt(result.flexlease.downPayment)} kr</p>
                </div>
                <div className={`p-2.5 text-center border-l border-border ${isLowestCompanyFlex ? 'bg-emerald-500/10' : ''}`}>
                    <p className="text-[10px] text-muted-foreground leading-tight">Erhverv flex</p>
                    <p className="text-[8px] text-muted-foreground/60">{leaseTermMonths} mdr</p>
                    <p className={`text-lg font-bold leading-tight ${isLowestCompanyFlex ? 'text-emerald-400' : 'text-foreground'}`}>{fmt(result.companyFlexlease.employeeNetCostMonthly)}</p>
                    <p className="text-[9px] text-muted-foreground">kr/md din skat</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Firma: {fmt(result.companyFlexlease.companyCostMonthlyExMoms)} kr/md</p>
                </div>
            </div>

            {/* Automated insights */}
            {insights.length > 0 && (
                <div className="py-2 border-b border-border">
                    {insights.map((text, i) => <InsightNote key={i} text={text} />)}
                </div>
            )}

            {/* Detailed breakdowns */}
            <div className="divide-y divide-border flex-1">
                <div className="py-2"><PurchaseSection result={result} bankRate={bankRate} /></div>
                <div className="py-2"><FlexleaseSection result={result} /></div>
                <div className="py-2"><CompanyFlexleaseSection result={result} /></div>
            </div>
        </div>
    )
}
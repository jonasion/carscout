'use client'

import type { ComparisonSettings } from '@/lib/comparison/types'
import { useLocale } from '@/lib/i18n/useLocale'

interface SettingsPanelProps {
    settings: ComparisonSettings
    onChange: (settings: ComparisonSettings) => void
}

function SettingInput({ label, value, onChange, step, suffix }: {
    label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{label}</label>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    step={step ?? 1}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground"
                />
                {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
            </div>
        </div>
    )
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
    const { t } = useLocale()

    const update = (partial: Partial<ComparisonSettings>) => {
        onChange({ ...settings, ...partial })
    }

    return (
        <div className="space-y-5">
            {/* Duration selector */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">{t('label.duration') || 'Varighed'}</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                    {[12, 24, 36].map((m) => (
                        <button
                            key={m}
                            onClick={() => update({ durationMonths: m })}
                            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${settings.durationMonths === m
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {m} md
                        </button>
                    ))}
                </div>
            </div>

            {/* Purchase settings */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Køb</p>
                <SettingInput
                    label={t('label.down_payment')}
                    value={settings.downPayment}
                    onChange={(v) => update({ downPayment: v })}
                    step={10000}
                    suffix="DKK"
                />
                <SettingInput
                    label={t('label.loan_rate') || 'Bankrente'}
                    value={settings.bankInterestRate}
                    onChange={(v) => update({ bankInterestRate: v })}
                    step={0.1}
                    suffix="%"
                />
                <SettingInput
                    label="Oprettelsesgebyr"
                    value={settings.loanEstablishmentFee}
                    onChange={(v) => update({ loanEstablishmentFee: v })}
                    suffix="DKK"
                />
            </div>

            {/* Flexlease settings */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Flexleasing</p>
                <SettingInput
                    label="Finansieringsrente"
                    value={settings.leasingFinanceRate}
                    onChange={(v) => update({ leasingFinanceRate: v })}
                    step={0.1}
                    suffix="%"
                />
                <SettingInput
                    label="Restafgiftsrente"
                    value={settings.stateResidualRate}
                    onChange={(v) => update({ stateResidualRate: v })}
                    step={0.1}
                    suffix="%"
                />
                <SettingInput
                    label="Administrationsgebyr"
                    value={settings.adminFeeMonthly}
                    onChange={(v) => update({ adminFeeMonthly: v })}
                    suffix="kr/md"
                />
                <SettingInput
                    label="Leasinggebyr (ex. moms)"
                    value={settings.leaseEstablishmentFee}
                    onChange={(v) => update({ leaseEstablishmentFee: v })}
                    suffix="DKK"
                />
            </div>

            {/* Erhvervsleasing settings */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Erhvervsleasing</p>
                <SettingInput
                    label="Marginal skattesats"
                    value={Math.round(settings.marginalTaxRate * 100)}
                    onChange={(v) => update({ marginalTaxRate: v / 100 })}
                    step={1}
                    suffix="%"
                />
                <SettingInput
                    label="Grøn ejerafgift"
                    value={settings.groenEjerafgiftDkk}
                    onChange={(v) => update({ groenEjerafgiftDkk: v })}
                    suffix="kr/år"
                />
                <SettingInput
                    label="Miljøfaktor"
                    value={settings.miljoeFactor}
                    onChange={(v) => update({ miljoeFactor: v })}
                    step={0.1}
                />
            </div>

            {/* General settings */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Generelt</p>
                <SettingInput
                    label="Afskrivning"
                    value={settings.depreciationRate}
                    onChange={(v) => update({ depreciationRate: v })}
                    step={1}
                    suffix="% / år"
                />
                <SettingInput
                    label="EUR → DKK"
                    value={settings.eurToDkkRate}
                    onChange={(v) => update({ eurToDkkRate: v })}
                    step={0.01}
                />
            </div>
        </div>
    )
}
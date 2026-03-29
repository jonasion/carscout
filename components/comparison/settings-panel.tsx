'use client'

import type { ComparisonSettings, DownPaymentMode } from '@/lib/comparison/types'
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

function PillSelector({ label, value, options, onChange, labels }: {
    label: string; value: number | string; options: (number | string)[]; onChange: (v: any) => void; labels?: string[]
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{label}</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
                {options.map((opt, i) => (
                    <button
                        key={String(opt)}
                        onClick={() => onChange(opt)}
                        className={`flex-1 py-1.5 text-xs font-medium transition-colors ${value === opt
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {labels ? labels[i] : `${opt} md`}
                    </button>
                ))}
            </div>
        </div>
    )
}

function DownPaymentInput({ label, mode, fixed, percent, onModeChange, onFixedChange, onPercentChange }: {
    label: string
    mode: DownPaymentMode
    fixed: number
    percent: number
    onModeChange: (m: DownPaymentMode) => void
    onFixedChange: (v: number) => void
    onPercentChange: (v: number) => void
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{label}</label>
            <div className="flex rounded-lg border border-border overflow-hidden mb-1">
                <button
                    onClick={() => onModeChange('fixed')}
                    className={`flex-1 py-1 text-xs font-medium transition-colors ${mode === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                    DKK
                </button>
                <button
                    onClick={() => onModeChange('percent')}
                    className={`flex-1 py-1 text-xs font-medium transition-colors ${mode === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                    %
                </button>
            </div>
            {mode === 'fixed' ? (
                <div className="flex items-center gap-1">
                    <input type="number" step={10000} value={fixed} onChange={(e) => onFixedChange(Number(e.target.value))}
                        className="w-full rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground" />
                    <span className="text-xs text-muted-foreground">DKK</span>
                </div>
            ) : (
                <div className="flex items-center gap-1">
                    <input type="number" step={1} min={0} max={100} value={percent} onChange={(e) => onPercentChange(Number(e.target.value))}
                        className="w-full rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground" />
                    <span className="text-xs text-muted-foreground">%</span>
                </div>
            )}
        </div>
    )
}

function Toggle({ label, checked, onChange, description }: {
    label: string; checked: boolean; onChange: (v: boolean) => void; description?: string
}) {
    return (
        <div className="flex items-start gap-2">
            <button
                onClick={() => onChange(!checked)}
                className={`mt-0.5 h-5 w-9 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-secondary border border-border'}`}
            >
                <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <div>
                <p className="text-xs text-foreground">{label}</p>
                {description && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{description}</p>}
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
            {/* Purchase */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Køb (privat)</p>
                <DownPaymentInput
                    label="Udbetaling"
                    mode={settings.downPaymentMode}
                    fixed={settings.downPaymentFixed}
                    percent={settings.downPaymentPercent}
                    onModeChange={(m) => update({ downPaymentMode: m })}
                    onFixedChange={(v) => update({ downPaymentFixed: v })}
                    onPercentChange={(v) => update({ downPaymentPercent: v })}
                />
                <SettingInput label="Bankrente" value={settings.bankInterestRate} onChange={(v) => update({ bankInterestRate: v })} step={0.1} suffix="%" />
                <PillSelector label="Løbetid banklån" value={settings.loanTermMonths} options={[48, 60, 72, 84]} onChange={(v: number) => update({ loanTermMonths: v })} />
                <SettingInput label="Oprettelsesgebyr" value={settings.loanEstablishmentFee} onChange={(v) => update({ loanEstablishmentFee: v })} suffix="DKK" />
            </div>

            {/* Flexlease */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Flexleasing</p>
                <PillSelector label="Løbetid" value={settings.leaseTermMonths} options={[6, 12, 24, 36]} onChange={(v: number) => update({ leaseTermMonths: v })} />
                <Toggle
                    label="Auto-match førstegangsydelse"
                    checked={settings.autoMatchLeaseDown}
                    onChange={(v) => update({ autoMatchLeaseDown: v })}
                    description="Sæt førstegangsydelse lig forventet nedskrivning (branchepraksis)"
                />
                {!settings.autoMatchLeaseDown && (
                    <DownPaymentInput
                        label="Førstegangsydelse"
                        mode={settings.leaseDownPaymentMode}
                        fixed={settings.leaseDownPaymentFixed}
                        percent={settings.leaseDownPaymentPercent}
                        onModeChange={(m) => update({ leaseDownPaymentMode: m })}
                        onFixedChange={(v) => update({ leaseDownPaymentFixed: v })}
                        onPercentChange={(v) => update({ leaseDownPaymentPercent: v })}
                    />
                )}
                <SettingInput label="Finansieringsrente" value={settings.leasingFinanceRate} onChange={(v) => update({ leasingFinanceRate: v })} step={0.1} suffix="%" />
                <SettingInput label="Restafgiftsrente" value={settings.stateResidualRate} onChange={(v) => update({ stateResidualRate: v })} step={0.1} suffix="%" />
                <SettingInput label="Administrationsgebyr" value={settings.adminFeeMonthly} onChange={(v) => update({ adminFeeMonthly: v })} suffix="kr/md" />
                <SettingInput label="Leasinggebyr (ex. moms)" value={settings.leaseEstablishmentFee} onChange={(v) => update({ leaseEstablishmentFee: v })} suffix="DKK" />
            </div>

            {/* Erhvervsleasing */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Erhvervsleasing</p>
                <SettingInput label="Marginal skattesats" value={Math.round(settings.marginalTaxRate * 100)} onChange={(v) => update({ marginalTaxRate: v / 100 })} step={1} suffix="%" />
                <SettingInput label="Grøn ejerafgift" value={settings.groenEjerafgiftDkk} onChange={(v) => update({ groenEjerafgiftDkk: v })} suffix="kr/år" />
                <SettingInput label="Miljøfaktor" value={settings.miljoeFactor} onChange={(v) => update({ miljoeFactor: v })} step={0.1} />
            </div>

            {/* General */}
            <div className="space-y-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wide">Generelt</p>
                <SettingInput label="Forventet årlig nedskrivning" value={settings.depreciationRate} onChange={(v) => update({ depreciationRate: v })} step={1} suffix="% / år" />
                <SettingInput label="EUR → DKK" value={settings.eurToDkkRate} onChange={(v) => update({ eurToDkkRate: v })} step={0.01} />
            </div>
        </div>
    )
}
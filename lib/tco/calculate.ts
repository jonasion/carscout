// ============================================================
// CARSCOUT TCO ENGINE v3 — 2026 Danish rules
// Running costs (fuel, insurance, maintenance) excluded pending
// real data sources. Company car tax retained.
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================
// TYPES
// ============================================================

export interface TcoConfig {
    annual_km: number
    fuel_price_dkk_per_l: number
    diesel_price_dkk_per_l: number
    ev_kwh_price_dkk: number
    insurance_pct_of_value: number
    maintenance_pct_young: number
    maintenance_pct_old: number
    import_generic_costs_dkk: number
    company_car_tax_rate_pct: number
    registration_tax_ev_discount_pct_2026: number
    registration_tax_ev_deduction_dkk: number
    registration_tax_base_deduction: number
    registration_tax_bracket_1_pct: number
    registration_tax_bracket_1_max: number
    registration_tax_bracket_2_pct: number
    registration_tax_bracket_2_max: number
    registration_tax_bracket_3_pct: number
    lease_stiftelsesgebyr_dkk: number
    lease_tinglysning_fixed_dkk: number
}

export interface CarRaw {
    id: string
    brand: string
    model: string
    fuel_type: string
    first_registration_year: number
    mileage_km: number
    price_amount: number
    price_currency: string
    co2_g_km: number | null
    consumption_l_100km: number | null
    consumption_kwh_100km: number | null
    battery_kwh: number | null
    is_registered_dk: boolean
    has_dk_vat: boolean
    lease_monthly_dkk: number | null
    lease_down_payment_dkk: number | null
    lease_term_months: number | null
    lease_restvaerdi_dkk: number | null
    listing_type: string
}

export type Origin = 'dk_registered' | 'dk_unregistered' | 'eu_import'
export type ScenarioType = 'purchase' | 'flexlease'
export type UsageType = 'private' | 'company'

// Tier 2 depreciation heuristics
const TIER2_DEPRECIATION: Record<string, number[]> = {
    // [year1, year2, year3, year4, year5] as residual % of on-road cost
    ice_petrol: [0.82, 0.72, 0.63, 0.57, 0.52],
    ice_diesel: [0.80, 0.70, 0.61, 0.55, 0.50],
    ev_mainstream: [0.78, 0.66, 0.56, 0.50, 0.46],
    ev_early: [0.73, 0.60, 0.49, 0.42, 0.37],
    phev: [0.80, 0.68, 0.58, 0.51, 0.47],
}

// ============================================================
// 1. READ CONFIG FROM DB
// ============================================================

export async function readTcoConfig(): Promise<TcoConfig> {
    const { data, error } = await supabase
        .from('tco_config')
        .select('key, value')

    if (error) throw new Error(`Failed to read tco_config: ${error.message}`)

    return Object.fromEntries(
        data.map(row => [row.key, Number(row.value)])
    ) as unknown as TcoConfig
}

// ============================================================
// 2. REGISTRATION TAX — exact 2026 rules
// ============================================================

export function calculateRegistrationTax(
    purchasePrice: number,
    fuelType: string,
    co2GKm: number | null,
    config: TcoConfig
): { tax: number; evDeductionApplied: number; notes: string } {

    const isEV = fuelType?.toLowerCase() === 'el' || fuelType?.toLowerCase() === 'electric'
    const baseDeduction = config.registration_tax_base_deduction

    let taxableValue: number
    let evDeductionApplied = 0
    let notes = 'ICE 2026 brackets'

    if (isEV) {
        evDeductionApplied = config.registration_tax_ev_deduction_dkk
        taxableValue = purchasePrice - evDeductionApplied - baseDeduction
        notes = 'EV 2026 brackets — 60% discount applied'
    } else {
        taxableValue = purchasePrice - baseDeduction
    }

    taxableValue = Math.max(0, taxableValue)

    let rawTax = 0
    const b1max = config.registration_tax_bracket_1_max
    const b2max = config.registration_tax_bracket_2_max

    if (taxableValue <= b1max) {
        rawTax = taxableValue * (config.registration_tax_bracket_1_pct / 100)
    } else if (taxableValue <= b2max) {
        rawTax =
            b1max * (config.registration_tax_bracket_1_pct / 100) +
            (taxableValue - b1max) * (config.registration_tax_bracket_2_pct / 100)
    } else {
        rawTax =
            b1max * (config.registration_tax_bracket_1_pct / 100) +
            (b2max - b1max) * (config.registration_tax_bracket_2_pct / 100) +
            (taxableValue - b2max) * (config.registration_tax_bracket_3_pct / 100)
    }

    let co2Surcharge = 0
    if (!isEV && co2GKm !== null && co2GKm > 0) {
        if (co2GKm <= 109) {
            co2Surcharge = co2GKm * 280
        } else if (co2GKm <= 139) {
            co2Surcharge = 109 * 280 + (co2GKm - 109) * 560
        } else {
            co2Surcharge = 109 * 280 + 30 * 560 + (co2GKm - 139) * 1064
        }
        notes += ` + CO2 surcharge (${co2GKm} g/km)`
    }

    rawTax += co2Surcharge

    let finalTax = rawTax
    if (isEV) {
        const discountPct = config.registration_tax_ev_discount_pct_2026 / 100
        finalTax = rawTax * (1 - discountPct)
    }

    return { tax: Math.round(finalTax), evDeductionApplied, notes }
}

// ============================================================
// 3. DEPRECIATION — Tier 1 from DB, Tier 2 fallback
// ============================================================

async function getDepreciation(
    brand: string,
    model: string,
    fuelType: string,
    holdingYears: number
): Promise<{ residualPct: number; source: string }> {

    const { data } = await supabase
        .from('depreciation_curves')
        .select('*')
        .ilike('brand', brand)
        .ilike('model', model)
        .ilike('fuel_type', fuelType)
        .limit(1)
        .single()

    if (data) {
        const key = `year_${holdingYears}_residual_pct` as keyof typeof data
        const pct = data[key] as number
        if (pct) {
            return { residualPct: pct / 100, source: 'tier1_scraped' }
        }
    }

    const ft = fuelType?.toLowerCase()
    let segment = 'ice_petrol'
    if (ft === 'el' || ft === 'electric') segment = 'ev_mainstream'
    else if (ft === 'diesel') segment = 'ice_diesel'
    else if (ft === 'phev' || ft === 'plugin') segment = 'phev'

    const curve = TIER2_DEPRECIATION[segment]
    const idx = Math.min(holdingYears - 1, curve.length - 1)

    return { residualPct: curve[idx], source: 'tier2_heuristic' }
}

// ============================================================
// 4. ANNUITY LOAN PAYMENT
// ============================================================

function monthlyAnnuityPayment(
    principal: number,
    annualRatePct: number,
    termMonths: number
): number {
    if (annualRatePct === 0) return principal / termMonths
    const r = annualRatePct / 100 / 12
    return principal * (r * Math.pow(1 + r, termMonths)) /
        (Math.pow(1 + r, termMonths) - 1)
}

// ============================================================
// 5. PURCHASE SCENARIO
// ============================================================

async function calculatePurchaseScenario(
    car: CarRaw,
    origin: Origin,
    usageType: UsageType,
    holdingYears: number,
    downPaymentDkk: number,
    loanRatePct: number,
    config: TcoConfig
) {
    const purchasePrice = car.price_amount

    let registrationTax = 0
    let evDeductionApplied = 0
    let vatSaved = 0
    let importCosts = 0
    let taxNotes = ''

    if (origin === 'dk_unregistered' || origin === 'eu_import') {
        const taxResult = calculateRegistrationTax(
            purchasePrice, car.fuel_type, car.co2_g_km, config
        )
        registrationTax = taxResult.tax
        evDeductionApplied = taxResult.evDeductionApplied
        taxNotes = taxResult.notes
    }

    if (origin === 'eu_import') {
        const carAge = new Date().getFullYear() - (car.first_registration_year ?? 0)
        if (carAge >= 1 && (car.mileage_km ?? 0) > 6000) {
            vatSaved = Math.round(purchasePrice * 0.05)
        }
        importCosts = config.import_generic_costs_dkk
    }

    const onRoadCost = purchasePrice + registrationTax - vatSaved + importCosts

    // Financing
    const financedAmount = Math.max(0, onRoadCost - downPaymentDkk)
    const loanTermMonths = holdingYears * 12
    const monthlyLoanPayment = financedAmount > 0
        ? monthlyAnnuityPayment(financedAmount, loanRatePct, loanTermMonths)
        : 0
    const totalLoanPayments = monthlyLoanPayment * loanTermMonths

    // Company car tax (private = 0)
    const companyCarTax = usageType === 'company'
        ? Math.round(onRoadCost * (config.company_car_tax_rate_pct / 100) * holdingYears)
        : 0

    // Exit value
    const { residualPct, source: depSource } = await getDepreciation(
        car.brand, car.model, car.fuel_type, holdingYears
    )
    const exitValue = Math.round(onRoadCost * residualPct)

    // Total — acquisition + financing + company tax - exit value
    // Running costs (fuel, insurance, maintenance) excluded pending real data
    const totalOutOfPocket = Math.round(
        downPaymentDkk +
        totalLoanPayments +
        companyCarTax -
        exitValue
    )
    const monthlyEquivalent = Math.round(totalOutOfPocket / (holdingYears * 12))

    return {
        car_id: car.id,
        holding_period_years: holdingYears,
        scenario_type: 'purchase' as ScenarioType,
        usage_type: usageType,
        origin,
        purchase_price_dkk: purchasePrice,
        down_payment_dkk: downPaymentDkk,
        financed_amount_dkk: financedAmount,
        loan_rate_pct: loanRatePct,
        loan_term_months: loanTermMonths,
        monthly_loan_payment_dkk: Math.round(monthlyLoanPayment),
        registration_tax_dkk: registrationTax,
        ev_deduction_applied_dkk: evDeductionApplied,
        vat_saved_dkk: vatSaved,
        import_costs_dkk: importCosts,
        total_on_road_cost_dkk: onRoadCost,
        fuel_energy_total_dkk: 0,
        insurance_total_dkk: 0,
        maintenance_total_dkk: 0,
        company_car_tax_total_dkk: companyCarTax,
        estimated_market_value_at_exit_dkk: exitValue,
        depreciation_source: depSource,
        net_exit_proceeds_dkk: exitValue,
        total_outofpocket_dkk: totalOutOfPocket,
        monthly_equivalent_dkk: monthlyEquivalent,
        notes: taxNotes || null,
    }
}

// ============================================================
// 6. FLEXLEASE SCENARIO (simplified — Bilbasen provides monthly only)
// ============================================================

function calculateSimpleLeaseScenario(
    car: CarRaw,
    usageType: UsageType,
    holdingYears: number,
    config: TcoConfig
) {
    if (!car.lease_monthly_dkk) return null

    const leaseMonthly = car.lease_monthly_dkk
    const months = holdingYears * 12
    const totalLeasePayments = leaseMonthly * months

    // Company car tax — estimate car value from monthly × 200
    const estimatedCarValue = leaseMonthly * 200
    const companyCarTax = usageType === 'company'
        ? Math.round(estimatedCarValue * (config.company_car_tax_rate_pct / 100) * holdingYears)
        : 0

    const totalOutOfPocket = Math.round(totalLeasePayments + companyCarTax)
    const monthlyEquivalent = Math.round(totalOutOfPocket / months)

    return {
        car_id: car.id,
        holding_period_years: holdingYears,
        scenario_type: 'flexlease' as ScenarioType,
        usage_type: usageType,
        origin: 'dk_registered' as Origin,
        purchase_price_dkk: estimatedCarValue,
        down_payment_dkk: 0,
        financed_amount_dkk: null,
        loan_rate_pct: null,
        loan_term_months: null,
        monthly_loan_payment_dkk: null,
        registration_tax_dkk: null,
        ev_deduction_applied_dkk: null,
        vat_saved_dkk: null,
        import_costs_dkk: null,
        total_on_road_cost_dkk: null,
        lease_stiftelsesgebyr_dkk: null,
        lease_tinglysning_dkk: null,
        lease_monthly_payment_dkk: leaseMonthly,
        lease_down_payment_dkk: 0,
        lease_term_months: months,
        lease_restvaerdi_dkk: null,
        lease_implied_apr_pct: null,
        lease_total_payments_dkk: totalLeasePayments,
        fuel_energy_total_dkk: 0,
        insurance_total_dkk: 0,
        maintenance_total_dkk: 0,
        company_car_tax_total_dkk: companyCarTax,
        estimated_market_value_at_exit_dkk: null,
        depreciation_source: null,
        restvaerdi_risk_dkk: null,
        net_exit_proceeds_dkk: null,
        total_outofpocket_dkk: totalOutOfPocket,
        monthly_equivalent_dkk: monthlyEquivalent,
        notes: `Leasing ${leaseMonthly} kr/md inkl. moms`,
    }
}

// ============================================================
// 7. MATRIX RUNNER — entry point
// ============================================================

export async function computeAllScenarios(
    carId: string,
    downPaymentDkk: number = 200000,
    loanRatePct: number = 5.0
) {
    const { data: car, error: carError } = await supabase
        .from('cars_raw')
        .select('*')
        .eq('id', carId)
        .single()

    if (carError || !car) throw new Error(`Car not found: ${carId}`)

    const config = await readTcoConfig()

    // Convert EUR prices to DKK
    const eurRate = (config as any).eur_to_dkk_rate ?? 7.46
    if (car.price_currency === 'EUR') {
        car.price_amount = Math.round(car.price_amount * eurRate)
    }

    // Delete existing scenarios
    await supabase.from('tco_scenarios').delete().eq('car_id', carId)

    const scenarios = []
    const purchasePeriods = [1, 2, 3, 5]
    const leasePeriods = [1, 2, 3]
    const usageTypes: UsageType[] = ['private', 'company']

    // Determine origins
    const origins: Origin[] = car.is_registered_dk
        ? ['dk_registered']
        : ['dk_unregistered', 'eu_import']

    // Purchase scenarios (skip if listing is lease-only with no real purchase price)
    const isLeaseOnly = car.listing_type === 'lease' && car.price_amount === car.lease_monthly_dkk
    if (!isLeaseOnly) {
        for (const years of purchasePeriods) {
            for (const usage of usageTypes) {
                for (const origin of origins) {
                    const scenario = await calculatePurchaseScenario(
                        car, origin, usage, years, downPaymentDkk, loanRatePct, config
                    )
                    scenarios.push(scenario)
                }
            }
        }
    }

    // Lease scenarios
    if (car.lease_monthly_dkk) {
        for (const years of leasePeriods) {
            for (const usage of usageTypes) {
                const scenario = calculateSimpleLeaseScenario(car, usage, years, config)
                if (scenario) scenarios.push(scenario)
            }
        }
    }

    // Write scenarios
    const { error: insertError } = await supabase
        .from('tco_scenarios')
        .insert(scenarios)

    if (insertError) throw new Error(`Failed to write scenarios: ${insertError.message}`)

    return {
        car_id: carId,
        scenarios_computed: scenarios.length,
    }
}
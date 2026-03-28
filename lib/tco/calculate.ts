// ============================================================
// CARSCOUT TCO ENGINE v2 — 2026 Danish rules
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

// Tier 2 depreciation heuristics — fallback when no scraped curve exists
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

    // Floor at zero — no negative taxable value
    taxableValue = Math.max(0, taxableValue)

    // Apply brackets
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

    // CO2 surcharge — ICE only
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

    // EV discount
    let finalTax = rawTax
    if (isEV) {
        const discountPct = config.registration_tax_ev_discount_pct_2026 / 100
        finalTax = rawTax * (1 - discountPct)
    }

    return {
        tax: Math.round(finalTax),
        evDeductionApplied,
        notes,
    }
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

    // Try Tier 1 — scraped curve
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

    // Tier 2 fallback — segment heuristic
    const ft = fuelType?.toLowerCase()
    let segment = 'ice_petrol'

    if (ft === 'el' || ft === 'electric') segment = 'ev_mainstream'
    else if (ft === 'diesel') segment = 'ice_diesel'
    else if (ft === 'phev' || ft === 'plugin') segment = 'phev'

    const curve = TIER2_DEPRECIATION[segment]
    const idx = Math.min(holdingYears - 1, curve.length - 1)

    return {
        residualPct: curve[idx],
        source: 'tier2_heuristic',
    }
}

// ============================================================
// 4. RUNNING COSTS
// ============================================================

function calculateRunningCosts(
    car: CarRaw,
    onRoadCost: number,
    holdingYears: number,
    usageType: UsageType,
    config: TcoConfig
): {
    fuelEnergy: number
    insurance: number
    maintenance: number
    companyCarTax: number
} {
    const ft = car.fuel_type?.toLowerCase()
    const isEV = ft === 'el' || ft === 'electric'
    const annualKm = config.annual_km

    // Fuel / energy
    let fuelEnergy = 0
    if (isEV && car.consumption_kwh_100km) {
        fuelEnergy = (annualKm / 100) * car.consumption_kwh_100km *
            config.ev_kwh_price_dkk * holdingYears
    } else if (ft === 'diesel' && car.consumption_l_100km) {
        fuelEnergy = (annualKm / 100) * car.consumption_l_100km *
            config.diesel_price_dkk_per_l * holdingYears
    } else if (car.consumption_l_100km) {
        fuelEnergy = (annualKm / 100) * car.consumption_l_100km *
            config.fuel_price_dkk_per_l * holdingYears
    } else {
        // Fallback estimate if consumption missing
        fuelEnergy = isEV
            ? (annualKm / 100) * 18 * config.ev_kwh_price_dkk * holdingYears
            : (annualKm / 100) * 7 * config.fuel_price_dkk_per_l * holdingYears
    }

    // Insurance
    const insurance = onRoadCost * (config.insurance_pct_of_value / 100) * holdingYears

    // Maintenance — young vs old
    const carAge = new Date().getFullYear() - (car.first_registration_year ?? 2020)
    const maintPct = carAge < 3
        ? config.maintenance_pct_young
        : config.maintenance_pct_old
    const maintenance = onRoadCost * (maintPct / 100) * holdingYears

    // Company car tax (private = 0)
    const companyCarTax = usageType === 'company'
        ? onRoadCost * (config.company_car_tax_rate_pct / 100) * holdingYears
        : 0

    return {
        fuelEnergy: Math.round(fuelEnergy),
        insurance: Math.round(insurance),
        maintenance: Math.round(maintenance),
        companyCarTax: Math.round(companyCarTax),
    }
}

// ============================================================
// 5. ANNUITY LOAN PAYMENT
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
// 6. FLEXLEASE IRR (implied APR)
// ============================================================

function calculateImpliedAPR(
    downPayment: number,
    monthlyPayment: number,
    termMonths: number,
    exitValue: number
): number {
    // IRR via Newton-Raphson on monthly cashflows
    // Cashflows: [-downPayment, -monthly x n months, +exitValue at end]
    const cashflows = [-downPayment, ...Array(termMonths).fill(-monthlyPayment)]
    cashflows[cashflows.length - 1] += exitValue

    let rate = 0.005 // initial guess: 0.5% per month
    for (let i = 0; i < 100; i++) {
        let npv = 0
        let dnpv = 0
        for (let t = 0; t < cashflows.length; t++) {
            npv += cashflows[t] / Math.pow(1 + rate, t)
            dnpv -= t * cashflows[t] / Math.pow(1 + rate, t + 1)
        }
        const delta = npv / dnpv
        rate -= delta
        if (Math.abs(delta) < 1e-8) break
    }

    // Convert monthly rate to annual
    return Math.round((Math.pow(1 + rate, 12) - 1) * 10000) / 100
}

// ============================================================
// 7. PURCHASE SCENARIO
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

    // Registration tax
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
        // VAT saving: ~5% of price if used car (>6mo, >6000km)
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

    // Running costs
    const running = calculateRunningCosts(car, onRoadCost, holdingYears, usageType, config)

    // Exit value
    const { residualPct, source: depSource } = await getDepreciation(
        car.brand, car.model, car.fuel_type, holdingYears
    )
    const exitValue = Math.round(onRoadCost * residualPct)

    // Total
    const totalOutOfPocket = Math.round(
        downPaymentDkk +
        totalLoanPayments +
        running.fuelEnergy +
        running.insurance +
        running.maintenance +
        running.companyCarTax -
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
        fuel_energy_total_dkk: running.fuelEnergy,
        insurance_total_dkk: running.insurance,
        maintenance_total_dkk: running.maintenance,
        company_car_tax_total_dkk: running.companyCarTax,
        estimated_market_value_at_exit_dkk: exitValue,
        depreciation_source: depSource,
        net_exit_proceeds_dkk: exitValue,
        total_outofpocket_dkk: totalOutOfPocket,
        monthly_equivalent_dkk: monthlyEquivalent,
        notes: taxNotes || null,
    }
}

// ============================================================
// 8. FLEXLEASE SCENARIO
// ============================================================

async function calculateLeaseScenario(
    car: CarRaw,
    usageType: UsageType,
    holdingYears: number,
    config: TcoConfig
) {
    // Only run if listing has lease data
    if (
        !car.lease_monthly_dkk ||
        !car.lease_term_months ||
        !car.lease_restvaerdi_dkk
    ) return null

    const leaseMonths = car.lease_term_months
    const leaseMonthly = car.lease_monthly_dkk
    const restvaerdi = car.lease_restvaerdi_dkk
    const leaseDown = car.lease_down_payment_dkk ?? 0

    // Upfront costs
    const stiftelsesgebyr = config.lease_stiftelsesgebyr_dkk
    const financedAmount = car.price_amount - leaseDown
    const tinglysning = Math.round(
        config.lease_tinglysning_fixed_dkk + financedAmount * 0.0145
    )

    // Running costs — use car value as base
    const running = calculateRunningCosts(
        car, car.price_amount, holdingYears, usageType, config
    )

    // Exit — restvaerdi risk
    const { residualPct, source: depSource } = await getDepreciation(
        car.brand, car.model, car.fuel_type, holdingYears
    )
    const estimatedMarketValue = Math.round(car.price_amount * residualPct)
    const restvaerdiRisk = Math.max(0, restvaerdi - estimatedMarketValue)
    const netExitProceeds = Math.max(0, estimatedMarketValue - restvaerdi)

    // Implied APR
    const impliedAPR = calculateImpliedAPR(
        leaseDown, leaseMonthly, leaseMonths, estimatedMarketValue
    )

    const totalLeasePayments = leaseMonthly * leaseMonths
    const totalOutOfPocket = Math.round(
        leaseDown +
        stiftelsesgebyr +
        tinglysning +
        totalLeasePayments +
        running.fuelEnergy +
        running.insurance +
        running.maintenance +
        running.companyCarTax +
        restvaerdiRisk -
        netExitProceeds
    )
    const monthlyEquivalent = Math.round(totalOutOfPocket / (holdingYears * 12))

    return {
        car_id: car.id,
        holding_period_years: holdingYears,
        scenario_type: 'flexlease' as ScenarioType,
        usage_type: usageType,
        origin: 'dk_registered' as Origin,
        purchase_price_dkk: car.price_amount,
        lease_stiftelsesgebyr_dkk: stiftelsesgebyr,
        lease_tinglysning_dkk: tinglysning,
        lease_monthly_payment_dkk: leaseMonthly,
        lease_down_payment_dkk: leaseDown,
        lease_term_months: leaseMonths,
        lease_restvaerdi_dkk: restvaerdi,
        lease_implied_apr_pct: impliedAPR,
        lease_total_payments_dkk: totalLeasePayments,
        fuel_energy_total_dkk: running.fuelEnergy,
        insurance_total_dkk: running.insurance,
        maintenance_total_dkk: running.maintenance,
        company_car_tax_total_dkk: running.companyCarTax,
        estimated_market_value_at_exit_dkk: estimatedMarketValue,
        depreciation_source: depSource,
        restvaerdi_risk_dkk: restvaerdiRisk,
        net_exit_proceeds_dkk: netExitProceeds,
        total_outofpocket_dkk: totalOutOfPocket,
        monthly_equivalent_dkk: monthlyEquivalent,
        notes: `Implied APR: ${impliedAPR}%`,
    }
}

// ============================================================
// 9. MATRIX RUNNER — entry point
// ============================================================

export async function computeAllScenarios(
    carId: string,
    downPaymentDkk: number = 200000,
    loanRatePct: number = 5.0
) {
    // Load car
    const { data: car, error: carError } = await supabase
        .from('cars_raw')
        .select('*')
        .eq('id', carId)
        .single()

    if (carError || !car) throw new Error(`Car not found: ${carId}`)

    // Load config
    const config = await readTcoConfig()

    // Convert EUR prices to DKK for TCO calculation
    const eurRate = (config as any).eur_to_dkk_rate ?? 7.46
    if (car.price_currency === 'EUR') {
        car.price_amount = Math.round(car.price_amount * eurRate)
    }

    // Delete any existing scenarios for this car (recompute fresh)
    await supabase.from('tco_scenarios').delete().eq('car_id', carId)

    const scenarios = []
    const holdingPeriods = [2, 3, 5]
    const usageTypes: UsageType[] = ['private', 'company']

    // Determine which origins apply
    const origins: Origin[] = car.is_registered_dk
        ? ['dk_registered']
        : ['dk_unregistered', 'eu_import']

    // Purchase scenarios
    for (const years of holdingPeriods) {
        for (const usage of usageTypes) {
            for (const origin of origins) {
                const scenario = await calculatePurchaseScenario(
                    car, origin, usage, years, downPaymentDkk, loanRatePct, config
                )
                scenarios.push(scenario)
            }
        }
    }

    // Flexlease scenarios (only if listing has lease data)
    if (car.listing_type === 'lease' || car.lease_monthly_dkk) {
        for (const years of holdingPeriods) {
            for (const usage of usageTypes) {
                const scenario = await calculateLeaseScenario(car, usage, years, config)
                if (scenario) scenarios.push(scenario)
            }
        }
    }

    // Write all scenarios to DB
    const { error: insertError } = await supabase
        .from('tco_scenarios')
        .insert(scenarios)

    if (insertError) throw new Error(`Failed to write scenarios: ${insertError.message}`)

    return {
        car_id: carId,
        scenarios_computed: scenarios.length,
        holding_periods: holdingPeriods,
    }
}
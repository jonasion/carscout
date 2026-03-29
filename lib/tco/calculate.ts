// ============================================================
// CARSCOUT TCO ENGINE v5 — 2026 Danish rules
// SPEC-021: Remove company purchase, split erhvervsleasing,
// add beskatningsgrundlag calculation
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
    market_depreciation_rate: number
    bank_interest_rate: number
    leasing_finance_interest: number
    state_residual_tax_interest: number
    lease_admin_fee_monthly_dkk: number
    loan_establishment_fee_dkk: number
    lease_establishment_fee_dkk: number
    eur_to_dkk_rate: number
    // SPEC-021: corporate cost model
    marginal_tax_rate: number
    miljoe_factor: number
    beskatning_bracket_1_pct: number
    beskatning_bracket_1_max: number
    beskatning_bracket_2_pct: number
    beskatning_min_base_dkk: number
    groen_ejerafgift_default_dkk: number
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
    country: string
    lease_monthly_dkk: number | null
    lease_down_payment_dkk: number | null
    lease_term_months: number | null
    lease_restvaerdi_dkk: number | null
    listing_type: string
}

export type Origin = 'dk_registered' | 'dk_exlease' | 'de_import' | 'de_import_exlease'
export type ScenarioType = 'purchase' | 'flexlease'
export type UsageType = 'private' | 'company'

// Tier 2 depreciation heuristics
const TIER2_DEPRECIATION: Record<string, number[]> = {
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
// Input: afgiftspligtigVaerdi (market value INCL. 25% moms)
// ============================================================

export function calculateRegistrationTax(
    afgiftspligtigVaerdi: number,
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
        taxableValue = afgiftspligtigVaerdi - evDeductionApplied - baseDeduction
        notes = 'EV 2026 brackets — 60% discount applied'
    } else {
        taxableValue = afgiftspligtigVaerdi - baseDeduction
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
// 5. ORIGIN DETERMINATION
// ============================================================

function determineOrigins(car: CarRaw): Origin[] {
    if (car.is_registered_dk) return ['dk_registered']
    if (car.country === 'DK') return ['dk_exlease']
    if (car.country === 'DE') return ['de_import', 'de_import_exlease']
    return ['de_import']
}

// ============================================================
// 6. VEHICLE AGE
// ============================================================

function getVehicleAgeMonths(firstRegistrationYear: number): number {
    const firstReg = new Date(firstRegistrationYear, 0, 1)
    return Math.floor(
        (Date.now() - firstReg.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
}

// ============================================================
// 7. BESKATNINGSGRUNDLAG — company car benefit taxation
// ============================================================

function calculateBeskatning(
    baseValue: number,
    momsAmount: number,
    fullRegistrationTax: number,
    config: TcoConfig
): {
    beskatningsgrundlag: number
    annualTaxableBenefit: number
    miljoeTillaeg: number
    monthlyTaxableBenefit: number
    employeeNetCostMonthly: number
} {
    // Tax base = base + moms + full registration tax (min 160,000)
    const rawBase = baseValue + momsAmount + fullRegistrationTax
    const minBase = config.beskatning_min_base_dkk || 160000
    const beskatningsgrundlag = Math.max(rawBase, minBase)

    // Annual taxable benefit: 25% up to 300k + 20% above 300k
    const bracket1Max = config.beskatning_bracket_1_max || 300000
    const bracket1Pct = (config.beskatning_bracket_1_pct || 25) / 100
    const bracket2Pct = (config.beskatning_bracket_2_pct || 20) / 100

    const annualTaxableBenefit =
        bracket1Pct * Math.min(beskatningsgrundlag, bracket1Max) +
        bracket2Pct * Math.max(beskatningsgrundlag - bracket1Max, 0)

    // Environmental surcharge: grøn ejerafgift × miljø factor (250%)
    const groenEjerafgift = config.groen_ejerafgift_default_dkk || 5000
    const miljoeFactor = config.miljoe_factor || 2.5
    const miljoeTillaeg = groenEjerafgift * miljoeFactor

    // Monthly taxable benefit
    const totalAnnualBenefit = annualTaxableBenefit + miljoeTillaeg
    const monthlyTaxableBenefit = Math.round(totalAnnualBenefit / 12)

    // Employee net cost = monthly benefit × marginal tax rate
    const marginalRate = (config.marginal_tax_rate || 0.50)
    const employeeNetCostMonthly = Math.round(monthlyTaxableBenefit * marginalRate)

    return {
        beskatningsgrundlag: Math.round(beskatningsgrundlag),
        annualTaxableBenefit: Math.round(annualTaxableBenefit),
        miljoeTillaeg: Math.round(miljoeTillaeg),
        monthlyTaxableBenefit,
        employeeNetCostMonthly,
    }
}

// ============================================================
// 8. PURCHASE SCENARIO — private only (SPEC-021: company removed)
// ============================================================

async function calculatePurchaseScenario(
    car: CarRaw,
    origin: Origin,
    holdingYears: number,
    downPaymentDkk: number,
    loanRatePct: number,
    config: TcoConfig
) {
    const baseValue = car.price_amount

    let momsAmount = 0
    let importCosts = 0

    if (origin === 'dk_exlease' || origin === 'de_import_exlease') {
        momsAmount = Math.round(baseValue * 0.25)
    }

    if (origin === 'de_import' || origin === 'de_import_exlease') {
        importCosts = config.import_generic_costs_dkk
    }

    const afgiftspligtigVaerdi = baseValue + momsAmount

    let registrationTax = 0
    let evDeductionApplied = 0
    let taxNotes = ''

    if (origin !== 'dk_registered') {
        const taxResult = calculateRegistrationTax(
            afgiftspligtigVaerdi, car.fuel_type, car.co2_g_km, config
        )
        registrationTax = taxResult.tax
        evDeductionApplied = taxResult.evDeductionApplied
        taxNotes = taxResult.notes
    }

    const onRoadCost = baseValue + momsAmount + registrationTax + importCosts

    const financedAmount = Math.max(0, onRoadCost - downPaymentDkk)
    const loanTermMonths = holdingYears * 12
    const monthlyLoanPayment = financedAmount > 0
        ? monthlyAnnuityPayment(financedAmount, loanRatePct, loanTermMonths)
        : 0
    const totalLoanPayments = monthlyLoanPayment * loanTermMonths

    const { residualPct, source: depSource } = await getDepreciation(
        car.brand, car.model, car.fuel_type, holdingYears
    )
    const exitValue = Math.round(onRoadCost * residualPct)

    const totalOutOfPocket = Math.round(
        downPaymentDkk + totalLoanPayments - exitValue
    )
    const monthlyEquivalent = Math.round(totalOutOfPocket / (holdingYears * 12))

    return {
        car_id: car.id,
        holding_period_years: holdingYears,
        scenario_type: 'purchase' as ScenarioType,
        usage_type: 'private' as UsageType,
        origin,
        purchase_price_dkk: baseValue,
        moms_amount_dkk: momsAmount,
        afgiftspligtig_vaerdi_dkk: afgiftspligtigVaerdi,
        down_payment_dkk: downPaymentDkk,
        financed_amount_dkk: financedAmount,
        loan_rate_pct: loanRatePct,
        loan_term_months: loanTermMonths,
        monthly_loan_payment_dkk: Math.round(monthlyLoanPayment),
        registration_tax_dkk: registrationTax,
        ev_deduction_applied_dkk: evDeductionApplied,
        vat_saved_dkk: 0,
        import_costs_dkk: importCosts,
        total_on_road_cost_dkk: onRoadCost,
        fuel_energy_total_dkk: 0,
        insurance_total_dkk: 0,
        maintenance_total_dkk: 0,
        company_car_tax_total_dkk: 0,
        estimated_market_value_at_exit_dkk: exitValue,
        depreciation_source: depSource,
        net_exit_proceeds_dkk: exitValue,
        total_outofpocket_dkk: totalOutOfPocket,
        monthly_equivalent_dkk: monthlyEquivalent,
        vehicle_age_months: getVehicleAgeMonths(car.first_registration_year),
        notes: taxNotes || null,
    }
}

// ============================================================
// 9. FLEXLEASE — TAX BRACKET RATE
// ============================================================

function getFlexTaxBracketRate(vehicleAgeMonths: number): number {
    if (vehicleAgeMonths <= 3) return 0.02
    if (vehicleAgeMonths <= 36) return 0.01
    return 0.005
}

// ============================================================
// 10. FLEXLEASE — PRIVATE SCENARIO
// ============================================================

async function calculateFlexleasePrivate(
    car: CarRaw,
    holdingYears: number,
    config: TcoConfig
) {
    const baseValue = car.price_amount
    const vehicleAgeMonths = getVehicleAgeMonths(car.first_registration_year)
    const months = holdingYears * 12

    const momsForTax = Math.round(baseValue * 0.25)
    const afgiftspligtigVaerdi = baseValue + momsForTax
    const taxResult = calculateRegistrationTax(
        afgiftspligtigVaerdi, car.fuel_type, car.co2_g_km, config
    )
    const fullRegistrationTax = taxResult.tax

    const taxBracketRate = getFlexTaxBracketRate(vehicleAgeMonths)
    const monthlyFlexTax = fullRegistrationTax * taxBracketRate
    const stateResidualInterest = (config.state_residual_tax_interest || 3.8) / 100
    const leasingFinanceInterest = (config.leasing_finance_interest || 4.5) / 100
    const adminFeeMonthly = config.lease_admin_fee_monthly_dkk || 300

    const monthlyStateInterest = (fullRegistrationTax * stateResidualInterest) / 12
    const monthlyFinanceInterest = (baseValue * leasingFinanceInterest) / 12
    const totalExMoms = monthlyFlexTax + monthlyStateInterest + monthlyFinanceInterest + adminFeeMonthly
    const totalInclMoms = totalExMoms * 1.25

    let actualMonthlyPayment = totalInclMoms
    let paymentNote = `Computed: bracket ${taxBracketRate * 100}%, age ${vehicleAgeMonths}mo`

    if (car.lease_monthly_dkk && car.lease_monthly_dkk > 0) {
        actualMonthlyPayment = car.lease_monthly_dkk
        paymentNote = 'Monthly payment from listing. Decomposition estimated.'
    }

    const totalLeasePayments = actualMonthlyPayment * months

    const establishmentFeeExMoms = config.lease_establishment_fee_dkk || 5000
    const establishmentFeeInclMoms = Math.round(establishmentFeeExMoms * 1.25)
    const downPayment = car.lease_down_payment_dkk ?? 0

    const { residualPct, source: depSource } = await getDepreciation(
        car.brand, car.model, car.fuel_type, holdingYears
    )
    const depreciationExMoms = baseValue * (1 - residualPct)
    const depreciationInclMoms = Math.round(depreciationExMoms * 1.25)

    const exitValue = Math.round(baseValue * residualPct)

    let restvaerdiRisk = 0
    if (car.lease_restvaerdi_dkk && car.lease_restvaerdi_dkk > exitValue) {
        restvaerdiRisk = car.lease_restvaerdi_dkk - exitValue
    }

    const hasListedPayment = car.lease_monthly_dkk != null && car.lease_monthly_dkk > 0
    const totalOutOfPocket = Math.round(
        downPayment +
        establishmentFeeInclMoms +
        totalLeasePayments +
        restvaerdiRisk +
        (hasListedPayment ? 0 : depreciationInclMoms)
    )
    const monthlyEquivalent = Math.round(totalOutOfPocket / months)

    return {
        car_id: car.id,
        holding_period_years: holdingYears,
        scenario_type: 'flexlease' as ScenarioType,
        usage_type: 'private' as UsageType,
        origin: 'dk_registered' as Origin,
        purchase_price_dkk: baseValue,
        moms_amount_dkk: momsForTax,
        afgiftspligtig_vaerdi_dkk: afgiftspligtigVaerdi,
        down_payment_dkk: downPayment,
        financed_amount_dkk: null,
        loan_rate_pct: null,
        loan_term_months: null,
        monthly_loan_payment_dkk: null,
        registration_tax_dkk: fullRegistrationTax,
        ev_deduction_applied_dkk: taxResult.evDeductionApplied,
        vat_saved_dkk: null,
        import_costs_dkk: null,
        total_on_road_cost_dkk: null,
        lease_stiftelsesgebyr_dkk: establishmentFeeInclMoms,
        lease_tinglysning_dkk: null,
        lease_monthly_payment_dkk: Math.round(actualMonthlyPayment),
        lease_down_payment_dkk: downPayment,
        lease_term_months: months,
        lease_restvaerdi_dkk: car.lease_restvaerdi_dkk ?? null,
        lease_implied_apr_pct: null,
        lease_total_payments_dkk: Math.round(totalLeasePayments),
        lease_tax_bracket_rate: taxBracketRate,
        lease_monthly_flex_tax_dkk: Math.round(monthlyFlexTax),
        lease_monthly_state_interest_dkk: Math.round(monthlyStateInterest),
        lease_monthly_finance_interest_dkk: Math.round(monthlyFinanceInterest),
        lease_monthly_admin_fee_dkk: adminFeeMonthly,
        lease_monthly_ex_moms_dkk: Math.round(totalExMoms),
        lease_monthly_incl_moms_dkk: Math.round(totalInclMoms),
        vehicle_age_months: vehicleAgeMonths,
        fuel_energy_total_dkk: 0,
        insurance_total_dkk: 0,
        maintenance_total_dkk: 0,
        company_car_tax_total_dkk: 0,
        estimated_market_value_at_exit_dkk: exitValue,
        depreciation_source: depSource,
        restvaerdi_risk_dkk: restvaerdiRisk,
        net_exit_proceeds_dkk: exitValue,
        total_outofpocket_dkk: totalOutOfPocket,
        monthly_equivalent_dkk: monthlyEquivalent,
        notes: `${taxResult.notes}. ${paymentNote}`,
    }
}

// ============================================================
// 11. FLEXLEASE — COMPANY SCENARIO (SPEC-021)
// Split output: company cost (ex moms) + employee net cost
// ============================================================

async function calculateFlexleaseCompany(
    car: CarRaw,
    holdingYears: number,
    config: TcoConfig
) {
    const baseValue = car.price_amount
    const vehicleAgeMonths = getVehicleAgeMonths(car.first_registration_year)
    const months = holdingYears * 12

    const momsForTax = Math.round(baseValue * 0.25)
    const afgiftspligtigVaerdi = baseValue + momsForTax
    const taxResult = calculateRegistrationTax(
        afgiftspligtigVaerdi, car.fuel_type, car.co2_g_km, config
    )
    const fullRegistrationTax = taxResult.tax

    // Monthly decomposition (ex moms — company reclaims moms)
    const taxBracketRate = getFlexTaxBracketRate(vehicleAgeMonths)
    const monthlyFlexTax = fullRegistrationTax * taxBracketRate
    const stateResidualInterest = (config.state_residual_tax_interest || 3.8) / 100
    const leasingFinanceInterest = (config.leasing_finance_interest || 4.5) / 100
    const adminFeeMonthly = config.lease_admin_fee_monthly_dkk || 300

    const monthlyStateInterest = (fullRegistrationTax * stateResidualInterest) / 12
    const monthlyFinanceInterest = (baseValue * leasingFinanceInterest) / 12
    const totalExMoms = monthlyFlexTax + monthlyStateInterest + monthlyFinanceInterest + adminFeeMonthly

    // Company cost = what the company pays (ex moms)
    const companyCostMonthlyExMoms = Math.round(totalExMoms)

    // Employee taxation (beskatningsgrundlag)
    const beskatning = calculateBeskatning(
        baseValue, momsForTax, fullRegistrationTax, config
    )

    // Upfront costs (ex moms for company)
    const establishmentFeeExMoms = config.lease_establishment_fee_dkk || 5000
    const downPayment = car.lease_down_payment_dkk ?? 0

    const { residualPct, source: depSource } = await getDepreciation(
        car.brand, car.model, car.fuel_type, holdingYears
    )
    const depreciationExMoms = baseValue * (1 - residualPct)
    const exitValue = Math.round(baseValue * residualPct)

    let restvaerdiRisk = 0
    if (car.lease_restvaerdi_dkk && car.lease_restvaerdi_dkk > exitValue) {
        restvaerdiRisk = car.lease_restvaerdi_dkk - exitValue
    }

    // Company total (what the company pays over the period, ex moms)
    const companyTotalExMoms = Math.round(
        downPayment + establishmentFeeExMoms + (companyCostMonthlyExMoms * months)
    )

    // Employee total (what the employee pays in tax over the period)
    const employeeTotal = beskatning.employeeNetCostMonthly * months

    // Monthly equivalent = employee's actual out-of-pocket per month
    const monthlyEquivalent = beskatning.employeeNetCostMonthly

    return {
        car_id: car.id,
        holding_period_years: holdingYears,
        scenario_type: 'flexlease' as ScenarioType,
        usage_type: 'company' as UsageType,
        origin: 'dk_registered' as Origin,
        purchase_price_dkk: baseValue,
        moms_amount_dkk: momsForTax,
        afgiftspligtig_vaerdi_dkk: afgiftspligtigVaerdi,
        down_payment_dkk: downPayment,
        financed_amount_dkk: null,
        loan_rate_pct: null,
        loan_term_months: null,
        monthly_loan_payment_dkk: null,
        registration_tax_dkk: fullRegistrationTax,
        ev_deduction_applied_dkk: taxResult.evDeductionApplied,
        vat_saved_dkk: null,
        import_costs_dkk: null,
        total_on_road_cost_dkk: null,
        lease_stiftelsesgebyr_dkk: establishmentFeeExMoms,
        lease_tinglysning_dkk: null,
        lease_monthly_payment_dkk: companyCostMonthlyExMoms,
        lease_down_payment_dkk: downPayment,
        lease_term_months: months,
        lease_restvaerdi_dkk: car.lease_restvaerdi_dkk ?? null,
        lease_implied_apr_pct: null,
        lease_total_payments_dkk: Math.round(companyCostMonthlyExMoms * months),
        lease_tax_bracket_rate: taxBracketRate,
        lease_monthly_flex_tax_dkk: Math.round(monthlyFlexTax),
        lease_monthly_state_interest_dkk: Math.round(monthlyStateInterest),
        lease_monthly_finance_interest_dkk: Math.round(monthlyFinanceInterest),
        lease_monthly_admin_fee_dkk: adminFeeMonthly,
        lease_monthly_ex_moms_dkk: Math.round(totalExMoms),
        lease_monthly_incl_moms_dkk: null,
        vehicle_age_months: vehicleAgeMonths,
        fuel_energy_total_dkk: 0,
        insurance_total_dkk: 0,
        maintenance_total_dkk: 0,
        company_car_tax_total_dkk: 0,
        company_cost_monthly_ex_moms_dkk: companyCostMonthlyExMoms,
        beskatningsgrundlag_dkk: beskatning.beskatningsgrundlag,
        annual_taxable_benefit_dkk: beskatning.annualTaxableBenefit,
        miljoe_tillaeg_dkk: beskatning.miljoeTillaeg,
        monthly_taxable_benefit_dkk: beskatning.monthlyTaxableBenefit,
        employee_net_cost_monthly_dkk: beskatning.employeeNetCostMonthly,
        estimated_market_value_at_exit_dkk: exitValue,
        depreciation_source: depSource,
        restvaerdi_risk_dkk: restvaerdiRisk,
        net_exit_proceeds_dkk: exitValue,
        total_outofpocket_dkk: employeeTotal,
        monthly_equivalent_dkk: monthlyEquivalent,
        notes: `SPEC-021 erhvervsleasing. ${taxResult.notes}. Company: ${companyCostMonthlyExMoms} kr/md ex moms`,
    }
}

// ============================================================
// 12. MATRIX RUNNER — entry point
// ============================================================

export async function computeAllScenarios(
    carId: string,
    downPaymentDkk?: number,
    loanRatePct?: number
) {
    const { data: car, error: carError } = await supabase
        .from('cars_raw')
        .select('*')
        .eq('id', carId)
        .single()

    if (carError || !car) throw new Error(`Car not found: ${carId}`)

    const config = await readTcoConfig()
    const effectiveDownPayment = downPaymentDkk ?? (config as any).user_down_payment_dkk ?? 200000
    const effectiveLoanRate = loanRatePct ?? (config as any).user_loan_rate_pct ?? 5.0

    const eurRate = config.eur_to_dkk_rate || 7.46
    if (car.price_currency === 'EUR') {
        car.price_amount = Math.round(car.price_amount * eurRate)
    }

    await supabase.from('tco_scenarios').delete().eq('car_id', carId)

    const scenarios = []
    const purchasePeriods = [1, 2, 3, 5]
    const leasePeriods = [1, 2, 3]

    const origins = determineOrigins(car)

    // Purchase scenarios — PRIVATE ONLY (SPEC-021: company purchase removed)
    const isLeaseOnly = car.listing_type === 'lease' && car.price_amount === car.lease_monthly_dkk
    if (!isLeaseOnly) {
        for (const years of purchasePeriods) {
            for (const origin of origins) {
                const scenario = await calculatePurchaseScenario(
                    car, origin, years, effectiveDownPayment, effectiveLoanRate, config
                )
                scenarios.push(scenario)
            }
        }
    }

    // Flexlease — private (full TCO with moms)
    for (const years of leasePeriods) {
        const scenario = await calculateFlexleasePrivate(car, years, config)
        scenarios.push(scenario)
    }

    // Flexlease — company (split: company cost + employee beskatning)
    for (const years of leasePeriods) {
        const scenario = await calculateFlexleaseCompany(car, years, config)
        scenarios.push(scenario)
    }

    const { error: insertError } = await supabase
        .from('tco_scenarios')
        .insert(scenarios)

    if (insertError) throw new Error(`Failed to write scenarios: ${insertError.message}`)

    return {
        car_id: carId,
        scenarios_computed: scenarios.length,
    }
}
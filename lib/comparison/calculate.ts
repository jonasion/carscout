import type {
    ComparisonCar, ComparisonSettings, Origin,
    PurchaseBreakdown, FlexleaseBreakdown, TaxBracketMonth,
    CarComparisonResult
} from './types'

// ============================================================
// REGISTRATION TAX — 2026 rules (client-side mirror)
// Input: afgiftspligtigVaerdi (market value INCL. 25% moms)
// ============================================================

function calculateRegistrationTax(
    afgiftspligtigVaerdi: number,
    fuelType: string,
    co2GKm: number | null,
    settings: ComparisonSettings
): { tax: number; evDeductionApplied: number; notes: string } {

    const isEV = fuelType?.toLowerCase() === 'el' || fuelType?.toLowerCase() === 'electric'

    let taxableValue: number
    let evDeductionApplied = 0
    let notes = 'ICE 2026 brackets'

    if (isEV) {
        evDeductionApplied = settings.evDeductionDkk
        taxableValue = afgiftspligtigVaerdi - evDeductionApplied - settings.regTaxBaseDeduction
        notes = 'EV 2026 brackets — 60% discount applied'
    } else {
        taxableValue = afgiftspligtigVaerdi - settings.regTaxBaseDeduction
    }

    taxableValue = Math.max(0, taxableValue)

    let rawTax = 0
    const b1max = settings.regTaxBracket1Max
    const b2max = settings.regTaxBracket2Max

    if (taxableValue <= b1max) {
        rawTax = taxableValue * (settings.regTaxBracket1Pct / 100)
    } else if (taxableValue <= b2max) {
        rawTax =
            b1max * (settings.regTaxBracket1Pct / 100) +
            (taxableValue - b1max) * (settings.regTaxBracket2Pct / 100)
    } else {
        rawTax =
            b1max * (settings.regTaxBracket1Pct / 100) +
            (b2max - b1max) * (settings.regTaxBracket2Pct / 100) +
            (taxableValue - b2max) * (settings.regTaxBracket3Pct / 100)
    }

    // CO2 surcharge (ICE only)
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
        const discountPct = settings.evDiscountPct2026 / 100
        finalTax = rawTax * (1 - discountPct)
    }

    return { tax: Math.round(finalTax), evDeductionApplied, notes }
}

// ============================================================
// VEHICLE AGE
// ============================================================

function getVehicleAgeMonths(firstRegistrationYear: number): number {
    const firstReg = new Date(firstRegistrationYear, 0, 1)
    return Math.floor(
        (Date.now() - firstReg.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
}

// ============================================================
// FLEX TAX BRACKET — month by month
// ============================================================

function getFlexTaxBracketRate(vehicleAgeMonths: number): number {
    if (vehicleAgeMonths <= 3) return 0.02
    if (vehicleAgeMonths <= 36) return 0.01
    return 0.005
}

function computeFlexTaxMonthByMonth(
    fullRegistrationTax: number,
    vehicleAgeMonthsAtStart: number,
    durationMonths: number
): { breakdown: TaxBracketMonth[]; total: number } {
    const breakdown: TaxBracketMonth[] = []
    let total = 0

    for (let m = 0; m < durationMonths; m++) {
        const ageAtMonth = vehicleAgeMonthsAtStart + m
        const rate = getFlexTaxBracketRate(ageAtMonth)
        const amount = fullRegistrationTax * rate
        breakdown.push({ month: m + 1, vehicleAge: ageAtMonth, rate, amount })
        total += amount
    }

    return { breakdown, total }
}

// ============================================================
// ORIGIN DETERMINATION
// ============================================================

function determineOrigins(car: ComparisonCar): Origin[] {
    if (car.is_registered_dk) return ['dk_registered']
    if (car.country === 'DK') return ['dk_exlease']
    if (car.country === 'DE') return ['de_import', 'de_import_exlease']
    // Other EU countries: treat as de_import
    return ['de_import']
}

// ============================================================
// DEPRECIATION — Tier 2 heuristic (client-side only)
// ============================================================

const TIER2_DEPRECIATION: Record<string, number[]> = {
    ice_petrol: [0.82, 0.72, 0.63, 0.57, 0.52],
    ice_diesel: [0.80, 0.70, 0.61, 0.55, 0.50],
    ev_mainstream: [0.78, 0.66, 0.56, 0.50, 0.46],
    ev_early: [0.73, 0.60, 0.49, 0.42, 0.37],
    phev: [0.80, 0.68, 0.58, 0.51, 0.47],
}

function getResidualPct(fuelType: string, durationMonths: number): number {
    const ft = fuelType?.toLowerCase()
    let segment = 'ice_petrol'
    if (ft === 'el' || ft === 'electric') segment = 'ev_mainstream'
    else if (ft === 'diesel') segment = 'ice_diesel'
    else if (ft === 'phev' || ft === 'plugin') segment = 'phev'

    const curve = TIER2_DEPRECIATION[segment]
    const years = durationMonths / 12
    // Interpolate for fractional years
    const lowerIdx = Math.max(0, Math.floor(years) - 1)
    const upperIdx = Math.min(curve.length - 1, Math.ceil(years) - 1)

    if (lowerIdx === upperIdx) return curve[lowerIdx]

    const fraction = years - Math.floor(years)
    return curve[lowerIdx] + (curve[upperIdx] - curve[lowerIdx]) * fraction
}

// ============================================================
// PURCHASE CALCULATION
// ============================================================

function calculatePurchase(
    baseValueDkk: number,
    origin: Origin,
    fuelType: string,
    co2GKm: number | null,
    settings: ComparisonSettings
): PurchaseBreakdown {

    // Moms
    let momsAmount = 0
    let importCosts = 0

    if (origin === 'dk_exlease' || origin === 'de_import_exlease') {
        momsAmount = Math.round(baseValueDkk * 0.25)
    }
    if (origin === 'de_import' || origin === 'de_import_exlease') {
        importCosts = 15000
    }

    // Registration tax on afgiftspligtig værdi
    const afgiftspligtigVaerdi = baseValueDkk + momsAmount

    let registrationTax = 0
    let evDeductionApplied = 0
    let notes = ''

    if (origin !== 'dk_registered') {
        const taxResult = calculateRegistrationTax(
            afgiftspligtigVaerdi, fuelType, co2GKm, settings
        )
        registrationTax = taxResult.tax
        evDeductionApplied = taxResult.evDeductionApplied
        notes = taxResult.notes
    }

    const totalPriceOnPlates = baseValueDkk + momsAmount + registrationTax + importCosts

    // Financing
    const downPayment = Math.min(settings.downPayment, totalPriceOnPlates)
    const bankLoan = totalPriceOnPlates - downPayment
    const durationYears = settings.durationMonths / 12
    const interestCost = Math.round(bankLoan * (settings.bankInterestRate / 100) * durationYears)

    // Depreciation on total price (buyer owns full asset)
    const residualPct = getResidualPct(fuelType, settings.durationMonths)
    const depreciation = Math.round(totalPriceOnPlates * (1 - residualPct))

    // TCO
    const tcoTotal = depreciation + interestCost + settings.loanEstablishmentFee
    const monthlyEquivalent = Math.round(tcoTotal / settings.durationMonths)

    return {
        origin,
        baseValue: baseValueDkk,
        momsAmount,
        afgiftspligtigVaerdi,
        registrationTax,
        evDeductionApplied,
        importCosts,
        totalPriceOnPlates,
        downPayment,
        bankLoan,
        interestCost,
        depreciation,
        establishmentFee: settings.loanEstablishmentFee,
        tcoTotal,
        monthlyEquivalent,
        notes,
    }
}

// ============================================================
// FLEXLEASE CALCULATION
// ============================================================

function calculateFlexlease(
    baseValueDkk: number,
    fuelType: string,
    co2GKm: number | null,
    firstRegistrationYear: number,
    listedMonthlyPayment: number | null,
    listedDownPayment: number | null,
    settings: ComparisonSettings
): FlexleaseBreakdown {

    const vehicleAgeMonths = getVehicleAgeMonths(firstRegistrationYear)
    const durationMonths = settings.durationMonths

    // Registration tax (for flex tax calculation)
    const momsForTax = Math.round(baseValueDkk * 0.25)
    const afgiftspligtigVaerdi = baseValueDkk + momsForTax
    const taxResult = calculateRegistrationTax(
        afgiftspligtigVaerdi, fuelType, co2GKm, settings
    )
    const fullRegistrationTax = taxResult.tax

    // Month-by-month flex tax
    const { breakdown: taxBracketBreakdown, total: totalFlexTaxOverPeriod } =
        computeFlexTaxMonthByMonth(fullRegistrationTax, vehicleAgeMonths, durationMonths)

    const monthlyFlexTaxAvg = totalFlexTaxOverPeriod / durationMonths

    // Other monthly components (ex moms)
    const monthlyStateInterest = (fullRegistrationTax * (settings.stateResidualRate / 100)) / 12
    const monthlyFinanceInterest = (baseValueDkk * (settings.leasingFinanceRate / 100)) / 12
    const monthlyAdminFee = settings.adminFeeMonthly

    const totalMonthlyExMoms = monthlyFlexTaxAvg + monthlyStateInterest + monthlyFinanceInterest + monthlyAdminFee
    const totalMonthlyInclMoms = totalMonthlyExMoms * 1.25 // private consumer

    // Use listed payment if available
    const actualMonthly = (listedMonthlyPayment && listedMonthlyPayment > 0)
        ? listedMonthlyPayment
        : totalMonthlyInclMoms

    // Upfront
    const establishmentFeeInclMoms = Math.round(settings.leaseEstablishmentFee * 1.25)
    const downPayment = listedDownPayment ?? 0

    // Depreciation on base value only
    const residualPct = getResidualPct(fuelType, durationMonths)
    const depreciationExMoms = baseValueDkk * (1 - residualPct)
    const depreciationInclMoms = Math.round(depreciationExMoms * 1.25)

    // Total
    const hasListedPayment = listedMonthlyPayment != null && listedMonthlyPayment > 0
    const totalLeasePayments = actualMonthly * durationMonths
    const tcoTotal = Math.round(
        downPayment +
        establishmentFeeInclMoms +
        totalLeasePayments +
        (hasListedPayment ? 0 : depreciationInclMoms)
    )
    const monthlyEquivalent = Math.round(tcoTotal / durationMonths)

    const notes = hasListedPayment
        ? `Monthly from listing. ${taxResult.notes}`
        : `Computed: age ${vehicleAgeMonths}mo. ${taxResult.notes}`

    // First month's rate for display
    const monthlyFlexTax = fullRegistrationTax * getFlexTaxBracketRate(vehicleAgeMonths)

    return {
        baseValue: baseValueDkk,
        fullRegistrationTax,
        vehicleAgeMonths,
        durationMonths,
        monthlyFlexTax,
        monthlyFlexTaxAvg,
        monthlyStateInterest,
        monthlyFinanceInterest,
        monthlyAdminFee,
        totalMonthlyExMoms,
        totalMonthlyInclMoms,
        taxBracketBreakdown,
        totalFlexTaxOverPeriod,
        establishmentFeeInclMoms,
        depreciationInclMoms,
        downPayment,
        tcoTotal,
        monthlyEquivalent,
        listedMonthlyPayment,
        notes,
    }
}

// ============================================================
// MAIN ENTRY — compute all breakdowns for one car
// ============================================================

export function computeCarComparison(
    car: ComparisonCar,
    settings: ComparisonSettings
): CarComparisonResult {

    // Convert EUR to DKK if needed
    const priceDkk = car.price_currency === 'EUR'
        ? Math.round(car.price_amount * settings.eurToDkkRate)
        : car.price_amount

    const origins = determineOrigins(car)

    // Purchase for each applicable origin
    const purchase: Record<string, PurchaseBreakdown> = {}
    for (const origin of origins) {
        purchase[origin] = calculatePurchase(
            priceDkk, origin, car.fuel_type, car.co2_g_km, settings
        )
    }

    // Flexlease (always computed)
    const flexlease = calculateFlexlease(
        priceDkk,
        car.fuel_type,
        car.co2_g_km,
        car.first_registration_year,
        car.lease_monthly_dkk,
        car.lease_down_payment_dkk,
        settings
    )

    return {
        car,
        priceDkk,
        origins,
        purchase: purchase as Record<Origin, PurchaseBreakdown>,
        flexlease,
    }
}
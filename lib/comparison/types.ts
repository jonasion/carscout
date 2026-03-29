export type Origin = 'dk_registered' | 'dk_exlease' | 'de_import' | 'de_import_exlease'

export interface ComparisonCar {
    id: string
    brand: string
    model: string
    variant: string
    first_registration_year: number
    mileage_km: number
    price_amount: number
    price_currency: 'DKK' | 'EUR'
    fuel_type: string
    country: string
    source: string
    co2_g_km: number | null
    power_kw: number | null
    stored_image_url: string | null
    is_registered_dk: boolean
    listing_type: string
    lease_monthly_dkk: number | null
    lease_down_payment_dkk: number | null
    lease_restvaerdi_dkk: number | null
}

export interface ComparisonSettings {
    durationMonths: number            // 12, 24, or 36
    bankInterestRate: number          // e.g. 4.0
    leasingFinanceRate: number        // e.g. 4.5
    stateResidualRate: number         // e.g. 3.8
    depreciationRate: number          // e.g. 15 (annual %)
    downPayment: number               // e.g. 200000
    loanEstablishmentFee: number      // e.g. 5000
    leaseEstablishmentFee: number     // e.g. 5000 (ex moms)
    adminFeeMonthly: number           // e.g. 300
    eurToDkkRate: number              // e.g. 7.46
    // Registration tax config
    regTaxBaseDeduction: number       // 24300
    regTaxBracket1Pct: number         // 25
    regTaxBracket1Max: number         // 72900
    regTaxBracket2Pct: number         // 85
    regTaxBracket2Max: number         // 226500
    regTaxBracket3Pct: number         // 150
    evDeductionDkk: number            // 165000
    evDiscountPct2026: number         // 60
}

export interface PurchaseBreakdown {
    origin: Origin
    baseValue: number
    momsAmount: number
    afgiftspligtigVaerdi: number
    registrationTax: number
    evDeductionApplied: number
    importCosts: number
    totalPriceOnPlates: number
    downPayment: number
    bankLoan: number
    interestCost: number
    depreciation: number
    establishmentFee: number
    tcoTotal: number
    monthlyEquivalent: number
    notes: string
}

export interface FlexleaseBreakdown {
    baseValue: number
    fullRegistrationTax: number
    vehicleAgeMonths: number
    durationMonths: number
    // Monthly decomposition (ex moms)
    monthlyFlexTax: number
    monthlyFlexTaxAvg: number         // avg if rate transitions mid-lease
    monthlyStateInterest: number
    monthlyFinanceInterest: number
    monthlyAdminFee: number
    totalMonthlyExMoms: number
    totalMonthlyInclMoms: number
    // Tax bracket detail
    taxBracketBreakdown: TaxBracketMonth[]
    totalFlexTaxOverPeriod: number
    // Totals
    establishmentFeeInclMoms: number
    depreciationInclMoms: number
    downPayment: number
    tcoTotal: number
    monthlyEquivalent: number
    listedMonthlyPayment: number | null
    notes: string
}

export interface TaxBracketMonth {
    month: number
    vehicleAge: number
    rate: number
    amount: number
}

export interface CarComparisonResult {
    car: ComparisonCar
    priceDkk: number                  // converted if EUR
    origins: Origin[]
    purchase: Record<Origin, PurchaseBreakdown>
    flexlease: FlexleaseBreakdown
}

export const DEFAULT_SETTINGS: ComparisonSettings = {
    durationMonths: 12,
    bankInterestRate: 4.0,
    leasingFinanceRate: 4.5,
    stateResidualRate: 3.8,
    depreciationRate: 15,
    downPayment: 200000,
    loanEstablishmentFee: 5000,
    leaseEstablishmentFee: 5000,
    adminFeeMonthly: 300,
    eurToDkkRate: 7.46,
    regTaxBaseDeduction: 24300,
    regTaxBracket1Pct: 25,
    regTaxBracket1Max: 72900,
    regTaxBracket2Pct: 85,
    regTaxBracket2Max: 226500,
    regTaxBracket3Pct: 150,
    evDeductionDkk: 165000,
    evDiscountPct2026: 60,
}
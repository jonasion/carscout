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
    durationMonths: number
    bankInterestRate: number
    leasingFinanceRate: number
    stateResidualRate: number
    depreciationRate: number
    downPayment: number
    loanEstablishmentFee: number
    leaseEstablishmentFee: number
    adminFeeMonthly: number
    eurToDkkRate: number
    // Registration tax config
    regTaxBaseDeduction: number
    regTaxBracket1Pct: number
    regTaxBracket1Max: number
    regTaxBracket2Pct: number
    regTaxBracket2Max: number
    regTaxBracket3Pct: number
    evDeductionDkk: number
    evDiscountPct2026: number
    // SPEC-021: corporate cost model
    marginalTaxRate: number
    miljoeFactor: number
    beskatningBracket1Pct: number
    beskatningBracket1Max: number
    beskatningBracket2Pct: number
    beskatningMinBaseDkk: number
    groenEjerafgiftDkk: number
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
    monthlyFlexTax: number
    monthlyFlexTaxAvg: number
    monthlyStateInterest: number
    monthlyFinanceInterest: number
    monthlyAdminFee: number
    totalMonthlyExMoms: number
    totalMonthlyInclMoms: number
    taxBracketBreakdown: TaxBracketMonth[]
    totalFlexTaxOverPeriod: number
    establishmentFeeInclMoms: number
    depreciationInclMoms: number
    downPayment: number
    tcoTotal: number
    monthlyEquivalent: number
    listedMonthlyPayment: number | null
    notes: string
}

export interface CompanyFlexleaseBreakdown {
    baseValue: number
    fullRegistrationTax: number
    vehicleAgeMonths: number
    durationMonths: number
    // Company cost (ex moms)
    companyCostMonthlyExMoms: number
    monthlyFlexTax: number
    monthlyStateInterest: number
    monthlyFinanceInterest: number
    monthlyAdminFee: number
    totalMonthlyExMoms: number
    establishmentFeeExMoms: number
    // Employee taxation
    beskatningsgrundlag: number
    annualTaxableBenefit: number
    miljoeTillaeg: number
    monthlyTaxableBenefit: number
    employeeNetCostMonthly: number
    marginalTaxRate: number
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
    priceDkk: number
    origins: Origin[]
    purchase: Record<Origin, PurchaseBreakdown>
    flexlease: FlexleaseBreakdown
    companyFlexlease: CompanyFlexleaseBreakdown
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
    // SPEC-021 defaults
    marginalTaxRate: 0.50,
    miljoeFactor: 2.5,
    beskatningBracket1Pct: 25,
    beskatningBracket1Max: 300000,
    beskatningBracket2Pct: 20,
    beskatningMinBaseDkk: 160000,
    groenEjerafgiftDkk: 5000,
}
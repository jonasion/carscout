export type Origin = 'dk_registered' | 'dk_exlease' | 'de_import' | 'de_import_exlease'
export type DownPaymentMode = 'fixed' | 'percent'

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
    // Purchase
    downPaymentMode: DownPaymentMode
    downPaymentFixed: number
    downPaymentPercent: number
    loanTermMonths: number
    bankInterestRate: number
    loanEstablishmentFee: number
    // Flexlease
    leaseDownPaymentMode: DownPaymentMode
    leaseDownPaymentFixed: number
    leaseDownPaymentPercent: number
    autoMatchLeaseDown: boolean
    leaseTermMonths: number
    leasingFinanceRate: number
    stateResidualRate: number
    leaseEstablishmentFee: number
    adminFeeMonthly: number
    // General
    depreciationRate: number
    eurToDkkRate: number
    // Registration tax
    regTaxBaseDeduction: number
    regTaxBracket1Pct: number
    regTaxBracket1Max: number
    regTaxBracket2Pct: number
    regTaxBracket2Max: number
    regTaxBracket3Pct: number
    evDeductionDkk: number
    evDiscountPct2026: number
    // Corporate
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
    loanTermMonths: number
    interestCost: number
    depreciation: number
    depreciationPct: number
    restvaerdi: number
    establishmentFee: number
    tcoTotal: number
    monthlyEquivalent: number
    notes: string
}

export interface FlexleaseBreakdown {
    baseValue: number
    fullRegistrationTax: number
    vehicleAgeMonths: number
    leaseTermMonths: number
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
    depreciationPct: number
    restvaerdiInclMoms: number
    downPayment: number
    downPaymentSurplus: number
    autoMatched: boolean
    tcoTotal: number
    monthlyEquivalent: number
    listedMonthlyPayment: number | null
    notes: string
}

export interface CompanyFlexleaseBreakdown {
    baseValue: number
    fullRegistrationTax: number
    vehicleAgeMonths: number
    leaseTermMonths: number
    companyCostMonthlyExMoms: number
    monthlyFlexTax: number
    monthlyStateInterest: number
    monthlyFinanceInterest: number
    monthlyAdminFee: number
    totalMonthlyExMoms: number
    establishmentFeeExMoms: number
    depreciationExMoms: number
    depreciationPct: number
    restvaerdiExMoms: number
    companyTotalCost: number
    companyMonthlyCostIncDepreciation: number
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
    bestPurchaseOrigin: Origin
    flexlease: FlexleaseBreakdown
    companyFlexlease: CompanyFlexleaseBreakdown
    insights: string[]
}

export const DEFAULT_SETTINGS: ComparisonSettings = {
    downPaymentMode: 'fixed',
    downPaymentFixed: 200000,
    downPaymentPercent: 20,
    loanTermMonths: 60,
    bankInterestRate: 4.0,
    loanEstablishmentFee: 5000,
    leaseDownPaymentMode: 'fixed',
    leaseDownPaymentFixed: 50000,
    leaseDownPaymentPercent: 10,
    autoMatchLeaseDown: true,
    leaseTermMonths: 24,
    leasingFinanceRate: 4.5,
    stateResidualRate: 3.8,
    leaseEstablishmentFee: 5000,
    adminFeeMonthly: 300,
    depreciationRate: 15,
    eurToDkkRate: 7.46,
    regTaxBaseDeduction: 24300,
    regTaxBracket1Pct: 25,
    regTaxBracket1Max: 72900,
    regTaxBracket2Pct: 85,
    regTaxBracket2Max: 226500,
    regTaxBracket3Pct: 150,
    evDeductionDkk: 165000,
    evDiscountPct2026: 60,
    marginalTaxRate: 0.50,
    miljoeFactor: 2.5,
    beskatningBracket1Pct: 25,
    beskatningBracket1Max: 300000,
    beskatningBracket2Pct: 20,
    beskatningMinBaseDkk: 160000,
    groenEjerafgiftDkk: 5000,
}
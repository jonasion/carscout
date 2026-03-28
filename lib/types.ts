export type Car = {
    id: string
    brand: string
    model: string
    variant: string
    first_registration_year: number
    mileage_km: number
    price_amount: number
    price_currency: "DKK" | "EUR"
    fuel_type: "el" | "benzin" | "diesel" | "hybrid"
    country: "DK" | "DE"
    source: "bilbasen" | "autoscout24"
    stored_image_url: string | null
    power_kw: number
    transmission: "automatic" | "manual"
    dealer_name: string
    dealer_phone: string
}

export type TCOScenario = {
    id: string
    car_id: string
    scenario_type: "purchase" | "flexlease"
    usage_type: "private" | "company"
    holding_period_years: number
    origin: string
    purchase_price_dkk: number
    down_payment_dkk: number | null
    financed_amount_dkk: number | null
    loan_rate_pct: number | null
    loan_term_months: number | null
    monthly_loan_payment_dkk: number | null
    lease_monthly_payment_dkk: number | null
    lease_term_months: number | null
    lease_total_payments_dkk: number | null
    registration_tax_dkk: number | null
    ev_deduction_applied_dkk: number | null
    vat_saved_dkk: number | null
    import_costs_dkk: number | null
    total_on_road_cost_dkk: number | null
    fuel_energy_total_dkk: number | null
    insurance_total_dkk: number | null
    maintenance_total_dkk: number | null
    company_car_tax_total_dkk: number | null
    estimated_market_value_at_exit_dkk: number | null
    depreciation_source: string | null
    net_exit_proceeds_dkk: number | null
    total_outofpocket_dkk: number
    monthly_equivalent_dkk: number
    notes: string | null
}

export type FinancingSensitivity = {
    down_payment_dkk: number
    private_monthly_dkk: number
    company_monthly_dkk: number
}

export type TCOData = {
    car_id: string
    tco_scenarios: TCOScenario[]
    financing_sensitivity: FinancingSensitivity[]
}

export type FilterState = {
    brand: string
    model: string
    min_year: string
    max_year: string
    max_mileage: string
    min_price: string
    max_price: string
    fuel_type: string
    transmission: string
    min_power_kw: string
    max_co2: string
    country: string
    source: string
}

export type FilterOptions = {
    brands: string[]
    modelsByBrand: Record<string, string[]>
    yearRange: { min: number; max: number }
    fuelTypes: string[]
    transmissions: string[]
    countries: string[]
    sources: string[]
}
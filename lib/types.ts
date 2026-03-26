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
    scenario_type: "purchase"
    usage_type: "private" | "company"
    holding_period_years: 2 | 3 | 5
    monthly_equivalent_dkk: number
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
    fuel_type: string
    source: string
    country: string
    min_price: string
    max_price: string
}

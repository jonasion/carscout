export type FuelType = 'benzin' | 'diesel' | 'el' | 'hybrid'
export type Transmission = 'manuel' | 'automatisk'
export type TcoScenario = 'private_domestic' | 'private_import' | 'company_domestic' | 'company_import'

export interface Car {
    id: string
    source: string
    source_id: string
    url?: string
    make: string
    model: string
    variant?: string
    year?: number
    mileage_km?: number
    price_dkk?: number
    fuel_type?: FuelType
    transmission?: Transmission
    first_reg_date?: string
    country_origin: string
    raw_data?: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface SearchProfile {
    id: string
    name: string
    make?: string
    model?: string
    year_min?: number
    year_max?: number
    price_max_dkk?: number
    mileage_max_km?: number
    fuel_type?: FuelType
    include_import: boolean
    active: boolean
    created_at: string
}

export interface TcoResult {
    id: string
    car_id: string
    scenario: TcoScenario
    purchase_price?: number
    registration_tax?: number
    vat_amount?: number
    annual_fuel_dkk?: number
    annual_insurance?: number
    annual_service?: number
    residual_value?: number
    tco_5yr_total?: number
    monthly_equiv?: number
    assumptions?: Record<string, unknown>
    calculated_at: string
}

export interface PriceHistory {
    id: string
    car_id: string
    price_dkk: number
    recorded_at: string
}
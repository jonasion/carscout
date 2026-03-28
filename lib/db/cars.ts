// ============================================================
// CARSCOUT DB LAYER — cars_raw
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================
// TYPES
// ============================================================

export interface CarInsert {
    source: string
    source_listing_id: string
    url?: string
    title?: string
    brand?: string
    model?: string
    variant?: string
    first_registration_year?: number
    mileage_km?: number
    fuel_type?: string
    transmission?: string
    power_kw?: number
    co2_g_km?: number
    battery_kwh?: number
    range_km?: number
    consumption_l_100km?: number
    consumption_kwh_100km?: number
    price_amount?: number
    price_currency?: string
    country?: string
    is_registered_dk?: boolean
    has_dk_vat?: boolean
    listing_type?: string
    lease_monthly_dkk?: number
    lease_down_payment_dkk?: number
    lease_term_months?: number
    lease_km_per_year?: number
    lease_restvaerdi_dkk?: number
    image_urls?: string[]
    dealer_name?: string
    dealer_email?: string
    dealer_phone?: string
    raw_json?: Record<string, unknown>
}

// ============================================================
// PRICE HISTORY — record a price point for a car
// ============================================================

async function recordPriceHistory(
    carId: string,
    priceAmount: number,
    priceCurrency: string,
    scrapedAt: string
): Promise<void> {
    // Compute days on market from cars_raw.scraped_at (first seen date)
    const { data: car } = await supabase
        .from('cars_raw')
        .select('scraped_at')
        .eq('id', carId)
        .single()

    const firstSeen = car?.scraped_at ? new Date(car.scraped_at) : new Date()
    const daysOnMarket = Math.floor(
        (new Date(scrapedAt).getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)
    )

    const { error } = await supabase
        .from('price_history')
        .insert({
            car_id: carId,
            price_amount: priceAmount,
            price_currency: priceCurrency,
            recorded_at: scrapedAt,
            days_on_market: daysOnMarket,
        })

    if (error) console.error('recordPriceHistory error:', error.message)
}

// ============================================================
// UPSERT — insert or update by source + source_listing_id
// Tracks price changes in price_history
// ============================================================

export async function upsertCar(car: CarInsert): Promise<string | null> {
    const now = new Date().toISOString()

    // Check if car already exists and what its current price is
    const { data: existing } = await supabase
        .from('cars_raw')
        .select('id, price_amount, scraped_at')
        .eq('source', car.source)
        .eq('source_listing_id', car.source_listing_id)
        .single()

    // Upsert the car row
    const { data, error } = await supabase
        .from('cars_raw')
        .upsert(
            {
                ...car,
                updated_at: now,
            },
            {
                onConflict: 'source,source_listing_id',
                ignoreDuplicates: false,
            }
        )
        .select('id')
        .single()

    if (error) {
        console.error('upsertCar error:', error.message, car.source_listing_id)
        return null
    }

    const carId = data?.id ?? null
    if (!carId || !car.price_amount) return carId

    const priceChanged = !existing || existing.price_amount !== car.price_amount
    const isNewCar = !existing

    // Record price history if: new car, or price has changed
    if (isNewCar || priceChanged) {
        await recordPriceHistory(
            carId,
            car.price_amount,
            car.price_currency ?? 'DKK',
            now
        )

        if (!isNewCar && priceChanged) {
            console.log(
                `Price change detected: ${car.source_listing_id} ` +
                `${existing.price_amount} → ${car.price_amount} ${car.price_currency ?? 'DKK'}`
            )
        }
    }

    return carId
}

// ============================================================
// MARK SOLD
// ============================================================

export async function markCarSold(
    source: string,
    sourceListingId: string
): Promise<void> {
    const { error } = await supabase
        .from('cars_raw')
        .update({ is_sold: true, updated_at: new Date().toISOString() })
        .eq('source', source)
        .eq('source_listing_id', sourceListingId)

    if (error) console.error('markCarSold error:', error.message)
}

// ============================================================
// UPDATE STORED IMAGE URL
// ============================================================

export async function updateStoredImageUrl(
    carId: string,
    storedImageUrl: string
): Promise<void> {
    const { error } = await supabase
        .from('cars_raw')
        .update({ stored_image_url: storedImageUrl })
        .eq('id', carId)

    if (error) console.error('updateStoredImageUrl error:', error.message)
}

// ============================================================
// GET CAR BY ID
// ============================================================

export async function getCarById(carId: string) {
    const { data, error } = await supabase
        .from('cars_raw')
        .select('*')
        .eq('id', carId)
        .single()

    if (error) {
        console.error('getCarById error:', error.message)
        return null
    }

    return data
}

// ============================================================
// GET PRICE HISTORY FOR A CAR
// ============================================================

export async function getPriceHistory(carId: string) {
    const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('car_id', carId)
        .order('recorded_at', { ascending: true })

    if (error) {
        console.error('getPriceHistory error:', error.message)
        return []
    }

    return data
}

// ============================================================
// LIST CARS — with optional filters
// ============================================================

export async function listCars(filters?: {
    source?: string
    brand?: string
    model?: string
    fuel_type?: string
    transmission?: string
    country?: string
    min_price?: number
    max_price?: number
    min_year?: number
    max_year?: number
    max_mileage?: number
    min_power_kw?: number
    max_co2?: number
    is_sold?: boolean
    listing_type?: string
    limit?: number
    offset?: number
}) {
    let query = supabase
        .from('cars_raw')
        .select('*')
        .order('scraped_at', { ascending: false })

    if (filters?.source) query = query.eq('source', filters.source)
    if (filters?.brand) query = query.ilike('brand', filters.brand)
    if (filters?.model) query = query.ilike('model', filters.model)
    if (filters?.fuel_type) query = query.eq('fuel_type', filters.fuel_type)
    if (filters?.transmission) {
        const variants =
            filters.transmission === 'automatic'
                ? ['automatic', 'Automatisk']
                : filters.transmission === 'manual'
                  ? ['manual', 'Manuel']
                  : [filters.transmission]
        query = query.in('transmission', variants)
    }
    if (filters?.country) query = query.eq('country', filters.country)
    if (filters?.min_price) query = query.gte('price_amount', filters.min_price)
    if (filters?.max_price) query = query.lte('price_amount', filters.max_price)
    if (filters?.min_year) query = query.gte('first_registration_year', filters.min_year)
    if (filters?.max_year) query = query.lte('first_registration_year', filters.max_year)
    if (filters?.max_mileage) query = query.lte('mileage_km', filters.max_mileage)
    if (filters?.min_power_kw) query = query.gte('power_kw', filters.min_power_kw)
    if (filters?.max_co2) query = query.lte('co2_g_km', filters.max_co2)
    if (filters?.listing_type) query = query.eq('listing_type', filters.listing_type)

    const showSold = filters?.is_sold ?? false
    query = query.eq('is_sold', showSold)
    query = query.eq('is_favorited', true)

    query = query.limit(filters?.limit ?? 100)
    if (filters?.offset) query = query.range(
        filters.offset,
        filters.offset + (filters.limit ?? 100) - 1
    )

    const { data, error } = await query

    if (error) {
        console.error('listCars error:', error.message)
        return []
    }

    if (!data || data.length === 0) return []

    // Fetch lowest private purchase TCO for each car
    const carIds = data.map((c) => c.id)
    const { data: tcoRows } = await supabase
        .from('tco_scenarios')
        .select('car_id, monthly_equivalent_dkk')
        .in('car_id', carIds)
        .eq('scenario_type', 'purchase')
        .eq('usage_type', 'private')

    const minTco: Record<string, number> = {}
    if (tcoRows) {
        for (const row of tcoRows) {
            const val = row.monthly_equivalent_dkk
            if (val != null && isFinite(val) && val > 0) {
                if (!minTco[row.car_id] || val < minTco[row.car_id]) {
                    minTco[row.car_id] = val
                }
            }
        }
    }

    return data.map((car) => ({
        ...car,
        lowest_tco_monthly_dkk: minTco[car.id] ?? null,
    }))
}

// ============================================================
// GET FILTER OPTIONS — distinct values for filter dropdowns
// ============================================================

export async function getFilterOptions() {
    const { data: rows, error } = await supabase
        .from('cars_raw')
        .select('brand, model, first_registration_year, fuel_type, transmission, country, source')
        .eq('is_sold', false)

    if (error || !rows) {
        console.error('getFilterOptions error:', error?.message)
        return {
            brands: [],
            modelsByBrand: {} as Record<string, string[]>,
            yearRange: { min: 2000, max: new Date().getFullYear() },
            fuelTypes: [],
            transmissions: [],
            countries: [],
            sources: [],
        }
    }

    const brands = [...new Set(rows.map((r) => r.brand).filter(Boolean))].sort() as string[]

    const modelsByBrand: Record<string, string[]> = {}
    for (const row of rows) {
        if (!row.brand || !row.model) continue
        if (!modelsByBrand[row.brand]) modelsByBrand[row.brand] = []
        if (!modelsByBrand[row.brand].includes(row.model)) {
            modelsByBrand[row.brand].push(row.model)
        }
    }
    for (const brand of Object.keys(modelsByBrand)) {
        modelsByBrand[brand].sort()
    }

    const years = rows
        .map((r) => r.first_registration_year)
        .filter(Boolean) as number[]
    const yearRange =
        years.length > 0
            ? { min: Math.min(...years), max: Math.max(...years) }
            : { min: 2000, max: new Date().getFullYear() }

    const fuelTypes = [...new Set(rows.map((r) => r.fuel_type).filter(Boolean))].sort() as string[]

    // Normalize transmission values across sources
    const transmissionMap: Record<string, string> = {
        automatic: 'automatic',
        manual: 'manual',
        Automatisk: 'automatic',
        Manuel: 'manual',
    }
    const rawTransmissions = [...new Set(rows.map((r) => r.transmission).filter(Boolean))] as string[]
    const transmissions = [...new Set(rawTransmissions.map((t) => transmissionMap[t] ?? t))].sort()

    const countries = [...new Set(rows.map((r) => r.country).filter(Boolean))].sort() as string[]
    const sources = [...new Set(rows.map((r) => r.source).filter(Boolean))].sort() as string[]

    return { brands, modelsByBrand, yearRange, fuelTypes, transmissions, countries, sources }
}
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
    fuel_type?: string
    country?: string
    min_price?: number
    max_price?: number
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
    if (filters?.fuel_type) query = query.eq('fuel_type', filters.fuel_type)
    if (filters?.country) query = query.eq('country', filters.country)
    if (filters?.min_price) query = query.gte('price_amount', filters.min_price)
    if (filters?.max_price) query = query.lte('price_amount', filters.max_price)
    if (filters?.listing_type) query = query.eq('listing_type', filters.listing_type)

    const showSold = filters?.is_sold ?? false
    query = query.eq('is_sold', showSold)

    query = query.limit(filters?.limit ?? 50)
    if (filters?.offset) query = query.range(
        filters.offset,
        filters.offset + (filters.limit ?? 50) - 1
    )

    const { data, error } = await query

    if (error) {
        console.error('listCars error:', error.message)
        return []
    }

    return data
}
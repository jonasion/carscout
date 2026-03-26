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
// UPSERT — insert or update by source + source_listing_id
// ============================================================

export async function upsertCar(car: CarInsert): Promise<string | null> {
    const { data, error } = await supabase
        .from('cars_raw')
        .upsert(
            {
                ...car,
                updated_at: new Date().toISOString(),
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

    return data?.id ?? null
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
// After uploading image to Supabase Storage, write the public URL back
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
// LIST CARS — with optional filters
// ============================================================

export async function listCars(filters?: {
    source?: string
    brand?: string
    fuel_type?: string
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
    if (filters?.listing_type) query = query.eq('listing_type', filters.listing_type)

    // Default: hide sold cars unless explicitly requested
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
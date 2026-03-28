// ============================================================
// BILBASEN SCRAPER v2
// Step 1: Search API → list of externalIds
// Step 2: Fetch each detail page → extract _props → map to cars_raw
// ============================================================

import { upsertCar } from '../db/cars'
import { computeAllScenarios } from '../tco/calculate'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const HEADERS = {
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'da',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}

// ============================================================
// STEP 1 — Search: get listing IDs and URLs
// ============================================================

interface BilbasenSearchListing {
    externalId: number
    uri: string
    price?: { price: number; priceType: string }
    make: string
    model: string
    variant?: string
    media?: Array<{ mediaType: string; url: string }>
}

async function fetchSearchPage(
    searchUrl: string,
    page: number
): Promise<BilbasenSearchListing[]> {
    const response = await fetch('https://www.bilbasen.dk/api/search/by-request', {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pageSize: 30,
            page,
            selectedFilters: {
                Ownership: { value: { value: 'Retail' } },
                Category: { value: { value: 'Car' } },
            },
            searchUrl,
        }),
    })

    if (!response.ok) throw new Error(`Search API error: ${response.status}`)
    const data = await response.json()
    return Array.isArray(data?.listings) ? data.listings : []
}

// ============================================================
// STEP 2 — Detail page: extract _props from HTML
// ============================================================

export async function fetchListingDetail(url: string): Promise<Record<string, any> | null> {
    try {
        const response = await fetch(url, { headers: HEADERS })
        if (!response.ok) return null

        const html = await response.text()
        const match = html.match(/var _props\s*=\s*(\{[\s\S]*?\});\s*<\/script>/)
        if (!match) return null

        return JSON.parse(match[1])
    } catch (err) {
        console.error('fetchListingDetail error:', err)
        return null
    }
}

// ============================================================
// FIELD MAPPING — _props to cars_raw
// ============================================================

export function mapPropsToCarInsert(
    props: Record<string, any>,
    searchListing: BilbasenSearchListing
) {
    const listing = props?.listing
    if (!listing) return null

    // null-to-undefined helpers — CarInsert uses optional (undefined) not null
    const n = (v: number | null): number | undefined => v ?? undefined
    const s = (v: string | null | undefined): string | undefined => v ?? undefined

    const vehicle = listing?.vehicle ?? {}
    const attr = listing?.tracking?.gtm?.dataLayer?.a?.attr ?? {}
    const seller = listing?.seller ?? {}
    const media = listing?.media?.images ?? []
    const details: Array<{ name: string; displayValue: string }> = vehicle?.details ?? []

    // Helper: find a value from the details array by name
    const fromDetails = (name: string) =>
        details.find(d => d.name === name)?.displayValue ?? ''

    // Mileage — from details array ("20.500 km" → 20500)
    const mileageRaw = fromDetails('Kilometertal')
    const mileageKm = parseInt(mileageRaw.replace(/[^0-9]/g, '')) || null

    // CO2 — from details array ("110 g/km" → 110)
    const co2Raw = fromDetails('CO2 udledning')
    const co2GKm = parseFloat(co2Raw.replace(/[^0-9.]/g, '')) || null

    // Fuel consumption — from details array ("(NEDC) 20,4 km/l" → l/100km)
    const consumptionRaw = fromDetails('Brændstofforbrug')
    const kmlMatch = consumptionRaw.replace(',', '.').match(/[\d.]+/)
    const kml = kmlMatch ? parseFloat(kmlMatch[0]) : 0
    const consumptionL100km = kml > 0 ? Math.round((100 / kml) * 10) / 10 : null

    // Fuel type — prefer attr, fall back to details array
    const fuelTypeRaw = (
        attr.vehicle_model_fuel_type ||
        fromDetails('Drivmiddel') ||
        ''
    ).toLowerCase()
    let fuelType: string | null = fuelTypeRaw || null
    if (fuelTypeRaw.includes('benzin')) fuelType = 'benzin'
    else if (fuelTypeRaw.includes('diesel')) fuelType = 'diesel'
    else if (fuelTypeRaw === 'el') fuelType = 'el'
    else if (fuelTypeRaw.includes('plug')) fuelType = 'phev'
    else if (fuelTypeRaw.includes('hybrid')) fuelType = 'hybrid'

    // HK → kW (from attr or details "72 hk/93 nm")
    const hkRaw = attr.vehicle_model_effect
        ? parseFloat(attr.vehicle_model_effect)
        : parseFloat((fromDetails('Ydelse').match(/[\d.]+/) ?? ['0'])[0])
    const powerKw = hkRaw > 0 ? Math.round((hkRaw / 1.36) * 10) / 10 : null

    // Transmission — from attr or details
    const gearTypeAttr = attr.vehicle_model_gear_type ?? ''
    const gearTypeDetails = fromDetails('Geartype')
    let transmission: string | null = null
    if (gearTypeAttr === 'A' || gearTypeDetails === 'Automatisk') transmission = 'Automatisk'
    else if (gearTypeAttr === 'M' || gearTypeDetails === 'Manuel') transmission = 'Manuel'
    else if (gearTypeDetails) transmission = gearTypeDetails

    // Images
    const imageUrls = media
        .filter((m: any) => m.mediaType === 'Picture' || !m.mediaType)
        .map((m: any) => m.url)
        .filter(Boolean) as string[]

    // Price
    const priceAmount = listing?.price?.displayValue
        ? parseFloat(listing.price.displayValue.replace(/[^0-9]/g, ''))
        : (searchListing.price?.price ?? null)

    return {
        source: 'bilbasen',
        source_listing_id: String(listing.externalId ?? searchListing.externalId),
        url: s(listing.canonicalUrl ?? searchListing.uri),
        title: s(`${vehicle.make ?? ''} ${vehicle.model ?? ''} ${vehicle.variant ?? ''}`.trim()),
        brand: s(vehicle.make ?? searchListing.make),
        model: s(vehicle.model ?? searchListing.model),
        variant: s(vehicle.variant ?? searchListing.variant ?? null),
        first_registration_year: n(vehicle.modelYear ?? null),
        mileage_km: n(mileageKm),
        fuel_type: s(fuelType),
        transmission: s(transmission),
        power_kw: n(powerKw),
        co2_g_km: n(co2GKm),
        consumption_l_100km: n(consumptionL100km),
        price_amount: n(priceAmount),
        price_currency: 'DKK' as const,
        country: 'DK',
        is_registered_dk: true,
        has_dk_vat: true,
        listing_type: 'sale',
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        dealer_name: s(seller.name ?? null),
        dealer_phone: s(seller.phoneNumbers?.[0]?.info ?? null),
        raw_json: props as Record<string, unknown>,
    }
}

// ============================================================
// FALLBACK MAPPING — when detail page fails, use search data only
// ============================================================

function mapSearchListingToCarInsert(listing: BilbasenSearchListing) {
    return {
        source: 'bilbasen',
        source_listing_id: String(listing.externalId),
        url: listing.uri.startsWith('http')
            ? listing.uri
            : `https://www.bilbasen.dk${listing.uri}`,
        brand: listing.make,
        model: listing.model,
        variant: listing.variant,
        price_amount: listing.price?.price,
        price_currency: 'DKK' as const,
        country: 'DK',
        is_registered_dk: true,
        has_dk_vat: true,
        listing_type: 'sale',
        image_urls: listing.media
            ?.filter(m => m.mediaType === 'Picture')
            .map(m => m.url),
        raw_json: listing as unknown as Record<string, unknown>,
    }
}

// ============================================================
// IMAGE UPLOAD to Supabase Storage
// ============================================================

async function uploadPrimaryImage(carId: string, imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl)
        if (!response.ok) return null

        const buffer = await response.arrayBuffer()
        const ext = imageUrl.includes('.png') ? 'png' : 'jpg'
        const filename = `${carId}.${ext}`

        const { error } = await supabase.storage
            .from('car-images')
            .upload(filename, buffer, {
                contentType: `image/${ext}`,
                upsert: true,
            })

        if (error) {
            console.error('Storage upload error:', error.message)
            return null
        }

        const { data } = supabase.storage
            .from('car-images')
            .getPublicUrl(filename)

        return data.publicUrl
    } catch (err) {
        console.error('uploadPrimaryImage error:', err)
        return null
    }
}

// ============================================================
// MAIN SCRAPER
// ============================================================

export async function scrapeBilbasen(
    searchUrl: string = 'https://www.bilbasen.dk/brugt/bil',
    maxPages: number = 3,
    runTco: boolean = true
): Promise<{ scraped: number; saved: number; errors: number }> {
    let scraped = 0
    let saved = 0
    let errors = 0

    for (let page = 1; page <= maxPages; page++) {
        console.log(`Bilbasen search page ${page}/${maxPages}`)

        let listings: BilbasenSearchListing[]
        try {
            listings = await fetchSearchPage(searchUrl, page)
        } catch (err) {
            console.error(`Search page ${page} failed:`, err)
            errors++
            break
        }

        if (listings.length === 0) {
            console.log('No more listings — stopping')
            break
        }

        scraped += listings.length

        for (const listing of listings) {
            if (listing.price?.priceType && listing.price.priceType !== 'Retail') continue

            try {
                const detailUrl = listing.uri.startsWith('http')
                    ? listing.uri
                    : `https://www.bilbasen.dk${listing.uri}`

                const props = await fetchListingDetail(detailUrl)
                const carData = props
                    ? mapPropsToCarInsert(props, listing)
                    : mapSearchListingToCarInsert(listing)

                if (!carData) { errors++; continue }

                const carId = await upsertCar(carData)
                if (!carId) { errors++; continue }

                // Upload primary image
                const primaryImageUrl = carData.image_urls?.[0]
                if (primaryImageUrl) {
                    const storedUrl = await uploadPrimaryImage(carId, primaryImageUrl)
                    if (storedUrl) {
                        await supabase
                            .from('cars_raw')
                            .update({ stored_image_url: storedUrl })
                            .eq('id', carId)
                    }
                }

                // Trigger TCO computation
                if (runTco) {
                    try {
                        await computeAllScenarios(carId)
                    } catch (tcoErr) {
                        console.error(`TCO failed for ${carId}:`, tcoErr)
                    }
                }

                saved++
                await new Promise(r => setTimeout(r, 800))

            } catch (err) {
                console.error(`Error processing listing ${listing.externalId}:`, err)
                errors++
            }
        }

        if (page < maxPages) {
            await new Promise(r => setTimeout(r, 2000))
        }
    }

    return { scraped, saved, errors }
}
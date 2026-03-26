import { upsertCar, CarInsert } from '@/lib/db/cars'
import { computeAllScenarios } from '@/lib/tco/calculate'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function mapFuel(fuel: string): string {
  switch (fuel) {
    case 'Gasoline': return 'benzin'
    case 'Diesel': return 'diesel'
    case 'Electric': return 'el'
    case 'Electric/Gasoline': return 'hybrid'
    case 'Electric/Diesel': return 'hybrid'
    default: return fuel.toLowerCase()
  }
}

function parseYear(reg: string): number | undefined {
  if (!reg || reg === 'new') return undefined
  const parts = reg.split('-')
  return parts.length === 2 ? parseInt(parts[1]) : undefined
}

async function uploadImage(imageUrl: string, listingId: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const path = `autoscout24/${listingId}.webp`
    const { error } = await supabase.storage
      .from('car-images')
      .upload(path, buf, { contentType: 'image/webp', upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('car-images').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

function mapListing(listing: any): CarInsert {
  const details: any[] = listing.vehicleDetails ?? []
  const wltp: string[] = listing.wltpValues ?? []

  const powerEntry = details.find((d: any) => d.iconName === 'speedometer')
  const powerMatch = powerEntry?.data?.match(/(\d+)\s*kW/)
  const power_kw = powerMatch ? parseFloat(powerMatch[1]) : undefined

  const consumptionEntry = wltp.find((v: string) => v.includes('l/100'))
  const consumptionMatch = consumptionEntry?.match(/([0-9.]+)\s*l\/100/)
  const consumption_l_100km = consumptionMatch ? parseFloat(consumptionMatch[1]) : undefined

  const co2Entry = wltp.find((v: string) => v.includes('g/km'))
  const co2Match = co2Entry?.match(/([0-9.]+)\s*g\/km/)
  const co2_g_km = co2Match ? parseFloat(co2Match[1]) : undefined

  const rawPrice = listing.tracking?.price
  const price_amount = rawPrice ? parseFloat(rawPrice) : undefined

  return {
    source: 'autoscout24',
    source_listing_id: listing.id,
    url: 'https://www.autoscout24.com' + listing.url,
    title: [listing.vehicle?.make, listing.vehicle?.model, listing.vehicle?.variant]
      .filter(Boolean).join(' '),
    brand: listing.vehicle?.make ?? undefined,
    model: listing.vehicle?.model ?? undefined,
    variant: listing.vehicle?.variant ?? undefined,
    first_registration_year: parseYear(listing.tracking?.firstRegistration ?? ''),
    mileage_km: listing.tracking?.mileage ? parseInt(listing.tracking.mileage) : undefined,
    fuel_type: mapFuel(listing.vehicle?.fuel ?? ''),
    transmission: listing.vehicle?.transmission === 'Automatic' ? 'automatic' : 'manual',
    power_kw,
    consumption_l_100km,
    co2_g_km,
    price_amount,
    price_currency: 'EUR',
    country: listing.location?.countryCode ?? 'DE',
    is_registered_dk: false,
    has_dk_vat: false,
    image_urls: listing.images ?? [],
    dealer_name: listing.seller?.companyName ?? undefined,
    dealer_phone: listing.seller?.phones?.[0]?.formattedNumber ?? undefined,
    raw_json: listing,
  }
}

async function fetchPageListings(
  searchUrl: string,
  apiKey: string,
  page: number
): Promise<any[]> {
  const url = page > 1 ? `${searchUrl}&page=${page}` : searchUrl
  const apiUrl = `https://api.scrapfly.io/scrape?key=${apiKey}&url=${encodeURIComponent(url)}&render_js=false`
  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error(`Scrapfly HTTP ${res.status} for page ${page}`)
  const data = await res.json()
  const html: string = data.result?.content ?? ''
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return []
  const nextData = JSON.parse(match[1])
  return nextData?.props?.pageProps?.listings ?? []
}

export async function scrapeAutoscout24(
  searchUrl: string,
  scrapflyApiKey: string
): Promise<{ scraped: number; saved: number; errors: number }> {
  let scraped = 0, saved = 0, errors = 0
  const MAX_PAGES = 5

  console.log(`[AS24] Starting scrape: ${searchUrl}`)

  const allListings: any[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await sleep(1500)
    try {
      const listings = await fetchPageListings(searchUrl, scrapflyApiKey, page)
      if (!listings.length) {
        console.log(`[AS24] Page ${page} returned 0 listings, stopping`)
        break
      }
      allListings.push(...listings)
      scraped += listings.length
      console.log(`[AS24] Page ${page}: ${listings.length} listings (total: ${scraped})`)
    } catch (e) {
      console.error(`[AS24] Page ${page} fetch error:`, e)
      break
    }
  }

  console.log(`[AS24] Processing ${allListings.length} listings...`)

  for (const listing of allListings) {
    try {
      const car = mapListing(listing)
      const carId = await upsertCar(car)
      if (!carId) { errors++; continue }

      // Upload primary image
      const images = car.image_urls as string[]
      if (images?.length > 0) {
        const storedUrl = await uploadImage(images[0], listing.id)
        if (storedUrl) {
          await supabase
            .from('cars_raw')
            .update({ stored_image_url: storedUrl })
            .eq('id', carId)
        }
      }

      // Compute TCO scenarios
      await computeAllScenarios(carId).catch((e: any) =>
        console.error(`[AS24] TCO error for ${carId}:`, e)
      )

      saved++
    } catch (e) {
      console.error(`[AS24] Error processing listing ${listing.id}:`, e)
      errors++
    }

    await sleep(100)
  }

  console.log(`[AS24] Done — scraped: ${scraped}, saved: ${saved}, errors: ${errors}`)
  return { scraped, saved, errors }
}
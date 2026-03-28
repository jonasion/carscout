import { NextRequest, NextResponse } from 'next/server'
import { fetchListingDetail, mapPropsToCarInsert, uploadPrimaryImage } from '@/lib/scrapers/bilbasen'
import { mapListing as mapAutoscoutListing, uploadImage as uploadAutoscoutImage } from '@/lib/scrapers/autoscout24'
import { upsertCar } from '@/lib/db/cars'
import { computeAllScenarios } from '@/lib/tco/calculate'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function detectSource(url: string): 'bilbasen' | 'autoscout24' | null {
    if (url.includes('bilbasen.dk')) return 'bilbasen'
    if (url.includes('autoscout24.com')) return 'autoscout24'
    return null
}

function cleanUrl(url: string): string {
    try {
        const u = new URL(url)
        // Remove UTM and share tracking params
        u.searchParams.delete('utm_source')
        u.searchParams.delete('utm_campaign')
        u.searchParams.delete('utm_medium')
        return u.toString()
    } catch {
        return url
    }
}

async function fetchAutoscoutSingleListing(url: string): Promise<any | null> {
    const apiKey = process.env.SCRAPFLY_API_KEY
    if (!apiKey) {
        console.error('[AS24 Import] SCRAPFLY_API_KEY not set')
        return null
    }

    const apiUrl = `https://api.scrapfly.io/scrape?key=${apiKey}&url=${encodeURIComponent(url)}&render_js=false`
    const res = await fetch(apiUrl)
    if (!res.ok) {
        console.error(`[AS24 Import] Scrapfly HTTP ${res.status}`)
        return null
    }

    const data = await res.json()
    const html: string = data.result?.content ?? ''
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!match) {
        console.error('[AS24 Import] No __NEXT_DATA__ found')
        return null
    }

    const nextData = JSON.parse(match[1])
    const props = nextData?.props?.pageProps

    // Single listing page: listing data is in props.listingDetails or props.listing
    const listing = props?.listingDetails ?? props?.listing ?? null

    if (!listing) {
        // Fallback: try to find it in the page props directly
        // Sometimes the listing data is nested differently
        console.error('[AS24 Import] Could not find listing in pageProps, keys:', Object.keys(props ?? {}))
        return null
    }

    return listing
}

async function importBilbasen(url: string): Promise<{ carId: string | null; error?: string }> {
    const externalId = parseInt(url.split('/').pop() || '0')
    const props = await fetchListingDetail(url)
    if (!props) return { carId: null, error: 'Could not fetch detail page' }

    const stub = { externalId, uri: url, make: '', model: '' } as any
    const carData = mapPropsToCarInsert(props, stub)
    if (!carData) return { carId: null, error: 'Could not map listing data' }

    const carId = await upsertCar(carData)
    if (!carId) return { carId: null, error: 'Upsert failed' }

    // Upload image
    const primaryImageUrl = (carData.image_urls as string[])?.[0]
    if (primaryImageUrl) {
        const storedUrl = await uploadPrimaryImage(carId, primaryImageUrl)
        if (storedUrl) {
            await supabase.from('cars_raw').update({ stored_image_url: storedUrl }).eq('id', carId)
        }
    }

    return { carId }
}

async function importAutoscout24(url: string): Promise<{ carId: string | null; error?: string }> {
    const listing = await fetchAutoscoutSingleListing(url)
    if (!listing) return { carId: null, error: 'Could not fetch or parse listing' }

    // Extract listing ID from URL (the UUID at the end)
    const urlParts = url.split('-')
    const uuidCandidate = urlParts.slice(-5).join('-')
    const listingId = listing.id ?? uuidCandidate
    listing.id = listingId
    listing.url = listing.url ?? new URL(url).pathname

    let carData
    try {
        carData = mapAutoscoutListing(listing)
    } catch (e: any) {
        return { carId: null, error: `Mapping failed: ${e.message}` }
    }

    const carId = await upsertCar(carData)
    if (!carId) return { carId: null, error: 'Upsert failed' }

    // Upload image
    const images = carData.image_urls as string[]
    if (images?.length > 0) {
        const storedUrl = await uploadAutoscoutImage(images[0], listingId)
        if (storedUrl) {
            await supabase.from('cars_raw').update({ stored_image_url: storedUrl }).eq('id', carId)
        }
    }

    return { carId }
}

export async function POST(req: NextRequest) {
    try {
        const { urls } = await req.json()

        if (!Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: 'urls array required' }, { status: 400 })
        }

        const results: { url: string; source: string; status: string; carId?: string; error?: string }[] = []

        for (const rawUrl of urls) {
            const url = cleanUrl(rawUrl)
            const source = detectSource(url)

            if (!source) {
                results.push({ url, source: 'unknown', status: 'failed', error: 'Unsupported URL' })
                continue
            }

            try {
                const result = source === 'bilbasen'
                    ? await importBilbasen(url)
                    : await importAutoscout24(url)

                if (result.carId) {
                    // Mark as favorited
                    await supabase
                        .from('cars_raw')
                        .update({ is_favorited: true })
                        .eq('id', result.carId)

                    // Compute TCO
                    await computeAllScenarios(result.carId).catch((e) =>
                        console.error(`TCO error for ${result.carId}:`, e)
                    )

                    results.push({ url, source, status: 'ok', carId: result.carId })
                } else {
                    results.push({ url, source, status: 'failed', error: result.error })
                }
            } catch (e: any) {
                results.push({ url, source, status: 'failed', error: e.message })
            }

            // Rate limit
            await new Promise((r) => setTimeout(r, source === 'autoscout24' ? 1500 : 800))
        }

        const succeeded = results.filter((r) => r.status === 'ok').length
        const failed = results.filter((r) => r.status === 'failed').length

        return NextResponse.json({ total: urls.length, succeeded, failed, results })
    } catch (error: any) {
        console.error('Import error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { fetchListingDetail, mapPropsToCarInsert } from '@/lib/scrapers/bilbasen'
import { upsertCar } from '@/lib/db/cars'
import { computeAllScenarios } from '@/lib/tco/calculate'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const { urls } = await req.json()

        if (!Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: 'urls array required' }, { status: 400 })
        }

        const results: { url: string; status: string; carId?: string; error?: string }[] = []

        for (const url of urls) {
            try {
                // Extract listing ID from URL (last segment)
                const externalId = parseInt(url.split('/').pop() || '0')

                // Fetch detail page
                const props = await fetchListingDetail(url)
                if (!props) {
                    results.push({ url, status: 'failed', error: 'Could not fetch detail page' })
                    continue
                }

                // Create minimal search listing stub for the mapper
                const stub = {
                    externalId,
                    uri: url,
                    make: '',
                    model: '',
                } as any

                const carData = mapPropsToCarInsert(props, stub)
                if (!carData) {
                    results.push({ url, status: 'failed', error: 'Could not map listing data' })
                    continue
                }

                // Upsert car
                const carId = await upsertCar(carData)
                if (!carId) {
                    results.push({ url, status: 'failed', error: 'Upsert failed' })
                    continue
                }

                // Mark as favorited
                await supabase
                    .from('cars_raw')
                    .update({ is_favorited: true })
                    .eq('id', carId)

                // Compute TCO
                await computeAllScenarios(carId).catch((e) =>
                    console.error(`TCO error for ${carId}:`, e)
                )

                results.push({ url, status: 'ok', carId })
            } catch (e: any) {
                results.push({ url, status: 'failed', error: e.message })
            }

            // Rate limit: 800ms between requests
            await new Promise((r) => setTimeout(r, 800))
        }

        const succeeded = results.filter((r) => r.status === 'ok').length
        const failed = results.filter((r) => r.status === 'failed').length

        return NextResponse.json({ total: urls.length, succeeded, failed, results })
    } catch (error: any) {
        console.error('Import error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

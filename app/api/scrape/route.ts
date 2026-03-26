import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))

        // ── Profile-based scrape ──────────────────────────────────────
        // POST { "profile_id": "uuid" }
        if (body.profile_id) {
            const { data: profile, error } = await supabase
                .from('search_profiles')
                .select('*')
                .eq('id', body.profile_id)
                .single()

            if (error || !profile) {
                return NextResponse.json(
                    { success: false, error: 'Profile not found' },
                    { status: 404 }
                )
            }

            let result: { scraped: number; saved: number; errors: number }

            if (profile.source === 'bilbasen') {
                const { scrapeBilbasen } = await import('@/lib/scrapers/bilbasen')
                result = await scrapeBilbasen(profile.search_url, body.maxPages ?? 3, true)

            } else if (profile.source === 'autoscout24') {
                const { scrapeAutoscout24 } = await import('@/lib/scrapers/autoscout24')
                result = await scrapeAutoscout24(
                    profile.search_url,
                    process.env.SCRAPFLY_API_KEY!
                )

            } else {
                return NextResponse.json(
                    { success: false, error: `Unknown source: ${profile.source}` },
                    { status: 400 }
                )
            }

            await supabase
                .from('search_profiles')
                .update({ last_run_at: new Date().toISOString() })
                .eq('id', profile.id)

            return NextResponse.json({ success: true, profile: profile.profile_name, ...result })
        }

        // ── Legacy direct scrape ──────────────────────────────────────
        // POST { "searchUrl": "...", "maxPages": 1 }
        const searchUrl = body.searchUrl ?? 'https://www.bilbasen.dk/brugt/bil'
        const maxPages = Number(body.maxPages ?? 1)
        const runTco = body.runTco !== false

        console.log(`[SCRAPE] Direct Bilbasen scrape — ${maxPages} page(s)`)

        const { scrapeBilbasen } = await import('@/lib/scrapers/bilbasen')
        const result = await scrapeBilbasen(searchUrl, maxPages, runTco)

        return NextResponse.json({ success: true, ...result })

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[SCRAPE]', message)
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
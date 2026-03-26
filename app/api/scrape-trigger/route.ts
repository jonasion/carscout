import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}))

    // Fire and forget — don't await the scrape
    const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

    fetch(`${baseUrl}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).catch(console.error)

    // Return immediately — n8n gets a fast response
    return NextResponse.json({
        accepted: true,
        profile_id: body.profile_id,
        message: 'Scrape started in background'
    })
}
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const { searchUrl } = await request.json()

    const scrapflyUrl = new URL('https://api.scrapfly.io/scrape')
    scrapflyUrl.searchParams.set('key', process.env.SCRAPFLY_API_KEY!)
    scrapflyUrl.searchParams.set('url', searchUrl)
    scrapflyUrl.searchParams.set('render_js', 'true')
    scrapflyUrl.searchParams.set('country', 'dk')
    scrapflyUrl.searchParams.set('asp', 'true')

    const response = await fetch(scrapflyUrl.toString())
    const data = await response.json()

    return NextResponse.json({
        topLevelKeys: Object.keys(data),
        resultKeys: data.result ? Object.keys(data.result) : 'no result key',
        statusCode: data.result?.status_code,
        contentLength: data.result?.content?.length ?? 0,
        contentPreview: data.result?.content?.slice(0, 300) ?? 'empty',
        errorMessage: data.error ?? null,
    })
}
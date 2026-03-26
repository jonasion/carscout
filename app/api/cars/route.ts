import { NextRequest, NextResponse } from 'next/server'
import { listCars, upsertCar } from '@/lib/db/cars'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)

    const cars = await listCars({
        source: searchParams.get('source') ?? undefined,
        brand: searchParams.get('brand') ?? undefined,
        fuel_type: searchParams.get('fuel_type') ?? undefined,
        listing_type: searchParams.get('listing_type') ?? undefined,
        limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
        offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
    })

    return NextResponse.json({ cars })
}

export async function POST(req: NextRequest) {
    const body = await req.json()

    const id = await upsertCar(body)

    if (!id) {
        return NextResponse.json({ error: 'Failed to upsert car' }, { status: 500 })
    }

    return NextResponse.json({ id })
}
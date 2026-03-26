import { NextRequest, NextResponse } from 'next/server'
import { getCarById, getPriceHistory } from '@/lib/db/cars'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const car = await getCarById(id)

    if (!car) {
        return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    const priceHistory = await getPriceHistory(id)

    return NextResponse.json({ ...car, price_history: priceHistory })
}

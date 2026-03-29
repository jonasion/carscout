import { NextRequest, NextResponse } from 'next/server'
import { listCars, upsertCar } from '@/lib/db/cars'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const cars = await listCars({
    source: searchParams.get('source') ?? undefined,
    brand: searchParams.get('brand') ?? undefined,
    model: searchParams.get('model') ?? undefined,
    fuel_type: searchParams.get('fuel_type') ?? undefined,
    transmission: searchParams.get('transmission') ?? undefined,
    country: searchParams.get('country') ?? undefined,
    min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
    max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    min_year: searchParams.get('min_year') ? Number(searchParams.get('min_year')) : undefined,
    max_year: searchParams.get('max_year') ? Number(searchParams.get('max_year')) : undefined,
    max_mileage: searchParams.get('max_mileage') ? Number(searchParams.get('max_mileage')) : undefined,
    min_power_kw: searchParams.get('min_power_kw') ? Number(searchParams.get('min_power_kw')) : undefined,
    max_co2: searchParams.get('max_co2') ? Number(searchParams.get('max_co2')) : undefined,
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
import { NextResponse } from 'next/server'
import { getFilterOptions } from '@/lib/db/cars'

export async function GET() {
    const options = await getFilterOptions()
    return NextResponse.json(options)
}
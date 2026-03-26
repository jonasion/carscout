import { NextResponse } from 'next/server'
import { calculateAllScenarios } from '@/lib/tco/calculate'

export async function GET() {
    const results = calculateAllScenarios(300000, '2022-01-01', 45000)
    return NextResponse.json(results)
}
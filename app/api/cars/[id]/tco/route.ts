import { NextRequest, NextResponse } from 'next/server'
import { getTcoScenariosForCar } from '@/lib/db/tco'
import { computeAllScenarios } from '@/lib/tco/calculate'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const scenarios = await getTcoScenariosForCar(id)
        return NextResponse.json({ scenarios })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[TCO GET]', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json().catch(() => ({}))
        const downPayment = Number(body.down_payment_dkk ?? 200000)
        const loanRate = Number(body.loan_rate_pct ?? 5.0)

        const result = await computeAllScenarios(id, downPayment, loanRate)
        return NextResponse.json(result)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[TCO POST]', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
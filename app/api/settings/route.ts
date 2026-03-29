import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
    try {
        const { data } = await supabase.from('tco_config').select('key, value')
        const config = Object.fromEntries((data ?? []).map((r) => [r.key, Number(r.value)]))
        return NextResponse.json({
            down_payment_dkk: config.user_down_payment_dkk ?? 200000,
            loan_rate_pct: config.user_loan_rate_pct ?? 5.0,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { down_payment_dkk, loan_rate_pct } = body

        await supabase.from('tco_config').upsert({ key: 'user_down_payment_dkk', value: String(down_payment_dkk) }, { onConflict: 'key' })
        await supabase.from('tco_config').upsert({ key: 'user_loan_rate_pct', value: String(loan_rate_pct) }, { onConflict: 'key' })

        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

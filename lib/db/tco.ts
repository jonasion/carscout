// ============================================================
// CARSCOUT DB LAYER — tco_scenarios
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================
// GET SCENARIOS FOR A CAR
// Returns all computed scenarios, ordered by monthly equivalent
// ============================================================

export async function getTcoScenariosForCar(carId: string) {
    const { data, error } = await supabase
        .from('tco_scenarios')
        .select('*')
        .eq('car_id', carId)
        .order('monthly_equivalent_dkk', { ascending: true })

    if (error) {
        console.error('getTcoScenariosForCar error:', error.message)
        return []
    }

    return data
}

// ============================================================
// GET BEST SCENARIO PER CAR
//Returns the single lowest monthly equivalent scenario per car
//Useful for the car list view summary card
// ============================================================

export async function getBestScenarioPerCar(carIds: string[]) {
    if (carIds.length === 0) return []

    const { data, error } = await supabase
        .from('tco_scenarios')
        .select('car_id, monthly_equivalent_dkk, scenario_type, usage_type, origin, holding_period_years')
        .in('car_id', carIds)
        .order('monthly_equivalent_dkk', { ascending: true })

    if (error) {
        console.error('getBestScenarioPerCar error:', error.message)
        return []
    }

    // Keep only the best (lowest) scenario per car
    const seen = new Set<string>()
    return data.filter(row => {
        if (seen.has(row.car_id)) return false
        seen.add(row.car_id)
        return true
    })
}

// ============================================================
// GET SCENARIOS FOR COMPARISON
// Returns scenarios for multiple cars filtered to same
// scenario_type + usage_type + holding_period for apples-to-apples
// ============================================================

export async function getScenariosForComparison(
    carIds: string[],
    scenarioType: string,
    usageType: string,
    holdingYears: number
) {
    if (carIds.length === 0) return []

    const { data, error } = await supabase
        .from('tco_scenarios')
        .select('*')
        .in('car_id', carIds)
        .eq('scenario_type', scenarioType)
        .eq('usage_type', usageType)
        .eq('holding_period_years', holdingYears)
        .order('monthly_equivalent_dkk', { ascending: true })

    if (error) {
        console.error('getScenariosForComparison error:', error.message)
        return []
    }

    return data
}

// ============================================================
// DELETE SCENARIOS FOR A CAR
// Called before recomputing to ensure clean slate
// ============================================================

export async function deleteScenariosForCar(carId: string): Promise<void> {
    const { error } = await supabase
        .from('tco_scenarios')
        .delete()
        .eq('car_id', carId)

    if (error) console.error('deleteScenariosForCar error:', error.message)
}
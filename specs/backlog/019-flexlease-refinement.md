# SPEC-019: Flexlease TCO Engine Refinement
# FILE LOCATION: C:\Users\Simon\carscout\specs\backlog\019-flexlease-refinement.md

## Status
backlog

## Domain Objects Touched
TcoScenario, TcoConfig

## Problem
CarScout's current flexlease TCO calculation contains three significant errors
relative to how Danish flexlease contracts actually work:

1. **Wrong depreciation base** — CarScout depreciates from `on_road_cost`
   (base + moms + full registration tax) for both purchase and lease.
   For flexlease, depreciation should be calculated on `base_value only`,
   then moms applied for private consumers. The lessee never owns the
   registration tax component — they pay it monthly.

2. **Missing age-dependent tax bracket** — The `forholdsmæssig
   registreringsafgift` rate varies by vehicle age:
   ≤3 months = 2%/month, 3–36 months = 1%/month, >36 months = 0.5%/month.
   CarScout does not model this at all.

3. **Missing moms on monthly payments** — Private consumers pay 25% moms
   on all monthly lease costs. This must be applied consistently.

These errors compound for expensive cars with high registration tax —
exactly the use case CarScout is built for.

## Approach

Translate Gemini's validated Python TCO model into TypeScript and integrate
it into `lib/tco/calculate.ts`. Keep the existing purchase calculation
unchanged. Replace only the flexlease calculation path.

Reference implementation (Python → TypeScript):

```typescript
// Tax bracket rate based on vehicle age
function getFlexTaxBracketRate(vehicleAgeMonths: number): number {
  if (vehicleAgeMonths <= 3) return 0.02
  if (vehicleAgeMonths <= 36) return 0.01
  return 0.005
}

// Monthly payment decomposition
function computeFlexleaseMonthly(
  baseValue: number,
  fullRegistrationTax: number,
  vehicleAgeMonths: number,
  adminFeeMonthly: number,
  leasingFinanceInterest: number,
  stateResidualInterest: number,
  isPrivate: boolean
) {
  const taxBracketRate = getFlexTaxBracketRate(vehicleAgeMonths)
  const monthlyFlexTax = fullRegistrationTax * taxBracketRate
  const monthlyStateInterest = (fullRegistrationTax * stateResidualInterest) / 12
  const monthlyFinanceInterest = (baseValue * leasingFinanceInterest) / 12
  const totalExMoms = monthlyFlexTax + monthlyStateInterest + monthlyFinanceInterest + adminFeeMonthly
  const totalInclMoms = isPrivate ? totalExMoms * 1.25 : totalExMoms
  return {
    monthlyFlexTax,
    monthlyStateInterest,
    monthlyFinanceInterest,
    monthlyAdminFee: adminFeeMonthly,
    totalExMoms,
    totalInclMoms
  }
}

// Flexlease depreciation — base value only
function computeFlexleaseDepreciation(
  baseValue: number,
  depreciationRate: number,
  isPrivate: boolean
): number {
  const depExMoms = baseValue * depreciationRate
  return isPrivate ? depExMoms * 1.25 : depExMoms
}
```

## Files to Modify

- `lib/tco/calculate.ts` — update flexlease calculation path only
- `lib/db/tco.ts` — pass vehicle_age_months into scenario computation
- `components/car-detail.tsx` — add tooltip dictionary to flexlease section
- `app/api/cars/[id]/tco/route.ts` — ensure vehicle_age_months is derived
  from first_registration_year and passed to compute function

## Files to Create
None.

## Files NOT to Touch
- Purchase calculation path in `lib/tco/calculate.ts` — unchanged
- Any scraper files
- Any frontend listing/card components
- Any API routes except tco route

## Implementation Notes

### Deriving vehicle_age_months
```typescript
const firstReg = new Date(car.first_registration_year, 0, 1)
const vehicleAgeMonths = Math.floor(
  (Date.now() - firstReg.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
)
```

### Handling listed monthly payment vs computed
If the source listing provides `lease_monthly_dkk`, use it as the
actual payment. Still run the decomposition to store the components
and compute implied APR. Add a note in TcoScenario.notes:
"Monthly payment from listing. Decomposition estimated."

If no listing payment exists, compute from scratch using decomposition.

### moms handling — private vs company
- Private: all monthly costs × 1.25
- Company: no moms on monthly costs (company reclaims moms)

### New tco_config rows required
Run this SQL before deploying:
```sql
insert into tco_config (key, value, description) values
  ('market_depreciation_rate', '15', 'Annual % used when no depreciation curve exists'),
  ('bank_interest_rate', '4.0', 'Default bank loan interest rate %'),
  ('leasing_finance_interest', '4.5', 'Leasing company finance interest rate %'),
  ('state_residual_tax_interest', '3.8', 'State interest on residual registration tax %'),
  ('lease_admin_fee_monthly_dkk', '300', 'Monthly admin fee for flexlease'),
  ('loan_establishment_fee_dkk', '5000', 'Bank loan establishment fee DKK'),
  ('lease_establishment_fee_dkk', '5000', 'Flexlease establishment fee DKK ex moms')
on conflict (key) do nothing;
```

### Schema migration required
Run this SQL before deploying:
```sql
alter table tco_scenarios
  add column if not exists vehicle_age_months int,
  add column if not exists lease_tax_bracket_rate numeric,
  add column if not exists lease_monthly_flex_tax_dkk numeric,
  add column if not exists lease_monthly_state_interest_dkk numeric,
  add column if not exists lease_monthly_finance_interest_dkk numeric,
  add column if not exists lease_monthly_admin_fee_dkk numeric,
  add column if not exists lease_monthly_ex_moms_dkk numeric,
  add column if not exists lease_monthly_incl_moms_dkk numeric;
```

### Tooltip dictionary
Add on-hover tooltips in Danish to the flexlease section of car-detail.tsx.
Full tooltip text is in docs/07-TCO-LOGIC.md under "UI Tooltip Dictionary".
Terms to tooltip: Restværdi, Førstegangsydelse, Nedskrivning,
Forholdsmæssig registreringsafgift, Anvisningspligt, Fuld registreringsafgift.

## Done When
1. [ ] Run SQL migrations in Supabase — no errors
2. [ ] POST /api/cars/[id]/tco for a flexlease listing returns
       `lease_monthly_flex_tax_dkk`, `lease_monthly_state_interest_dkk`,
       `lease_monthly_finance_interest_dkk`, `lease_monthly_admin_fee_dkk`
       as non-null values
3. [ ] A car aged >36 months uses bracket rate 0.005 (not 0.01 or 0.02)
4. [ ] Private flexlease monthly is ~25% higher than company flexlease monthly
       for the same car
5. [ ] Flexlease monthly_equivalent_dkk is lower than purchase
       monthly_equivalent_dkk for the Mercedes AMG GT example
       (base 700k, tax 1.3M) — this is the validation case from Gemini
6. [ ] Hovering over "Restværdi" in the detail view shows the Danish tooltip
7. [ ] TcoScenario.notes contains the tax year and tier used

## Docs to Update
- `docs/02-CURRENT-STATE.md` — mark SPEC-019 complete
- `docs/06-SCHEMA.md` — confirm new columns added
- `docs/07-TCO-LOGIC.md` — already updated, confirm implementation matches

## Dependencies
- SPEC-007 (BUG-02) should be done first so TCO is visible to verify

## Out of Scope
- Purchase calculation — do not touch
- Running costs calculation — unchanged
- Depreciation curve builder — future spec
- Company flexlease scenario — compute but do not change the moms logic
  for company (they reclaim moms, so use ex-moms figures)

# SPEC-013: Comparison View — Side-by-Side TCO Dashboard
# FILE LOCATION: C:\Users\Simon\carscout\specs\backlog\013-comparison-view.md

## Status
backlog

## Domain Objects Touched
Listing, TcoScenario, TcoConfig, Favorite

## Problem
The site tagline says "TCO Car Comparison" but comparison does not exist.
More importantly: the existing listing grid shows one TCO figure per car
but gives no way to understand WHY one car is cheaper than another.
The comparison view makes the decision transparent — every cost component
visible side by side, purchase vs. flexlease, for up to 5 cars simultaneously.

## What This Builds

A dedicated page at `/compare` with:
- A comparison matrix where each column = one car
- Each car column split into two sub-columns: Køb (Purchase) | Flexleasing
- A global settings sidebar for adjusting calculation variables
- Month-by-month age-aware tax bracket logic (transitions mid-lease)
- Danish UI with i18n data structure for future English localisation
- Info-icon tooltips on all complex terms (hover desktop, tap mobile/tablet)

This page recalculates dynamically client-side from settings.
It does NOT wait for tco_scenarios from the database.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ SETTINGS SIDEBAR      │  COMPARISON MATRIX                  │
│                       │                                     │
│ Varighed: [12][24][36]│  [Car A]      [Car B]    [Car C]    │
│                       │  Køb | Flex   Køb | Flex Køb | Flex │
│ Bankrente: [4.0%]     │  ─────────────────────────────────  │
│ Leasingrente: [4.5%]  │  Markedsværdi                       │
│ Afskrivning: [15%]    │  Fuld afgift                        │
│ Udbetaling: [200.000] │  Totalpris                          │
│ Oprettelse: [5.000]   │  ─────────────────────────────────  │
│                       │  Månedlig ydelse                    │
│ [+ Tilføj bil]        │  Nedskrivning                       │
│                       │  Renteomkostninger                  │
│                       │  Afgift/md                          │
│                       │  ─────────────────────────────────  │
│                       │  TCO ÅR X          ← highlighted    │
└─────────────────────────────────────────────────────────────│
```

Mobile: settings collapse to a top panel, matrix scrolls horizontally.

---

## Calculation Logic

### Duration input
- Options: 12, 24, 36 months (pill toggle)
- Scales all monthly payments and depreciation accordingly

### Crucial: Month-by-month age-aware tax bracket

The forholdsmæssig registreringsafgift rate depends on vehicle age:
- ≤ 3 months old: 2.0% per month
- 3–36 months old: 1.0% per month
- > 36 months old: 0.5% per month

If a car CROSSES a threshold during the lease, the rate changes
for the remaining months. This must be computed month by month:

```typescript
function computeFlexTaxTotal(
  fullRegistrationTax: number,
  vehicleAgeMonthsAtStart: number,
  leaseDurationMonths: number
): { monthlyBreakdown: number[], total: number } {
  const monthly = []
  for (let m = 0; m < leaseDurationMonths; m++) {
    const ageAtMonth = vehicleAgeMonthsAtStart + m
    let rate: number
    if (ageAtMonth <= 3) rate = 0.02
    else if (ageAtMonth <= 36) rate = 0.01
    else rate = 0.005
    monthly.push(fullRegistrationTax * rate)
  }
  return {
    monthlyBreakdown: monthly,
    total: monthly.reduce((a, b) => a + b, 0)
  }
}
```

Example (Mercedes AMG GT, age 37 months, 24-month lease):
All months are >36, so rate is 0.5% throughout. Total = 0.005 × 1,300,000 × 24.

Example (car aged 30 months, 24-month lease):
Months 1–6: age 30–35 → 1.0% rate
Months 7–24: age 36–53 → 0.5% rate
TCO is lower in this scenario than if naively applying 1% for all 24 months.

### Purchase TCO (12-month baseline, scales to duration)
```
moms           = base_value × 0.25
total_price    = base_value + moms + full_registration_tax
loan_amount    = total_price - down_payment
interest_cost  = loan_amount × bank_rate × (duration_months / 12)
depreciation   = total_price × depreciation_rate × (duration_months / 12)
tco_purchase   = interest_cost + depreciation + establishment_fee
```

### Flexlease TCO (private consumer)
```
// Monthly components (ex moms)
monthly_flex_tax        = computed month-by-month (see above) / duration_months (avg)
monthly_state_interest  = (full_tax × state_rate) / 12
monthly_finance_int     = (base_value × leasing_rate) / 12
monthly_admin           = admin_fee (default 300)
total_ex_moms           = sum of above
total_incl_moms         = total_ex_moms × 1.25

// Depreciation on base value only (not total_price)
depreciation_ex_moms    = base_value × depreciation_rate × (duration_months / 12)
depreciation_incl_moms  = depreciation_ex_moms × 1.25

// Total
tco_flex = (total_incl_moms × duration_months)
         + establishment_fee_incl_moms
         + depreciation_incl_moms
```

---

## Global Settings Panel

Default values (all editable):

| Setting | Danish label | Default |
|---|---|---|
| leaseDurationMonths | Varighed | 12 |
| bankInterestRate | Bankrente | 4.0% |
| leasingFinanceRate | Finansieringsrente | 4.5% |
| stateResidualRate | Restafgiftsrente | 3.8% |
| depreciationRate | Afskrivning | 15% |
| downPayment | Udbetaling | 200.000 DKK |
| loanEstablishmentFee | Lånegebyr | 5.000 DKK |
| leaseEstablishmentFee | Leasinggebyr | 5.000 DKK (excl. moms) |
| adminFeeMonthly | Administrationsgebyr | 300 DKK/md |

All changes update the matrix instantly (no submit button).
Settings persist in localStorage key `carscout-compare-settings`.

---

## Row Structure (comparison matrix)

Each row has a label with an info-icon where relevant.

**Vehicle header:**
- Car name + year
- [× remove] button

**Vehicle data section:**
- Markedsværdi ex. afgift og moms
- Estimeret fuld registreringsafgift ⓘ
- Alder (derived: "37 mdr. — 0,5% sats")

**Purchase column:**
- Totalpris (base + moms + full tax)
- Udbetaling ⓘ
- Banklån
- Renter (total over period)
- Nedskrivning ⓘ
- Oprettelsesgebyr

**Flexlease column:**
- Forholdsmæssig afgift/md ⓘ (show avg if rate transitions)
- Rente af restafgift/md
- Finansieringsrente/md
- Administrationsgebyr/md
- Månedlig ydelse inkl. moms (bold)
- Førstegangsydelse ⓘ
- Nedskrivning ⓘ

**TCO row (highlighted, bottom of each column):**
- TCO [duration] måneder — large, bold, color-coded
- Lowest TCO across all cars gets green highlight
- Monthly equivalent shown below: "≈ X.XXX kr/md"

---

## Tooltip System

Info icons (ⓘ) appear next to complex term labels.
- Desktop: show on hover
- Mobile/tablet: show on tap, dismiss on tap elsewhere

Tooltip data structure (bilingual, i18n-ready):

```typescript
const tooltips = {
  restvaerdi: {
    da: "Den forudbestemte værdi af bilen ved leasingaftalens udløb, eksklusive afgift og moms. Hvis markedsværdien er lavere, hæfter du for forskellen.",
    en: "The predetermined value of the car at the end of the leasing contract, excluding tax and VAT. If the real market value is lower, you are liable for the difference."
  },
  foerstegangsydelse: {
    da: "Det indledende beløb der betales ved kontraktens indgåelse. Dækker typisk oprettelse, første måneds ydelse og forudbetalt nedskrivning.",
    en: "The initial amount paid when signing the contract. Typically covers the establishment fee, first month's payment, and prepaid depreciation."
  },
  nedskrivning: {
    da: "Bilens reelle værditab over perioden.",
    en: "The actual loss of value the car experiences over the period."
  },
  forholdsmassigAfgift: {
    da: "Systemet hvor bilens registreringsafgift betales i månedlige rater i stedet for på én gang.",
    en: "The Danish tax system where the vehicle's registration tax is paid in monthly installments instead of upfront."
  },
  anvisningspligt: {
    da: "En klausul der forpligter dig til at finde en CVR-registreret forhandler, der vil købe bilen til restværdien, når aftalen udløber.",
    en: "A clause obligating you to find a registered car dealer to buy the car for the agreed residual value when the contract expires."
  },
  fuldRegistreringsafgift: {
    da: "Den samlede afgift staten ville opkræve, hvis bilen blev importeret og købt på almindelige danske plader.",
    en: "The total tax the state would charge if the car was imported and bought outright on standard Danish license plates."
  }
}
```

---

## Validation Example

Use this to verify the calculation is correct after implementation:

**Mercedes-AMG GT (2021)**
- base_value = 700,000 DKK
- full_registration_tax = 1,300,000 DKK
- vehicle_age_months = 37 (>36 → 0.5% bracket)
- duration = 12 months

Expected Purchase TCO: 410,250 DKK
Expected Flexlease TCO: 340,612 DKK (approx 340,625 per Gemini model)

If numbers match within rounding, calculation is correct.

---

## Car Selection Flow

Cars are added to the comparison in two ways:
1. From the listing grid: checkbox on card → "Sammenlign X biler →" sticky bar
2. From the /compare page directly: "+ Tilføj bil" opens a search/select modal

Cars stored in localStorage key `carscout-compare-cars` as array of car IDs.
On page load, fetch each car's data from `/api/cars/[id]`.

Maximum 5 cars. If at limit: "Maks 5 biler. Fjern en for at tilføje."
Minimum 1 car (comparison still useful as a single-car TCO breakdown).

---

## Files to Create
- `app/compare/page.tsx` — main comparison page
- `components/comparison/comparison-matrix.tsx` — the matrix component
- `components/comparison/settings-panel.tsx` — global settings sidebar
- `components/comparison/car-column.tsx` — one car's two sub-columns
- `components/comparison/tooltip-icon.tsx` — ⓘ icon with hover/tap logic
- `lib/comparison/calculate.ts` — client-side TCO calculation engine
- `lib/comparison/tooltips.ts` — bilingual tooltip dictionary
- `lib/comparison/types.ts` — ComparisonCar, ComparisonSettings, TcoResult types
- `lib/comparison-store.ts` — localStorage management for selected car IDs

## Files to Modify
- `components/car-card.tsx` — add checkbox for comparison selection
- `app/page.tsx` — add sticky ComparisonBar when 2+ cars selected
- `app/layout.tsx` or navigation — add /compare link

## Files NOT to Touch
- `lib/tco/calculate.ts` — this page has its own client-side engine
- `tco_scenarios` table — this page does not read from or write to it
- Any scraper files

---

## Done When
1. [ ] `/compare` page loads with at least one car from the listing grid
2. [ ] Each car shows Purchase and Flexlease columns side by side
3. [ ] Changing duration (12/24/36) updates all figures instantly
4. [ ] Changing bank rate in settings updates Purchase TCO instantly
5. [ ] Mercedes AMG GT example produces Purchase TCO ≈ 410,250 and
       Flexlease TCO ≈ 340,612 at 12 months
6. [ ] A car aged 30 months on a 24-month lease shows two different
       monthly tax rates (1% for first 6 months, 0.5% for remaining 18)
7. [ ] Lowest TCO column is highlighted green
8. [ ] ⓘ icons show tooltips on hover (desktop) and tap (mobile)
9. [ ] Settings persist after page refresh
10. [ ] Works with 1 car, 3 cars, and 5 cars
11. [ ] Mobile layout: settings collapse, matrix scrolls horizontally

## Docs to Update
- `docs/02-CURRENT-STATE.md` — SPEC-013 complete
- `docs/04-ROADMAP.md` — mark comparison view done

## Dependencies
- SPEC-007 (BUG-02 — TCO must work before comparison is meaningful)
- SPEC-012 (Favorites — checkbox selection flow)
- SPEC-014 (Navigation — /compare link in nav)

Note: SPEC-019 (flexlease engine) runs the same calculation logic but
server-side. Keep lib/comparison/calculate.ts and lib/tco/calculate.ts
in sync — they should produce identical results for the same inputs.

## Out of Scope
- Company scenario (private only for now — company adds complexity without
  immediate value for the primary use case)
- Saving or sharing comparison URLs (future)
- PDF export of comparison (future)
- Restvaerdi risk calculation (requires actual restvaerdi from listing —
  show as "—" if not available, with tooltip explaining why)

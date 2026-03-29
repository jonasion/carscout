# CarScout — TCO Business Logic

## Overview

TCO = total out-of-pocket cost over a holding period, divided by months.
It includes: on-road acquisition cost + financing cost + running costs − exit proceeds.

This is the number displayed on every card and in the scenario table.

---

## Danish Registration Tax (2026 Rules)

### ICE Vehicles

```
taxable_value = purchase_price - 24,300 (base deduction)
tax = 25% × min(taxable_value, 72,900)
    + 85% × min(max(taxable_value - 72,900, 0), 153,600)
    + 150% × max(taxable_value - 226,500, 0)

CO2 surcharge:
  + 280 DKK/g for 0–109 g/km
  + 560 DKK/g for 109–139 g/km
  + 1,064 DKK/g above 139 g/km
```

### EVs (2026)

```
taxable_value = purchase_price - 165,000 (EV deduction) - 24,300 (base deduction)
raw_tax = apply ICE brackets above
final_tax = raw_tax × 0.40   (60% discount in 2026)
No CO2 surcharge
```

### EV Discount Escalation Schedule
- 2026: 60% discount (40% of raw tax)
- 2027: 52% discount (48% of raw tax)  ← Wait, check this — discount % increases each year
- 2028: 44% discount
- 2029: 36% discount
- 2030: 20% discount (80% reduction)

Always flag which year's rules were used in `tco_scenarios.notes`.

### EU Import (Used Car, >6 months old, >6,000 km)
- No Danish VAT recharged
- VAT saving vs DK dealer ≈ 5% of purchase price
- Same registration tax formula applies
- Add 15,000 DKK generic import costs

---

## Scenarios Computed

Every car gets all applicable combinations:

| Dimension | Values |
|---|---|
| Acquisition | purchase, lease (if lease data available) |
| Usage | private, company |
| Origin | dk_registered, dk_unregistered, eu_import |
| Holding period | 2 years, 3 years, 5 years |

Company + lease combinations are excluded (not typical in DK).
EU import only applies to foreign-registered cars.

---

## Purchase — Total Out-of-Pocket

### On-Road Cost
```
on_road_cost = purchase_price
             + registration_tax (if dk_unregistered or eu_import)
             - ev_deduction_applied (if EV: 165,000 DKK before tax calc)
             - vat_saved (if eu_import and eligible)
             + import_costs (if eu_import: 15,000 DKK)
```

### Financing
```
financed_amount = on_road_cost - down_payment
monthly_loan_payment = annuity(financed_amount, annual_rate, term_months)
total_financing_cost = (monthly × term) - financed_amount
```

Default loan rate: from `tco_config` or user input.
Default down payment: 200,000 DKK (adjustable via financing sensitivity graph).

### Running Costs (over holding period)
```
fuel_energy = annual_km × consumption × fuel_price × years
insurance = car_value × insurance_pct × years
maintenance = car_value × maintenance_pct × years
  (maintenance_pct_young if car < 3yr, maintenance_pct_old if ≥ 3yr)
company_car_tax = car_value × 25% × years (company scenario only)
```

### Exit
```
estimated_market_value = depreciation_curve(on_road_cost, year)
net_exit_proceeds = estimated_market_value
```

### Total
```
total_outofpocket = down_payment
                  + total_loan_payments
                  + running_costs
                  - net_exit_proceeds

monthly_equivalent = total_outofpocket / (years × 12)
```

---

## Lease (Flexleasing) — Total Out-of-Pocket

### Reverse-Engineer Implied APR
Use IRR of cashflows:
`[-down_payment, -monthly × n_months, +market_value_at_exit]`

This reveals the true financing cost hidden in the monthly payment.

### Restvaerdi Risk
```
if market_value >= restvaerdi: risk = 0
if market_value < restvaerdi: risk_cost = restvaerdi - market_value
```
User carries this gap at end of lease.

### Total
```
total_outofpocket = down_payment
                  + stiftelsesgebyr (~3,000 DKK)
                  + tinglysning (~1,500 DKK + 1.45% of financed amount)
                  + (monthly × term)
                  + running_costs
                  + restvaerdi_risk_cost
                  - net_exit_proceeds

monthly_equivalent = total / term_months
```

---

## Depreciation Model

### Tier 1 (Preferred)
Model-specific curve from `depreciation_curves` table.
Built from scraped listings of same brand+model across registration years.
Refreshed each scrape cycle.

### Tier 2 (Fallback Heuristic)

| Fuel Type | Yr1 | Yr2 | Yr3 | Yr4 | Yr5 |
|---|---|---|---|---|---|
| ICE petrol | 82% | 72% | 63% | 57% | 52% |
| ICE diesel | 80% | 70% | 61% | 55% | 50% |
| EV mainstream | 78% | 66% | 56% | 50% | 46% |
| EV early-gen | 73% | 60% | 49% | 42% | 37% |
| PHEV | 80% | 68% | 58% | 51% | 47% |

Tier 2 results are flagged as estimates in `depreciation_source`.

---

## Financing Sensitivity Graph

X-axis: down payment (100,000 → 400,000 DKK in steps)
Y-axis: monthly equivalent DKK
Lines: purchase private, purchase company

Shows the crossover point where more down payment is or isn't worth it.
Useful for comparing: "should I put in 300k or 150k?"

---

## Default Config Values (tco_config)

| Key | Value |
|---|---|
| annual_km | 15,000 |
| fuel_price_dkk_per_l | 14.5 |
| diesel_price_dkk_per_l | 13.0 |
| ev_kwh_price_dkk | 3.2 |
| insurance_pct_of_value | 3.5% |
| maintenance_pct_young | 1.5% |
| maintenance_pct_old | 2.8% |
| import_generic_costs_dkk | 15,000 |
| company_car_tax_rate_pct | 25% |

All values are user-adjustable via the `tco_config` table.

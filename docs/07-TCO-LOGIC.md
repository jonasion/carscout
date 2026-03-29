# CarScout — TCO Business Logic
# FILE LOCATION: C:\Users\Simon\carscout\docs\07-TCO-LOGIC.md
# Updated: SPEC-019 flexlease refinement incorporated

## Overview

TCO = total out-of-pocket cost over a holding period, divided by months.
The primary display value is `monthly_equivalent_dkk`.

Two calculation paths: **Purchase** and **Flexlease**.
Running costs (fuel, insurance, maintenance) apply to both and are added on top.

---

## Purchase TCO

### On-Road Cost
```
moms_amount   = base_value × 0.25
total_price   = base_value + moms_amount + full_registration_tax

on_road_cost  = total_price
              - ev_deduction (if EV: 165,000 DKK before tax calc, 40% discount 2026)
              - vat_saved (if eu_import, used >6mo, >6,000km: ~5% of price)
              + import_costs (if eu_import: 15,000 DKK)
```

### Financing
```
loan_amount           = on_road_cost - down_payment
monthly_loan_payment  = annuity(loan_amount, bank_interest_rate, term_months)
total_loan_cost       = (monthly_loan_payment × term_months) - loan_amount
```

### Depreciation Base (Purchase)
Depreciation is calculated on `total_price` (base + moms + full registration tax).
This is correct — the buyer owns and depreciates the fully taxed asset.

### Running Costs (over holding period)
```
fuel_energy   = annual_km × consumption × fuel_price × years
insurance     = on_road_cost × insurance_pct × years
maintenance   = on_road_cost × maintenance_pct × years
              (maintenance_pct_young if car < 3yr, maintenance_pct_old if ≥ 3yr)
company_tax   = on_road_cost × 25% × years  (company scenario only)
```

### Exit
```
market_value_at_exit = depreciation_curve(on_road_cost, holding_years)
```

### Total
```
total_outofpocket    = down_payment
                     + total_loan_payments
                     + running_costs
                     - market_value_at_exit

monthly_equivalent   = total_outofpocket / (holding_years × 12)
```

---

## Flexlease TCO

### Critical difference from Purchase
In flexlease, the leasing company owns the car. The lessee:
- Never pays full registration tax upfront
- Pays it monthly as `forholdsmæssig registreringsafgift`
- Depreciates only the base value (NOT the full taxed price)
- Pays moms (25%) on all monthly lease costs (private consumer)

### Forholdsmæssig Registreringsafgift (Proportional Tax)
Monthly tax rate depends on vehicle age at lease start:

| Vehicle age | Monthly rate |
|---|---|
| ≤ 3 months | 2.0% of full_registration_tax |
| 3–36 months | 1.0% of full_registration_tax |
| > 36 months | 0.5% of full_registration_tax |

### Monthly Payment Decomposition
The monthly lease payment consists of four components (all ex moms):

```
monthly_flex_tax          = full_registration_tax × tax_bracket_rate
monthly_state_interest    = full_registration_tax × state_residual_interest / 12
                            (state_residual_interest = 3.8% default)
monthly_finance_interest  = base_value × leasing_finance_interest / 12
                            (leasing_finance_interest = 4.5% default)
monthly_admin_fee         = 300 DKK (default, from tco_config)

total_monthly_ex_moms     = sum of above
total_monthly_incl_moms   = total_monthly_ex_moms × 1.25  (private consumer)
```

**Important:** If the source listing already states a monthly payment including moms,
use that directly. Only apply this decomposition when computing from scratch (no
listing data available) or to validate/explain a listed price.

### Upfront Costs
```
stiftelsesgebyr           = 5,000 DKK ex moms → 6,250 DKK incl moms (default)
tinglysningsafgift        = 1,500 DKK + 1.45% of financed amount
foerstegangsydelse        = from listing or user input (down payment)
```

### Depreciation Base (Flexlease)
**Depreciation is calculated on base_value only (ex tax, ex moms).**
Then moms is applied for the private consumer:

```
depreciation_ex_moms      = base_value × market_depreciation_rate
depreciation_incl_moms    = depreciation_ex_moms × 1.25  (private consumer)
```

This is the most important difference from purchase TCO.
The lessee is not responsible for depreciating the registration tax component.

### Restvaerdi Risk
```
if market_value_at_exit >= restvaerdi:  risk_cost = 0
if market_value_at_exit < restvaerdi:   risk_cost = restvaerdi - market_value_at_exit
```

The lessee carries this gap. It is a real cost and must be included.

### Implied APR (Reverse-Engineered)
Use IRR on cashflows to reveal the true financing cost hidden in the monthly payment:
```
cashflows = [-foerstegangsydelse, -monthly × n_months, +market_value_at_exit]
implied_apr = IRR(cashflows) × 12
```

This allows direct comparison: "is flexlease cheaper than a bank loan at X%?"

### Total
```
total_outofpocket    = foerstegangsydelse
                     + stiftelsesgebyr_incl_moms
                     + tinglysningsafgift
                     + (total_monthly_incl_moms × term_months)
                     + running_costs
                     + restvaerdi_risk_cost
                     - market_value_at_exit

monthly_equivalent   = total_outofpocket / term_months
```

---

## Danish Registration Tax (2026 SKAT Rules)

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
raw_tax       = apply ICE brackets above (no CO2 surcharge)
final_tax     = raw_tax × 0.40   (60% discount in 2026)
```

### EV Discount Schedule
| Year | Discount | Multiplier |
|---|---|---|
| 2026 | 60% | × 0.40 |
| 2027 | 52% | × 0.48 |
| 2028 | 44% | × 0.56 |
| 2029 | 36% | × 0.64 |
| 2030 | 20% | × 0.80 |

Always flag which year's rules were applied in `TcoScenario.notes`.

### EU Import (Used car, >6 months old, >6,000 km)
- No Danish VAT recharged
- VAT saving ≈ 5% of purchase price
- Same registration tax formula applies
- Add 15,000 DKK generic import costs

---

## Depreciation Model

### Tier 1 (Preferred)
Model-specific residual value percentages from `depreciation_curves` table.
Built from scraped listings of same brand+model across registration years.
Refreshed each scrape cycle. Use when sample_size ≥ 5.

### Tier 2 (Fallback Heuristic)
Used when no Tier 1 curve exists for the model.

| Fuel type | Yr1 | Yr2 | Yr3 | Yr4 | Yr5 |
|---|---|---|---|---|---|
| ICE petrol | 82% | 72% | 63% | 57% | 52% |
| ICE diesel | 80% | 70% | 61% | 55% | 50% |
| EV mainstream | 78% | 66% | 56% | 50% | 46% |
| EV early-gen | 73% | 60% | 49% | 42% | 37% |
| PHEV | 80% | 68% | 58% | 51% | 47% |

Always record tier used in `depreciation_source`. Flag Tier 2 as estimate in notes.

---

## Default Config Values (tco_config)

| Key | Value | Notes |
|---|---|---|
| annual_km | 15,000 | |
| fuel_price_dkk_per_l | 14.5 | |
| diesel_price_dkk_per_l | 13.0 | |
| ev_kwh_price_dkk | 3.2 | |
| insurance_pct_of_value | 3.5% | |
| maintenance_pct_young | 1.5% | car < 3yr |
| maintenance_pct_old | 2.8% | car ≥ 3yr |
| import_generic_costs_dkk | 15,000 | |
| company_car_tax_rate_pct | 25% | |
| ev_discount_pct_2026 | 60% | |
| ev_deduction_dkk | 165,000 | |
| market_depreciation_rate | 15% | annual, used when no curve |
| bank_interest_rate | 4.0% | purchase financing default |
| leasing_finance_interest | 4.5% | flexlease financing default |
| state_residual_tax_interest | 3.8% | monthly state interest on residual tax |
| lease_admin_fee_monthly_dkk | 300 | default admin fee |
| loan_establishment_fee_dkk | 5,000 | purchase |
| lease_establishment_fee_dkk | 5,000 | ex moms → 6,250 incl moms |

---

## UI Tooltip Dictionary (Danish)

For use as on-hover tooltips in the detail view. Implemented as part of SPEC-019.

**Restværdi [Residual value]**
Den forudbestemte værdi af bilen ved leasingkontraktens udløb, ekskl. afgift og moms.
Eksempel: Hvis kontrakten angiver 300.000 kr., skal bilen være dette værd ved aflevering. Er markedsværdien kun 250.000 kr., betaler du forskellen på 50.000 kr.

**Førstegangsydelse [Down payment]**
Det indledende engangsbeløb, der betales ved kontraktindgåelse. Dækker typisk oprettelsesgebyr, første måneds leje og en forudbetaling af forventet nedskrivning.
Eksempel: En indbetaling på 80.000 kr. sænker den månedlige ydelse og skaber en buffer mod faldende restværdi.

**Nedskrivning [Depreciation]**
Det værditab bilen oplever i leasingperioden.
Eksempel: En bil købt for 400.000 kr. ekskl. afgift, der er 340.000 kr. værd et år senere, har oplevet en nedskrivning på 60.000 kr.

**Forholdsmæssig registreringsafgift [Proportional registration tax]**
Det danske system, hvor bilens registreringsafgift betales i månedlige rater i stedet for på én gang.
Eksempel: En 3 år gammel bil betaler 0,5% af sin samlede beregnede afgift hver måned, den leases.

**Anvisningspligt [Duty to refer]**
En klausul, der forpligter dig til ved kontraktudløb at finde en CVR-registreret bilforhandler, som køber bilen til den aftalte restværdi. Leasingselskabet tager ikke blot bilen tilbage.
Eksempel: Du skal aktivt kontakte forhandlere for at sælge bilen på vegne af leasingselskabet, når din kontrakt udløber.

**Fuld registreringsafgift [Full registration tax]**
Den samlede afgift, staten ville opkræve, hvis bilen blev importeret og købt direkte på standard nummerplader.
Eksempel: En bil kan koste 500.000 kr. fra fabrikken, men den fulde registreringsafgift kan tilføje yderligere 700.000 kr. til den endelige pris.

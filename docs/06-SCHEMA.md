# CarScout — Database Schema
# FILE LOCATION: C:\Users\Simon\carscout\docs\06-SCHEMA.md
# Updated: SPEC-019 flexlease refinement — new tco_scenarios columns added

## cars_raw
Primary listing table. One row per listing per source.

Key columns:
- `id` uuid PK
- `source` — 'bilbasen' or 'autoscout24'
- `source_listing_id` — unique ID from source platform
- `brand`, `model`, `variant`
- `fuel_type` — 'el', 'benzin', 'diesel', 'hybrid'
- `first_registration_year` int
- `mileage_km` int
- `price_amount` numeric — in price_currency
- `price_currency` text — default 'DKK'
- `country` — 'DK', 'DE', etc.
- `power_kw`, `co2_g_km`, `battery_kwh`, `range_km`
- `consumption_l_100km`, `consumption_kwh_100km`
- `is_registered_dk` boolean
- `has_dk_vat` boolean
- `listing_type` — 'sale' or 'lease'
- `lease_monthly_dkk`, `lease_down_payment_dkk`, `lease_term_months`
- `lease_km_per_year`, `lease_restvaerdi_dkk`
- `image_urls` jsonb — array of source image URLs
- `stored_image_url` text — Supabase Storage public URL
- `dealer_name`, `dealer_email`, `dealer_phone`
- `is_sold` boolean — default false
- `raw_json` jsonb — full original scrape payload
- `scraped_at` timestamptz — **NEVER overwrite — first seen date, anchors days-on-market**
- `updated_at` timestamptz — updated on every upsert

UNIQUE: (source, source_listing_id)

---

## price_history
Append-only price log. Never update existing rows.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| car_id | uuid FK | references cars_raw(id) on delete cascade |
| price_amount | numeric | Price at this observation |
| price_currency | text | Default 'DKK' |
| recorded_at | timestamptz | When observed |
| days_on_market | int | Days since cars_raw.scraped_at |

**Write rule:** Insert on new Listing OR price_amount change. Never update.

Indexes: car_id, recorded_at

---

## tco_scenarios
One row per scenario combination per Listing.

### Dimension columns (what makes this scenario unique)
- `car_id` uuid FK
- `holding_period_years` int — 2, 3, or 5
- `scenario_type` text — 'purchase' or 'lease'
- `usage_type` text — 'private' or 'company'
- `origin` text — 'dk_registered', 'dk_unregistered', 'eu_import'

### Input columns
- `purchase_price_dkk`
- `down_payment_dkk`
- `loan_rate_pct`
- `loan_term_months`
- `vehicle_age_months` int — **NEW** required for flexlease tax bracket rate

### Purchase — computed columns
- `registration_tax_dkk`
- `ev_deduction_applied_dkk`
- `vat_saved_dkk` — eu_import only
- `import_costs_dkk` — eu_import only
- `total_on_road_cost_dkk`
- `financed_amount_dkk`
- `monthly_loan_payment_dkk`
- `total_loan_cost_dkk`

### Flexlease — computed columns (UPDATED — now decomposed)
- `lease_down_payment_dkk` — førstegangsydelse
- `lease_term_months`
- `lease_restvaerdi_dkk`
- `lease_stiftelsesgebyr_dkk` — incl moms
- `lease_tinglysning_dkk`
- `lease_tax_bracket_rate` numeric — **NEW** 0.02 / 0.01 / 0.005
- `lease_monthly_flex_tax_dkk` numeric — **NEW** forholdsmæssig afgift component
- `lease_monthly_state_interest_dkk` numeric — **NEW** state interest component
- `lease_monthly_finance_interest_dkk` numeric — **NEW** leasing company interest
- `lease_monthly_admin_fee_dkk` numeric — **NEW** admin fee component
- `lease_monthly_ex_moms_dkk` numeric — **NEW** sum of above ex moms
- `lease_monthly_incl_moms_dkk` numeric — **NEW** incl moms (private) or ex moms (company)
- `lease_total_payments_dkk`
- `lease_implied_apr_pct` numeric — reverse-engineered from IRR
- `restvaerdi_risk_dkk`

### Running costs (both scenarios)
- `fuel_energy_total_dkk`
- `insurance_total_dkk`
- `maintenance_total_dkk`
- `company_car_tax_total_dkk` — company scenario only

### Exit + result
- `estimated_market_value_at_exit_dkk`
- `depreciation_source` — 'tier1' or 'tier2'
- `net_exit_proceeds_dkk`
- `total_outofpocket_dkk`
- `monthly_equivalent_dkk` — **PRIMARY DISPLAY VALUE**
- `notes` text — flags, year of tax rules, tier warnings
- `computed_at` timestamptz

### SQL migration for new columns (run in Supabase SQL editor)
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

---

## tco_config
Key-value config. 19+ rows. Add new rows for flexlease defaults.

Key values:
- `annual_km` = 15000
- `fuel_price_dkk_per_l` = 14.5
- `diesel_price_dkk_per_l` = 13.0
- `ev_kwh_price_dkk` = 3.2
- `insurance_pct_of_value` = 3.5
- `maintenance_pct_young` = 1.5
- `maintenance_pct_old` = 2.8
- `import_generic_costs_dkk` = 15000
- `company_car_tax_rate_pct` = 25
- `registration_tax_ev_discount_pct_2026` = 60
- `registration_tax_ev_deduction_dkk` = 165000
- `market_depreciation_rate` = 15 (% annual)
- `bank_interest_rate` = 4.0 (% annual) — **NEW**
- `leasing_finance_interest` = 4.5 (% annual) — **NEW**
- `state_residual_tax_interest` = 3.8 (% annual) — **NEW**
- `lease_admin_fee_monthly_dkk` = 300 — **NEW**
- `loan_establishment_fee_dkk` = 5000 — **NEW**
- `lease_establishment_fee_dkk` = 5000 (ex moms, → 6250 incl) — **NEW**

### SQL to insert new config rows
```sql
insert into tco_config (key, value, description) values
  ('market_depreciation_rate', '15', 'Annual depreciation rate % used when no curve exists'),
  ('bank_interest_rate', '4.0', 'Default bank loan interest rate % for purchase financing'),
  ('leasing_finance_interest', '4.5', 'Default leasing company finance interest rate %'),
  ('state_residual_tax_interest', '3.8', 'State interest rate % on residual registration tax'),
  ('lease_admin_fee_monthly_dkk', '300', 'Monthly admin fee DKK for flexlease'),
  ('loan_establishment_fee_dkk', '5000', 'Establishment fee DKK for bank loan'),
  ('lease_establishment_fee_dkk', '5000', 'Establishment fee DKK for flexlease ex moms')
on conflict (key) do nothing;
```

---

## depreciation_curves
Model-specific residual value percentages. Populated as market data accumulates.

Columns: brand, model, fuel_type, data_source, year_1–5_residual_pct, sample_size, last_updated

Use when sample_size ≥ 5. Otherwise fall back to Tier 2 heuristics in tco_config.

---

## search_profiles
7 active rows (5 Bilbasen, 2 Autoscout24). See docs/02-CURRENT-STATE.md.

---

## contact_log
Append-only dealer contact log. Ready for future email negotiation agent.

---

## favorites (NOT YET CREATED)
Create when SPEC-012 is implemented:
```sql
create table favorites (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars_raw(id) on delete cascade,
  session_id text,
  created_at timestamptz default now()
);
create index idx_favorites_session on favorites(session_id);
```

# CarScout — Database Schema

## cars_raw
Primary listing table. One row per listing per source.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| source | text | 'bilbasen' or 'autoscout24' |
| source_listing_id | text | Unique ID from source |
| url | text | Original listing URL |
| title | text | |
| brand | text | |
| model | text | |
| variant | text | |
| first_registration_year | int | |
| mileage_km | int | |
| fuel_type | text | 'el', 'benzin', 'diesel', 'hybrid' |
| transmission | text | 'automatic', 'manual' |
| power_kw | numeric | |
| co2_g_km | numeric | |
| battery_kwh | numeric | EV only |
| range_km | numeric | EV only |
| consumption_l_100km | numeric | ICE |
| consumption_kwh_100km | numeric | EV |
| price_amount | numeric | In price_currency |
| price_currency | text | Default 'DKK' |
| country | text | 'DK', 'DE', etc. |
| is_registered_dk | boolean | |
| has_dk_vat | boolean | |
| listing_type | text | Default 'sale' |
| lease_monthly_dkk | numeric | Flexlease listings |
| lease_down_payment_dkk | numeric | |
| lease_term_months | int | |
| lease_km_per_year | int | |
| lease_restvaerdi_dkk | numeric | Guaranteed residual value |
| image_urls | jsonb | Array of source image URLs |
| stored_image_url | text | Supabase Storage public URL |
| dealer_name | text | |
| dealer_email | text | |
| dealer_phone | text | |
| is_sold | boolean | Default false |
| raw_json | jsonb | Full original scrape payload |
| scraped_at | timestamptz | First seen (do not overwrite on upsert) |
| updated_at | timestamptz | Updated on every upsert |
| UNIQUE | | (source, source_listing_id) |

## price_history
Append-only price log. One row per price change event.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| car_id | uuid FK | references cars_raw(id) on delete cascade |
| price_amount | numeric | Price at this point in time |
| price_currency | text | Default 'DKK' |
| recorded_at | timestamptz | When this price was observed |
| days_on_market | int | Days since cars_raw.scraped_at |

Indexes: `car_id`, `recorded_at`

**Write logic:** On every `upsertCar()` call, if the car is new OR `price_amount` has changed, insert a new row. Never update existing rows.

## tco_scenarios
One row per scenario combination per car.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| car_id | uuid FK | references cars_raw(id) |
| holding_period_years | int | 2, 3, or 5 |
| scenario_type | text | 'purchase' or 'lease' |
| usage_type | text | 'private' or 'company' |
| origin | text | 'dk_registered', 'dk_unregistered', 'eu_import' |
| purchase_price_dkk | numeric | |
| down_payment_dkk | numeric | |
| financed_amount_dkk | numeric | |
| loan_rate_pct | numeric | |
| loan_term_months | int | |
| monthly_loan_payment_dkk | numeric | |
| registration_tax_dkk | numeric | |
| ev_deduction_applied_dkk | numeric | |
| vat_saved_dkk | numeric | EU import only |
| import_costs_dkk | numeric | EU import only |
| total_on_road_cost_dkk | numeric | |
| lease_* columns | numeric | Flexlease scenario fields |
| fuel_energy_total_dkk | numeric | Over holding period |
| insurance_total_dkk | numeric | |
| maintenance_total_dkk | numeric | |
| company_car_tax_total_dkk | numeric | Company scenario only |
| estimated_market_value_at_exit_dkk | numeric | Depreciation applied |
| depreciation_source | text | 'tier1' or 'tier2' |
| restvaerdi_risk_dkk | numeric | Lease scenario only |
| net_exit_proceeds_dkk | numeric | |
| total_outofpocket_dkk | numeric | |
| monthly_equivalent_dkk | numeric | **PRIMARY DISPLAY VALUE** |
| notes | text | Flags, warnings |
| computed_at | timestamptz | |

## tco_config
Key-value config table. 19 rows seeded.

Key values:
- `annual_km` = 15000
- `fuel_price_dkk_per_l` = 14.5
- `diesel_price_dkk_per_l` = 13.0
- `ev_kwh_price_dkk` = 3.2
- `insurance_pct_of_value` = 3.5 (%)
- `maintenance_pct_young` = 1.5 (% per year, car <3yr)
- `maintenance_pct_old` = 2.8 (% per year, car 3yr+)
- `import_generic_costs_dkk` = 15000
- `company_car_tax_rate_pct` = 25
- `registration_tax_ev_discount_pct_2026` = 60
- `registration_tax_ev_deduction_dkk` = 165000
- Registration tax bracket thresholds and rates (2026 SKAT rules)

## depreciation_curves
Model-specific residual value percentages. Populated as market data accumulates.

## search_profiles
Active scrape targets. 7 rows seeded (5 Bilbasen, 2 Autoscout24).

## contact_log
Append-only log of dealer contact attempts. Ready for future email negotiation agent.

## favorites (NOT YET CREATED)
To be created when favorites feature is implemented:
```sql
create table favorites (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars_raw(id) on delete cascade,
  session_id text,    -- localStorage UUID until auth exists
  created_at timestamptz default now()
);
```

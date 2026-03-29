# CarScout — Domain Model

## Core Principle

A domain model defines the real-world objects your system represents, their properties, and their relationships — before any code is written. It is the shared vocabulary between you, the AI, and the codebase. When everyone uses the same names for the same things, bugs from misunderstanding disappear.

---

## The Core Objects

### 1. Vehicle
The physical car that exists in the world. Manufacturer, model, generation, fuel type. A Vehicle is independent of any listing or price.

```
Vehicle
  brand           string        "Volkswagen"
  model           string        "ID.4"
  variant         string        "Pro Performance"
  fuel_type       FuelType      el | benzin | diesel | hybrid | phev
  first_year      int           2021
  power_kw        number
  co2_g_km        number | null
  battery_kwh     number | null
  range_km        number | null
  transmission    Transmission  automatic | manual
```

**Key insight:** Multiple Listings can refer to the same Vehicle. The same 2021 VW ID.4 can appear on Bilbasen and Autoscout24 simultaneously. Vehicle is an identity, Listing is an offer.

---

### 2. Listing
A specific offer to sell or lease a Vehicle at a specific price, from a specific dealer, on a specific marketplace. A Listing has a lifecycle — it appears, its price may change, it eventually sells or is withdrawn.

```
Listing
  id              uuid
  vehicle         Vehicle       (embedded, not normalized for now)
  source          Source        bilbasen | autoscout24
  source_id       string        the ID on the originating platform
  url             string
  mileage_km      int
  price           Money         { amount, currency }
  country         string        "DK" | "DE"
  registration    RegistrationStatus
  dealer          Dealer
  images          string[]      source image URLs
  stored_image    string | null Supabase Storage URL
  listing_type    ListingType   sale | lease
  lease_terms     LeaseTerms | null
  is_sold         boolean
  first_seen_at   datetime      scraped_at — never overwritten
  last_seen_at    datetime      updated on every scrape
```

**Key insight:** `first_seen_at` must never be overwritten on re-scrape. It is the anchor for days-on-market calculations. This is currently `scraped_at` in `cars_raw` but the upsert logic must protect it.

**Registration status** determines which TCO scenarios apply:
```
RegistrationStatus
  dk_registered     Danish plates, tax already paid
  dk_unregistered   In Denmark, no plates, buyer pays full tax
  eu_import         Foreign-registered, buyer imports and registers
```

---

### 3. PriceEvent
An observation of a Listing's price at a point in time. Append-only — never updated. This is the slowly changing dimension.

```
PriceEvent
  id              uuid
  listing_id      uuid          → Listing
  price           Money         { amount, currency }
  observed_at     datetime
  days_on_market  int           observed_at - Listing.first_seen_at
```

**Derived signals (computed from PriceEvent history):**
- `latest_price` — most recent PriceEvent
- `price_drop` — latest_price < previous_price
- `price_drop_amount` — the delta
- `days_on_market` — latest PriceEvent days_on_market
- `is_stale` — days_on_market > 90

**Key insight:** A Listing with multiple PriceEvents tells a story. Falling price = motivated seller. Rising price = market correction or error. No change after 90 days = negotiation opportunity.

---

### 4. TcoScenario
A computed analysis of what a Listing will actually cost to own under a specific set of assumptions. One Listing has many TcoScenarios (one per combination of dimensions).

```
TcoScenario
  id                    uuid
  listing_id            uuid          → Listing
  
  -- Dimensions (what makes this scenario unique)
  acquisition_type      AcquisitionType    purchase | lease
  usage_type            UsageType          private | company
  origin                RegistrationStatus dk_registered | dk_unregistered | eu_import
  holding_period_years  int                2 | 3 | 5
  
  -- Inputs
  purchase_price_dkk    number
  down_payment_dkk      number
  loan_rate_pct         number
  
  -- Computed — on-road cost
  registration_tax_dkk  number
  ev_deduction_dkk      number
  vat_saved_dkk         number        eu_import only
  import_costs_dkk      number        eu_import only
  total_on_road_dkk     number
  
  -- Computed — financing
  financed_amount_dkk   number
  monthly_loan_dkk      number
  total_loan_cost_dkk   number
  
  -- Computed — running costs
  fuel_total_dkk        number
  insurance_total_dkk   number
  maintenance_total_dkk number
  company_tax_total_dkk number        company only
  
  -- Computed — exit
  market_value_at_exit  number
  depreciation_source   DepreciationSource  tier1 | tier2
  
  -- Computed — lease specific
  lease_implied_apr     number | null
  restvaerdi_risk_dkk   number | null
  
  -- Result
  total_outofpocket_dkk number
  monthly_equivalent_dkk number       PRIMARY DISPLAY VALUE
  
  -- Meta
  computed_at           datetime
  notes                 string        flags, warnings, year of tax rules used
```

**Key insight:** `monthly_equivalent_dkk` is the single number that makes CarScout useful. Everything else feeds into it.

---

### 5. DepreciationCurve
A model-specific set of residual value percentages built from observed market data. Tier 1 data. Preferred over Tier 2 heuristics.

```
DepreciationCurve
  brand             string
  model             string
  fuel_type         FuelType
  year_1_pct        number    residual as % of on-road cost
  year_2_pct        number
  year_3_pct        number
  year_4_pct        number
  year_5_pct        number
  sample_size       int       number of listings used to build this curve
  last_updated      datetime
  data_source       string
```

---

### 6. SearchProfile
A saved search configuration that the scraper uses to find new listings. Not a user-facing search — this is the automated scraping target.

```
SearchProfile
  id            uuid
  name          string      "EV under 300k DKK"
  source        Source      bilbasen | autoscout24
  search_url    string      the full search URL with filters applied
  active        boolean
  last_run_at   datetime | null
  notes         string
```

---

### 7. Scraper (Abstract)
Something that takes a SearchProfile and produces Listings. Each source has a concrete implementation.

```
Scraper (interface)
  source: Source
  scrape(profile: SearchProfile): Promise<Listing[]>
```

Concrete implementations:
- `BilbasenScraper` — two-step: search API + `_props` extraction
- `AutoScout24Scraper` — Scrapfly + `__NEXT_DATA__` extraction
- `(future) MobileDeScraper` — blocked by Akamai currently

---

### 8. TcoConfig
A named set of assumptions used in TCO computation. Currently a flat key-value table but modelled as an object.

```
TcoConfig
  annual_km               number    15000
  fuel_price_per_l        number    14.5 DKK
  diesel_price_per_l      number    13.0 DKK
  ev_kwh_price            number    3.2 DKK
  insurance_pct           number    3.5%
  maintenance_pct_young   number    1.5%  (car < 3yr)
  maintenance_pct_old     number    2.8%  (car ≥ 3yr)
  import_costs            number    15000 DKK
  company_tax_rate        number    25%
  ev_discount_pct         number    60%   (2026 rules)
  ev_deduction            number    165000 DKK
  tax_year                int       2026
```

---

### 9. Favorite
A user's saved interest in a Listing. Enables comparison workflow.

```
Favorite
  id            uuid
  listing_id    uuid        → Listing
  session_id    string      localStorage UUID (pre-auth)
  created_at    datetime
```

**Constraint:** Max 5 favorites. Max 3 in comparison view simultaneously.

---

### 10. Dealer
Information about who is selling the car. Embedded in Listing for now.

```
Dealer
  name          string
  phone         string | null
  email         string | null
  source        Source        which platform this dealer operates on
```

---

## Object Relationships

```
SearchProfile ──── drives ────► Scraper
                                    │
                                    ▼
                               Listing ◄──── PriceEvent (many)
                                  │
                                  ├── contains ──► Vehicle (embedded)
                                  ├── has ────────► Dealer (embedded)
                                  └── has many ──► TcoScenario
                                                        │
                                                        └── uses ──► TcoConfig
                                                        └── uses ──► DepreciationCurve

User/Session ──── saves ──► Favorite ──► Listing
```

---

## Mapping to Current Database

| Domain Object | Database Table | Notes |
|---|---|---|
| Vehicle | cars_raw | Embedded in listing, not normalized |
| Listing | cars_raw | Primary table |
| PriceEvent | price_history | Recently added ✅ |
| TcoScenario | tco_scenarios | ✅ |
| DepreciationCurve | depreciation_curves | Schema exists, sparse data |
| SearchProfile | search_profiles | ✅ |
| TcoConfig | tco_config | ✅ |
| Favorite | (not yet created) | See roadmap |
| Scraper | lib/scrapers/*.ts | Procedural, needs refactoring |
| Dealer | cars_raw (columns) | Embedded |

---

## Naming Conventions Going Forward

Use these names consistently in code, specs, comments, and conversations:

| Avoid | Use Instead |
|---|---|
| "car" (ambiguous) | `listing` (an offer) or `vehicle` (the physical car) |
| "price" | `listing_price` (sticker) or `monthly_equivalent` (TCO) |
| "import" | `eu_import` (specific scenario) |
| "result" | `tco_scenario` |
| "user" | `session` (until auth exists) |
| "save" | `favorite` (user action) or `upsert` (database action) |

---

## What This Enables

With a clear domain model:

1. **New AI sessions** start with shared vocabulary — "add PriceEvent display to Listing card" is unambiguous
2. **GSD specs** reference domain objects — the AI knows what a `TcoScenario` is without explanation
3. **Refactoring** has clear targets — the Scraper objects are the next thing to clean up
4. **New features** fit naturally — a `ComparisonSet` is obviously a collection of `Favorites`

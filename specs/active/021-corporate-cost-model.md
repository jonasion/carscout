# SPEC-021: Corporate Cost Model — Split Erhvervsleasing, Remove Erhvervskøb
# FILE LOCATION: C:\Users\Simon\carscout\specs\backlog\021-corporate-cost-model.md

## Status
backlog

## Domain Objects Touched
TcoScenario, TcoConfig, ComparisonSettings, CarColumn, SettingsPanel

## Problem

The current corporate TCO model is fundamentally broken. It mixes corporate
capital costs with private income tax liabilities into a single number, which
distorts the calculation and confuses the user.

Three architectural changes required:

### 1. Remove company purchase (erhvervskøb) entirely

Companies cannot deduct VAT on the purchase of standard passenger cars (white
plates) in Denmark. This scenario ties up liquidity with no tax advantage and
is practically non-existent in the market. Remove it from the engine and UI.

### 2. Split business flexlease (erhvervsleasing) into two outputs

Do not merge corporate and private budgets into a single TCO. The UI and data
model must present two metrics side-by-side:

- **Virksomhedens omkostning (company cost)**: the monthly flexlease payment
  ex. VAT — this is what the company actually pays.
- **Medarbejderens nettopris (employee net cost)**: the actual out-of-pocket
  income tax the employee pays monthly for the "fri bil" (company car) benefit.

### 3. Implement employee taxation (beskatningsgrundlag)

For used cars (older than 36 months), the Danish tax base is calculated on
the current market value, not the original new price.

**Calculation logic:**

```
tax_base (beskatningsgrundlag) = base_value + 25% moms + full_registration_tax
  (note: statutory minimum tax base is 160,000 DKK)

annual_taxable_benefit =
  25% × min(tax_base, 300,000)
  + 20% × max(tax_base - 300,000, 0)

miljøtillæg (environmental surcharge) =
  annual_grøn_ejerafgift × 2.5 (statutory environmental factor 250%)

total_annual_taxable_benefit = annual_taxable_benefit + miljøtillæg

monthly_taxable_benefit = total_annual_taxable_benefit / 12

employee_net_cost = monthly_taxable_benefit × marginal_tax_rate
```

Add `marginal_tax_rate` (default 0.50) to `tco_config` and comparison settings
so the user can adjust their personal tax bracket.

## SQL Migration

```sql
INSERT INTO tco_config (key, value) VALUES
  ('marginal_tax_rate', '0.50'),
  ('miljoe_factor', '2.5'),
  ('beskatning_bracket_1_pct', '25'),
  ('beskatning_bracket_1_max', '300000'),
  ('beskatning_bracket_2_pct', '20'),
  ('beskatning_min_base_dkk', '160000')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE tco_scenarios
  ADD COLUMN IF NOT EXISTS beskatningsgrundlag_dkk numeric,
  ADD COLUMN IF NOT EXISTS annual_taxable_benefit_dkk numeric,
  ADD COLUMN IF NOT EXISTS miljoe_tillaeg_dkk numeric,
  ADD COLUMN IF NOT EXISTS monthly_taxable_benefit_dkk numeric,
  ADD COLUMN IF NOT EXISTS employee_net_cost_monthly_dkk numeric,
  ADD COLUMN IF NOT EXISTS company_cost_monthly_ex_moms_dkk numeric;
```

## Files to Modify

- `lib/tco/calculate.ts` — remove company purchase path, add beskatningsgrundlag
  calculation, split flexlease into company cost + employee cost
- `lib/comparison/calculate.ts` — mirror changes client-side
- `lib/comparison/types.ts` — add CompanyFlexleaseBreakdown type
- `lib/types.ts` — update TCOScenario with new columns
- `components/comparison/car-column.tsx` — add erhvervsleasing section with
  two sub-outputs (company cost + employee net cost)
- `components/comparison/settings-panel.tsx` — add marginal tax rate input
- `lib/i18n/dictionary.ts` — add tooltip terms for beskatningsgrundlag,
  miljøtillæg, fri bil, marginal skattesats

## Files NOT to Touch

- Any scraper files
- `app/page.tsx`
- `app/compare/page.tsx`

## Implementation Notes

### Tooltip terms to add (DA + EN)

- **Beskatningsgrundlag**: Bilens skattemæssige værdi beregnet som markedsværdi
  + moms + fuld registreringsafgift. For brugte biler over 36 måneder bruges
  aktuel markedsværdi, ikke nypris.
- **Fri bil (Company car benefit)**: Den skattepligtige fordel en medarbejder
  beskattes af ved at have en firmabil til rådighed.
- **Miljøtillæg**: Grøn ejerafgift ganget med den lovbestemte miljøfaktor
  (aktuelt 250%). Tillægges den årlige skattepligtige fordel.
- **Marginal skattesats**: Din personlige topskat-procent. Bruges til at
  beregne den faktiske nettoomkostning af firmabilbeskatning.

### Green owner's tax (grøn ejerafgift)

This value varies per car based on fuel efficiency/CO2. For MVP, add a default
config value and allow user override in settings. Long-term: look up from
SKAT's tables based on CO2 g/km.

```sql
INSERT INTO tco_config (key, value) VALUES
  ('groen_ejerafgift_default_dkk', '5000')
ON CONFLICT (key) DO NOTHING;
```

### UI layout for erhvervsleasing section

```
ERHVERVSLEASING
├── Virksomhedens omkostning
│   └── Månedlig ydelse ex. moms:     X.XXX kr/md
├── Medarbejderens nettopris
│   ├── Beskatningsgrundlag ⓘ:        X.XXX kr
│   ├── Årlig skattepligtig fordel:   X.XXX kr
│   ├── Miljøtillæg ⓘ:               X.XXX kr
│   ├── Månedlig beskatning:          X.XXX kr
│   └── Nettopris (50% skat):         X.XXX kr/md
└── Samlet månedlig udgift
    └── For medarbejderen:            X.XXX kr/md
```

## Done When

1. [ ] Company purchase scenarios no longer computed or displayed
2. [ ] Erhvervsleasing shows two separate outputs: company cost + employee cost
3. [ ] Beskatningsgrundlag correctly uses base + moms + full reg tax
4. [ ] Minimum beskatningsgrundlag of 160,000 DKK enforced
5. [ ] Environmental surcharge uses grøn ejerafgift × 2.5
6. [ ] Marginal tax rate adjustable in settings (default 50%)
7. [ ] Employee net cost = monthly taxable benefit × marginal rate
8. [ ] All new terms have DA + EN tooltips

## Docs to Update
- `docs/02-CURRENT-STATE.md` — SPEC-021 done
- `docs/07-TCO-LOGIC.md` — corporate model documented

## Dependencies
- SPEC-020 (unified TCO engine) — done ✓
- SPEC-013 Phase 2 (comparison view) — done ✓

## Out of Scope
- Exact grøn ejerafgift lookup per car (use default + user override for MVP)
- Cars newer than 36 months (different beskatningsgrundlag rules — future)
- Leasing via holding company (anpartsselskab) — different tax treatment

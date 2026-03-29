import type { Translations } from './types'

export const dictionary: Translations = {
  // === Tooltip terms ===
  'tooltip.restvaerdi': {
    da: 'Den forudbestemte værdi af bilen ved leasingaftalens udløb, eksklusive afgift og moms. Hvis markedsværdien er lavere, hæfter du for forskellen.',
    en: 'The predetermined value of the car at the end of the leasing contract, excluding tax and VAT. If the real market value is lower, you are liable for the difference.'
  },
  'tooltip.foerstegangsydelse': {
    da: 'Det indledende beløb der betales ved kontraktens indgåelse. Dækker typisk oprettelse, første måneds ydelse og forudbetalt nedskrivning.',
    en: 'The initial amount paid when signing the contract. Typically covers the establishment fee, first month\'s payment, and prepaid depreciation.'
  },
  'tooltip.nedskrivning': {
    da: 'Bilens reelle værditab over perioden, beregnet ud fra totalprisen.',
    en: 'The actual loss of value the car experiences over the period, calculated from the total price.'
  },
  'tooltip.forholdsmassig_afgift': {
    da: 'Systemet hvor bilens registreringsafgift betales i månedlige rater i stedet for på én gang.',
    en: 'The Danish tax system where the vehicle\'s registration tax is paid in monthly installments instead of upfront.'
  },
  'tooltip.anvisningspligt': {
    da: 'En klausul der forpligter dig til at finde en CVR-registreret forhandler, der vil købe bilen til restværdien, når aftalen udløber.',
    en: 'A clause obligating you to find a registered car dealer to buy the car for the agreed residual value when the contract expires.'
  },
  'tooltip.fuld_registreringsafgift': {
    da: 'Den samlede afgift staten ville opkræve, hvis bilen blev importeret og købt på almindelige danske plader.',
    en: 'The total tax the state would charge if the car was imported and bought outright on standard Danish license plates.'
  },
  'tooltip.dk_exlease': {
    da: 'Tidligere dansk leasingbil der sælges uden afgift og moms. Privatkøbere skal tillægge 25% dansk moms på bilens grundpris før afgiften betales.',
    en: 'Former Danish lease car sold without tax and VAT. Private buyers must add 25% Danish VAT to the base price before paying registration tax.'
  },
  'tooltip.de_import': {
    da: 'Brugt bil importeret fra EU. Købes bilen af en forhandler under brugtmomsordningen, skal der ikke betales dansk moms af bilens pris, kun registreringsafgift.',
    en: 'Used car imported from the EU. If bought from a dealer under the margin scheme, no Danish VAT is added to the car\'s price, only registration tax.'
  },
  'tooltip.de_import_exlease': {
    da: 'Tysk ex-leasingbil (MwSt. ausweisbar) købt uden tysk moms. 25% dansk moms skal tillægges grundprisen, og registreringsafgift beregnes af den momsinkl. værdi.',
    en: 'German ex-lease car (MwSt. ausweisbar) bought without German VAT. 25% Danish VAT must be added to the base price, and registration tax is calculated on the VAT-inclusive value.'
  },
  'tooltip.ev_fradrag': {
    da: 'Elbiler har et særligt bundfradrag i registreringsafgiften og betaler kun en procentdel af den fulde afgift.',
    en: 'EVs have a specific base deduction in the registration tax and only pay a percentage of the full tax.'
  },
  'tooltip.totalpris_paa_plader': {
    da: 'Bilens samlede pris inklusiv moms, afgift og klargøring, klar til at køre på danske veje.',
    en: 'The car\'s total price including VAT, tax, and preparation, ready to drive on Danish roads.'
  },
  'tooltip.afgiftspligtig_vaerdi': {
    da: 'Bilens markedsværdi inklusiv 25% moms. Dette er beløbet som Motorstyrelsen beregner registreringsafgiften ud fra.',
    en: 'The car\'s market value including 25% VAT. This is the amount used by Motorstyrelsen to calculate registration tax.'
  },

  // === UI labels ===
  'label.settings': { da: 'Indstillinger', en: 'Settings' },
  'label.calculation_settings': { da: 'Beregningsindstillinger', en: 'Calculation settings' },
  'label.appearance': { da: 'Udseende', en: 'Appearance' },
  'label.language': { da: 'Sprog', en: 'Language' },
  'label.danish': { da: 'Dansk', en: 'Danish' },
  'label.english': { da: 'Engelsk', en: 'English' },
  'label.theme_system': { da: 'System', en: 'System' },
  'label.theme_light': { da: 'Lys', en: 'Light' },
  'label.theme_dark': { da: 'Mørk', en: 'Dark' },
  'label.down_payment': { da: 'Udbetaling (DKK)', en: 'Down payment (DKK)' },
  'label.loan_rate': { da: 'Lånerente (%)', en: 'Loan rate (%)' },
  'label.save': { da: 'Gem', en: 'Save' },
  'label.saved': { da: '✓ Gemt', en: '✓ Saved' },
  'label.save_recompute': { da: 'Gem & genberegn alle biler', en: 'Save & recompute all cars' },
  'label.recomputing': { da: 'Beregner alle...', en: 'Recomputing all...' },
  'label.cars_count': { da: 'biler', en: 'cars' },
  'label.grid_view': { da: 'Kortoversigt', en: 'Grid view' },
  'label.table_view': { da: 'Tabeloversigt', en: 'Table view' },
  'label.recompute_note': {
    da: 'Genberegning opdaterer TCO for alle biler med de nye indstillinger.',
    en: 'Recomputation updates TCO for all cars with the new settings.'
  },
}

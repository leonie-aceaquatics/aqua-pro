// Pool chemistry reference and troubleshooting — Tony's on-site training notes, tidied and checked
// against the Victorian "Water quality guidelines for public aquatic facilities" (Dept of Health).
// Shown as a tab in admin, in the technician Help screen, and as tips under the dose calculator.
// Keep it plain: technicians read this on a phone in a plant room.

export type GuideSection = { title: string; colour?: string; steps: (string | { text: string; sub: string[] })[] }

export const POOL_GUIDE: GuideSection[] = [
  {
    title: 'Chlorine — the numbers', colour: '#00b4d8',
    steps: [
      { text: 'Free chlorine: 1–10 ppm (mg/L) in every pool. Minimums go up with temperature:', sub: [
        'Ordinary pool (≤ 26 °C): at least 1 ppm.',
        'Heated / hydrotherapy pool (> 26 °C): at least 2 ppm.',
        'Hot spa: at least 3 ppm.',
        'If the pool uses cyanuric acid (outdoor, stabilised) add 1 ppm to each minimum. Never above 10 ppm while people are in the water.',
      ] },
      'Total chlorine should equal free chlorine or sit just above it — never more than 1 ppm above.',
      'Combined chlorine = total − free. The app works it out for you. It is the "used" chlorine (chloramines) — the smell, the stinging eyes. Guideline maximum 1 ppm; we aim for 0.5 or less.',
      'Free chlorine attaches to sweat, dirt and debris in the pool and becomes combined chlorine. That is why dirty water eats chlorine.',
    ],
  },
  {
    title: 'pH', colour: '#0077b6',
    steps: [
      'Range 7.2 – 7.8 — anything in there is in range and the app will not flag it. Aim for 7.4 – 7.6. Above 7.8 the water is turning alkaline (basic) and chlorine works poorly; below 7.2 it is acidic and corrosive.',
      'pH out of range also throws the LSI out.',
      { text: 'pH is held down by a controller reading a pH probe. Three systems on our sites:', sub: [
        'CO₂ (carbon dioxide gas) — the preferred one. Lowers pH without dropping alkalinity.',
        'Sodium bisulphate (dry acid) tank — dosed by a pump.',
        'Liquid acid (hydrochloric) — dosed by a pump, e.g. Peppers.',
      ] },
      { text: 'pH too HIGH:', sub: [
        'Check the controller: is the set point right? Does the probe need calibrating against your manual test?',
        'To bring it down by hand: sodium bisulphate or acid. Small doses, re-test after circulation.',
      ] },
      { text: 'pH too LOW:', sub: [
        'Calibrate the probe first — a probe reading high makes the controller over-dose acid.',
        'Nothing on site raises pH automatically — it is always added by hand.',
        'Sodium bicarbonate (bicarb) raises alkalinity and lifts pH a little. Use it when alkalinity is low too.',
        'Soda ash (sodium carbonate) raises pH quickly with less effect on alkalinity. Use it when alkalinity is already fine. Go carefully — it can overshoot.',
      ] },
    ],
  },
  {
    title: 'Total alkalinity', colour: '#00b894',
    steps: [
      'Guideline 60 – 200 ppm. We aim for 80 – 120.',
      'Alkalinity is the buffer: it stops pH swinging around and keeps every other chemical balanced. Low alkalinity = corrosive water that eats plaster, grout, heaters and pumps.',
      'Raise it with sodium bicarbonate. Lower it with acid (dose to the deep end with the pump off, let it sit, then circulate).',
      'The app alarms you the moment you type 80 or below — add bicarb straight away and re-test.',
    ],
  },
  {
    title: 'Calcium hardness', colour: '#00b894',
    steps: [
      'Aim for 100 – 300 ppm (plaster and tiled pools sit at the higher end).',
      'Calcium protects the assets: water that is short of calcium pulls it out of plaster, grout and metal instead.',
      'Raise it with calcium chloride — pre-dissolve in a bucket, add with the pump running. Too high can only be fixed by partial drain and refill.',
      'The app alarms you below 90 — add calcium chloride straight away.',
    ],
  },
  {
    title: 'LSI — Langelier Saturation Index', colour: '#fdcb6e',
    steps: [
      'Tells you whether the water is balanced, corrosive or scale-forming. Worked out from pH, temperature, alkalinity and calcium hardness.',
      'Checked at least weekly on every pool. The app calculates it on every test — no formula needed on site.',
      { text: 'Reading it:', sub: [
        '−0.3 to +0.3 — balanced. Leave it.',
        'Above +0.3 — scale-forming. Calcium deposits build up on surfaces, heaters and inside pipes and clog systems.',
        'Below −0.3 — corrosive. Water attacks plaster, grout, metal fittings and heat exchangers.',
      ] },
      'You balance it by hand, mostly through alkalinity and calcium hardness (and pH). Nothing on site doses these automatically.',
    ],
  },
  {
    title: 'Troubleshooting — chlorine', colour: '#e17055',
    steps: [
      { text: 'Free chlorine is out (too low or too high):', sub: [
        'Check the dosing: pump running, tubes and injectors clear, no air lock, controller in auto.',
        'Check the product: tank or drum level, is it old (liquid chlorine loses strength in heat and sunlight), right product connected.',
        'Check the probe: compare the controller screen to your manual test and calibrate if they disagree.',
      ] },
      'Total chlorine reading odd on its own: that is nearly always the probe — calibrate or clean it.',
      { text: 'Combined chlorine high (total more than 1 ppm above free):', sub: [
        'The water is carrying too much dirt and sweat for the chlorine. Backwash and clean the filters — the filters are what actually clean the water.',
        'Sand / glass filters: backwash, rinse, back to filtration. Record the minutes in the Plant Room Log.',
        'Cartridge filter sites: drain, pull and hose the cartridges, refill through the make-up system.',
        'If it stays high: superchlorinate (breakpoint) after hours and let it come back down, and check turnover and fresh-water dilution.',
      ] },
      'Larger pools are harder to over-dose — small spas and plunge pools swing fast, so dose them gently.',
    ],
  },
  {
    title: 'Bringing chlorine DOWN — sodium thiosulphate', colour: '#d63031',
    steps: [
      'Sodium thiosulphate neutralises chlorine. Use it only when chlorine is over 10 ppm and the pool must open.',
      'It also upsets the chlorine probe and will make the controller think chlorine is low and dose more.',
      { text: 'Before adding it, isolate the probe:', sub: [
        'Close the valve on each side of the probe block.',
        'Turn the dosing system off.',
        'Dose, circulate, re-test. Only reopen the probe block and turn dosing back on once chlorine is back in range.',
      ] },
    ],
  },
  {
    title: 'The chemicals — what does what', colour: '#6c5ce7',
    steps: [
      'Liquid chlorine = sodium hypochlorite, about 12.5%. Loses strength with age and heat.',
      'Granular chlorine = calcium hypochlorite, about 65–70%. Far more concentrated per kg — also adds calcium.',
      'Sodium bisulphate (dry acid) — lowers pH and alkalinity.',
      'Hydrochloric acid (liquid) — lowers pH and alkalinity, faster and stronger.',
      'CO₂ — lowers pH only.',
      'Sodium bicarbonate (bicarb) — raises alkalinity, nudges pH up.',
      'Soda ash (sodium carbonate) — raises pH, small effect on alkalinity.',
      'Calcium chloride — raises calcium hardness.',
      'Sodium thiosulphate — removes chlorine.',
    ],
  },
]

// Short tips shown under a dose recommendation in the calculator, keyed by the parameter name
// calculateDoses() uses. "Fix the cause, not just the number."
export const CALCULATOR_TIPS: Record<string, string[]> = {
  'Free Chlorine': [
    'Before dosing: is the pump running, are tubes and injectors clear, is the controller in auto?',
    'Check the drum — level, age, right product.',
    'Compare the controller screen to your test; calibrate the probe if they disagree.',
  ],
  'Combined Chlorine': [
    'Backwash and clean the filters first — dirty water is the usual cause.',
    'Cartridge filter sites: pull and hose the cartridges.',
    'Still high after cleaning: superchlorinate after hours.',
  ],
  'pH': [
    'Too high: check the controller set point and calibrate the probe before dosing acid / bisulphate by hand.',
    'Too low: calibrate the probe. Raise with bicarb (if alkalinity is low too) or soda ash (if alkalinity is fine).',
  ],
  'Total Alkalinity': [
    'Low alkalinity makes pH swing and the water corrosive — fix this before chasing pH.',
    'Bicarb: broadcast with the pump running, re-test after a full turnover.',
  ],
  'Calcium Hardness': [
    'Pre-dissolve calcium chloride in a bucket; add with the pump running. It changes slowly — re-test next visit.',
  ],
  'Salt Level': [
    'Check the cell is clean and the chlorinator output setting before adding salt.',
  ],
  'Cyanuric Acid': [
    'CYA only comes down by dilution — partial drain and refill.',
  ],
}

export const LSI_TIPS: Record<'corrosive' | 'scaling' | 'balanced', string> = {
  corrosive: 'Corrosive water eats plaster, grout and heaters. Raise alkalinity and/or calcium hardness (and check pH is not low). Re-test after a turnover.',
  scaling: 'Scale-forming water clogs heaters and pipes. Bring pH down first (cheapest lever), then alkalinity if still high. Do not add calcium.',
  balanced: 'Balanced — nothing to do for LSI.',
}

// ── For a manually dosed site ────────────────────────────────────────────────
// Written for an operator at a small body of water with no controller, no UV, no backwash and
// no salt cell. Everything about probes, set points, sand filters, cyanuric acid and salt is
// left out, because none of it exists at a site like this and a guide full of equipment you
// cannot see is worse than no guide at all.
//
// Content from ACE-2026-SEN-TP-001 modules 4 to 9. The numbers deliberately stay out of it —
// the app holds each site's own targets, and a printed figure here would go stale.

export const MANUAL_POOL_GUIDE: GuideSection[] = [
  {
    title: 'Taking the sample', colour: '#00b4d8',
    steps: [
      'A test is only as good as the sample. Most bad readings are bad samples, not bad water.',
      'Make sure the circulation pump has been running. A sample from still water tells you about one spot, not the whole bath.',
      'Take it at elbow depth, away from the return inlet. Never off the surface, and never right where the water comes back in — there you are reading the chemical you just added.',
      'Rinse the container in the bath water two or three times, then fill it by plunging your arm in and inverting it at depth.',
      'Test straight away. Free chlorine starts falling the moment the sample leaves the bath, so a sample left on the bench reads low and you over-dose.',
      'Run the calibration check disc once a day, before the pre-open round, and record it. If it fails, do not use the meter and do not open on its readings — ring Ace on 0422 470 214.',
      'One disc per test, per bath. Handle it by the edges, never touch the reagent chambers, and never reuse one.',
    ],
  },
  {
    title: 'Free, combined and total chlorine', colour: '#0077b6',
    steps: [
      'Free chlorine is the chlorine still available to disinfect. Combined chlorine has already reacted with sweat, skin and dirt and is used up. Total is the two added together.',
      'Total − Free = Combined. The app works it out, but record all three.',
      'A strong chlorine smell does not mean too much chlorine. It usually means too much combined chlorine and not enough free.',
      'Chlorine works slower in cold water, not faster. The number on the meter is doing less work than the same number would in a warm pool.',
      'There is no controller here. You are the controller — if you do not test and dose, nothing does.',
    ],
  },
  {
    title: 'Why pH matters more than people think', colour: '#0077b6',
    steps: [
      'At pH 7.5 about half your free chlorine is in the active form. At pH 8.0 only about a quarter is. A bath reading 4.0 at pH 8.0 is doing roughly half the disinfecting of the same number at pH 7.5.',
      'The vessels are 316 stainless. Chlorine plus low pH is what pits stainless, so holding pH in band protects the baths as well as the bathers.',
      'Low pH takes soda ash. Low alkalinity takes bicarbonate. They look the same and sit next to each other — read the label, not the habit.',
      'Alkalinity is the buffer that stops pH bouncing around. Melbourne tap water carries almost none, which is why every refill needs bicarbonate before the bath is fit to open.',
    ],
  },
  {
    title: 'The three dosing rules', colour: '#e17055',
    steps: [
      'Test, dose, circulate 15 minutes, retest. Never dose twice without a test in between. Almost every serious overdose happens because somebody dosed again before the first dose had circulated.',
      'Measure, never estimate. Some doses here are three millilitres. Use the labelled cylinder or scoop for that chemical only, and never pour from the drum into the bath.',
      'Never dose with a bather in the bath. Clear it first, every time, no exceptions.',
      'Acid is dosed in fixed steps and capped at two. If two doses have not fixed it, stop and ring Ace on 0422 470 214. Do not keep going.',
      'Most of the time, high chlorine needs nothing. It will fall, and the bath is drained at close anyway. Thiosulphate does not stop at your target, so an overshoot leaves the bath at zero.',
    ],
  },
  {
    title: 'Chemical safety', colour: '#d63031',
    steps: [
      'Never let hypochlorite and acid come into contact. Mixing them releases chlorine gas, which can kill. Separate bunds, separate measuring equipment, never carried together, and never dosed one straight after the other — dose one, circulate, test, then the other.',
      'That includes the dry acid. It is granular and looks harmless next to the other white powders, but it is still an acid and it is stored with the acids.',
      'PPE every single time: splash goggles (not safety glasses), chemical resistant gloves, apron, and a face shield when decanting. If the PPE is not at the dosing station, you do not dose.',
      'Always add chemical to water, never water to chemical. Dose into moving water at the return.',
      'In the eyes: flush with running water for at least 20 minutes, then medical attention — take the safety data sheet with you.',
      'Swallowed or splashed: Poisons Information Centre 13 11 26. Gas released: everyone out, close the door, do not go back in to ventilate it, call 000.',
    ],
  },
  {
    title: 'When a reading is out of range', colour: '#e17055',
    steps: [
      'The app shows you the rule in red when one trips, and tells you what to add. Follow it, then record every retest until the water is back in range.',
      'Any staff member on duty can close a body of water and needs nobody’s permission. You will never be questioned for closing one. You will be questioned for leaving one open on a red reading.',
      'To close: ask anyone in it to get out, put the sign on, tell the duty manager, record the time, the bath, the reading that caused it and your name.',
      'Two readings back in target, fifteen minutes apart, before it can reopen — and the responsible person decides when it does, on the evidence in the record.',
      'If the pump is not running on a bath, that bath cannot open, and you get circulation back before you dose anything.',
    ],
  },
  {
    title: 'Something in the water', colour: '#d63031',
    steps: [
      'Vomit, faeces or blood in a bath: close it immediately, get everyone out, sign on, tell the duty manager. Full PPE before you go near the water.',
      'Scoop out what you can with something disposable, dispose to sewer. Do not use a vacuum.',
      'Because the baths are small you do not hyperchlorinate and wait. Empty it completely, scrub and rinse all surfaces, spray with one part chlorine to ten parts water, leave it ten minutes, rinse thoroughly.',
      'Refill, raise free chlorine to at least 3.0 and hold it there for 25 to 30 minutes with pH no higher than 7.5. Clean or replace the cartridge filter.',
      'Blood with the chlorine in range needs no special treatment — check the reading and record it.',
      'On a surface rather than in the water: restrict the area, PPE, wipe up with disposable material, same 1:10 solution for ten minutes, rinse.',
      'If it is a big event, or anyone reports getting sick, tell your responsible person and ring Ace on 0422 470 214 before you drain. Once the water is gone, the option to sample it is gone.',
    ],
  },
  {
    title: 'The record is the point', colour: '#6c5ce7',
    steps: [
      'Write it down as you do it, not at the end of the shift. A record filled in from memory is nearly worthless.',
      'Three separate bodies of water need three separate entries. One entry for the facility is a failed record.',
      'Every dose needs a retest beneath it. A dose with no retest is the most common reason a record fails an inspection.',
      'If you missed a round, say that you missed it and why. An honest gap is a manageable finding. An invented reading is not, and tampering with a sample is an offence.',
      'Records are kept at the premises for twelve months. Keep filling in the printed sheets as well — the app supports that obligation, it does not discharge it.',
    ],
  },
]

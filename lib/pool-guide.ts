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
      'Range 7.2 – 7.8. Aim for 7.4 – 7.6. Above 7.8 the water is turning alkaline (basic) and chlorine works poorly; below 7.2 it is acidic and corrosive.',
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
        'Cartridge filters (Meridian, Collingwood, NTC): drain, pull and hose the cartridges, refill through the make-up system.',
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
    'Cartridge sites (Meridian, Collingwood, NTC): pull and hose the cartridges.',
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

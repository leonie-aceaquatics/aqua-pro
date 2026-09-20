'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Plain-English "how do I…" guide. Content lives here so the technician Help screen and
// the admin Help tab show the same thing. Keep steps matched to what's actually on screen.

type Section = { title: string; colour?: string; steps: (string | { text: string; sub: string[] })[] }

export const TECH_GUIDE: Section[] = [
  {
    title: 'Getting started', colour: '#00b4d8',
    steps: [
      'Open the AquaPro link on your phone and log in with the email and password you were given.',
      'Add it to your home screen so it opens like an app: Safari → Share → "Add to Home Screen".',
      "You'll land on Today's Jobs. Every site you're rostered at today is listed, with its address and start time.",
      'Not rostered, or at a different site? Scroll down to "Visit any site" and pick it from the list — everything works the same, and tapping Start shift there clocks your hours too.',
      'Tap a site to open it. Everything you do at that site happens from the panel that slides up.',
      'Tap "Start shift" the moment you arrive and "Finish shift" as you leave. That is how your hours are recorded — the rostered time is only a guide, traffic happens.',
      'Change your password the first time you log in: tap ? at the top, scroll to the bottom and use Change my password.',
    ],
  },
  {
    title: 'At each site — the order to do things', colour: '#00b894',
    steps: [
      { text: '0. Start shift — tap it as you arrive (rostered jobs only).', sub: [] },
      { text: '1. Site Tasks — work through the tick list.', sub: [
        'It runs in the order of a visit: Arrival → Water quality → Equipment → Chemical dosing → Cleaning → Filtration → Safety → Compliance → Departure.',
        'Tick each one as you do it. The counter at the top shows how many are left, and the box goes green when everything is done.',
        'Your name goes against every tick, so only tick what you actually did.',
        'Some tasks need photos (e.g. "Take 3 BEFORE photos of the gym"). Tick the task, then tap the camera bar under it to add them. It stays orange until all the photos are in.',
      ] },
      { text: '2. Log Water Test — enter your readings.', sub: [] },
      { text: '3. Count Stock — count what chemicals are on the shelf.', sub: [] },
      { text: '4. Plant Room Log — if the site has a plant room (see below).', sub: [] },
      { text: '5. Finish shift — as you leave the site. Your hours are the time between Start and Finish.', sub: [] },
    ],
  },
  {
    title: 'Log Water Test', colour: '#0077b6',
    steps: [
      'Tap Log Water Test on the site panel.',
      'Type in what your test kit / SpinTouch gives you. Only fill in what you tested — leave the rest blank.',
      { text: 'Two things fill in by themselves — do not type them:', sub: [
        'Combined Chlorine = Total Chlorine − Free Chlorine. Enter Free and Total and it appears.',
        'LSI (water balance) appears once you have pH, Total Alkalinity, Calcium Hardness AND Temperature. Green = balanced. Orange = corrosive or scale-forming.',
      ] },
      { text: 'Red alarm boxes: Total Alkalinity 80 or below → add sodium bicarbonate now. Calcium Hardness below 90 → add calcium chloride now.', sub: [
        'They pop up the moment you type the number, with roughly how many kg for that pool. Dose, then re-test before you leave and log the second test too.',
      ] },
      { text: 'System Screen Values — type what the dosing system / controller screen (Chemtrol, Dulcomarin, etc.) shows for pH and Free Cl.', sub: [
        'The app shows the difference against your test. If it says "calibrate", calibrate the system and tick Calibrated.',
      ] },
      'UV System — at sites with a UV unit, type the % output and lamp run hours off the UV controller. Leave blank elsewhere.',
      { text: 'Chemicals Added — only if you dosed by hand.', sub: [
        'Tap Add chemical, pick the product, enter how much (litres / kg). It comes off that site\'s stock automatically.',
      ] },
      'Faults or Breakdowns — anything broken, leaking, alarming or not working. It goes straight to the office as an incident.',
      'Add any other notes (e.g. "cloudy after storm") in the Notes box.',
      'Tap Submit Water Test. The result is checked against the ranges for that pool straight away and emailed to the office.',
      'Then you can add photos of the job (readings, damage, graffiti, the fault) before tapping Done.',
      { text: 'What the colour means after you save:', sub: [
        'Green — all good.',
        'Yellow — keep an eye on it.',
        'Orange — action required: adjust chemicals and re-test.',
        'Red — CLOSE THE POOL and phone Tony immediately (0422 470 214).',
      ] },
      'If you make a mistake, log a new test with the right numbers and put "correction" in the notes — the office can see both.',
    ],
  },
  {
    title: 'Dose Calculator', colour: '#b8860b',
    steps: [
      'Tap Dose Calculator on the site panel (the pool is already picked), or the calculator icon at the top of the app to choose any pool.',
      'Type in the readings you have. Combined Chlorine and LSI fill in by themselves, same as the water test.',
      'Tap Calculate. It shows the risk level and exactly what to add — which chemical and how many litres or kg — worked out from that pool\'s volume, and whether the site corrects pH with acid or CO₂.',
      'Nothing is saved. It is for working out a dose before you add it. Once you have dosed and re-tested, log the real result in Log Water Test.',
      'If it says the pool has no volume set, the office needs to add the litres under Pools before it can work out doses for that site.',
    ],
  },
  {
    title: 'Count Stock', colour: '#6c5ce7',
    steps: [
      'Tap Count Stock on the site panel.',
      'It lists every chemical with what was last counted at this site and who counted it.',
      'Walk to the store and type how many of each are actually there — in drums, bags or "each" as shown next to the box. Count containers, not litres.',
      'Leave a box blank for anything this site does not keep. Put 0 if it should be there but has run out.',
      'Anything at or below the reorder level turns orange and goes on the office order list automatically — you do not need to ring it through.',
      'Tap Save Stock Count. Do this every visit; it is one of your Site Tasks.',
    ],
  },
  {
    title: 'Plant Room Log', colour: '#0d6e4e',
    steps: [
      'For sites with a plant room. Tap Plant Room Log on the site panel.',
      'Work down the sections: Pool Condition, Maintenance Tasks (backwash, lint baskets, sample line filter, auto-vac, dosing), Controller & Alarms, Pumps, Heat Pump & Filters, Dosing Pumps.',
      'Water readings go in Log Water Test, not here. If the controller screen is more than about 0.2 pH or 0.5 ppm chlorine away from your test, tick "Photometric Calibration Required".',
      'Tap Submit Plant Log at the bottom when done, then add photos of gauges, the controller screen or any leaks on the next screen.',
    ],
  },
  {
    title: 'Start and Finish shift', colour: '#00b894',
    steps: [
      'Tap Start shift as soon as you arrive. The office sees you are on site and the clock starts.',
      'Once your Site Tasks are ticked, the water test is saved and stock is counted, tap Finish shift on the site panel.',
      'The site turns grey with a tick on Today\'s Jobs. Move on to the next one.',
      'If you cannot finish (locked out, fault, ran out of time), do not mark it complete — add a note in the water test or report an issue so the office knows.',
    ],
  },
  {
    title: 'Who to call', colour: '#00b4d8',
    steps: [
      'Anything about a pool or site — out-of-range results, faults, closures, chemicals: Tony 0422 470 214.',
      'Anything admin — logins, rosters, the app itself: Leonie 0433 414 987.',
    ],
  },
  {
    title: 'Something out of range or broken', colour: '#e17055',
    steps: [
      'Red water result → close the pool, phone Tony (0422 470 214), then log what you did.',
      'Orange result → dose to bring it into range, re-test before you leave, log both tests.',
      'Equipment fault, leak, safety issue → put it in the Faults or Breakdowns box on the water test, add photos, and tell Tony (0422 470 214).',
      'Out of chemicals → put 0 in Count Stock so it goes on the order list, and ring Tony (0422 470 214) if it is urgent.',
    ],
  },
  {
    title: 'The app itself is not working', colour: '#fdcb6e',
    steps: [
      'Tap the bug icon (top right) → Report an Issue. Say what you tapped and what happened. A screenshot helps.',
      'No signal at the site? Write your readings down, and enter them in the app as soon as you have reception — use the Date / Time box to put the real test time in.',
      "Can't log in? Ring Leonie (0433 414 987) to reset your password. Once you're in, change it yourself under Change my password at the bottom of this screen.",
      'A shift missing from Today\'s Jobs? Use "Visit any site" at the bottom of the screen to open it anyway, and let Leonie know (0433 414 987) so the roster gets fixed.',
    ],
  },
]

export const ADMIN_GUIDE: Section[] = [
  {
    title: 'Daily', colour: '#00b4d8',
    steps: [
      'Overview — today\'s risk levels per pool and anything red/orange.',
      'Site Tasks → Tasks Done — pick a date to see exactly what each technician ticked off at each site, and who skipped what.',
      'Water Testing — every result. Click one for the full readings, LSI and AI advice. Every result is also emailed to info@aceaquatics.com.au. A wrong entry can be removed with Delete test at the bottom of that view (admins only, and it cannot be undone).',
      'Chemicals → Site Stock — which sites are low (orange strip at the top). Items at/below reorder are already on the To Order list against that site.',
    ],
  },
  {
    title: 'Setting things up', colour: '#00b894',
    steps: [
      'Staff — add technicians (they get a welcome email with their login). Set their role: technician for field staff. After you save, a green bar confirms the email went; a red bar means it did not and says why.',
      'Shifts — schedule who goes where. Only the start time is needed; the expected end is optional. Technicians tap Start/Finish on site and the Actual column and the hours line show what was really worked. Click a shift to edit it — fix a forgotten Start/Finish there, or Delete shift if it was entered wrongly.',
      'Pools — pool type, sanitiser and volume drive the target ranges and dosing calculator, so keep them accurate. Without a volume the Dose Calculator cannot work out doses for that site.',
      'Chemistry Calculator — the same dose calculator technicians have, for any pool, without logging a test.',
      'Site Tasks — the tick list technicians see on every visit. "All sites" tasks show everywhere; pick a pool to add tasks just for it. Set "N photos" on a task to make the tech attach photos to it; Tasks Done shows the photos. (There is no lifeguard shift checklist — none of our sites are lifeguarded.)',
      'A site with no water (e.g. AAMI Park – Gym) is type "facility": it gets only its own tasks and no water-test or plant-room screens.',
      'Chemicals → Depot Inventory — the chemical list, units and reorder points. The reorder point applies at every site.',
    ],
  },
  {
    title: 'Sharing this guide', colour: '#fdcb6e',
    steps: [
      'Admins and managers are asked "Where to?" at login — Office dashboard or Technician app — and can switch any time: "Technician app" in the dashboard sidebar, or the dashboard icon in the technician app header. In the technician app you can open any site via "Visit any site", rostered or not.',
      'Adding staff sends them a welcome email with their login. To re-send login details, edit the person, type a new password and tick "Email login details". If the red bar says "Username and Password not accepted", the Gmail App Password in Vercel (EMAIL_PASS) needs replacing.',
      'Technicians see the "How to use AquaPro" guide from the ? button at the top of their app — the same text as the technician section on this page.',
      'To change the wording, ask for it to be updated in components/HelpGuide.tsx.',
    ],
  },
]

export default function HelpGuide({ sections, dark = false }: { sections: Section[]; dark?: boolean }) {
  const [open, setOpen] = useState<number | null>(0)
  const text = dark ? '#e2e8f0' : 'var(--text)'
  const muted = dark ? '#94a3b8' : 'var(--text-muted)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sections.map((sec, i) => {
        const isOpen = open === i
        return (
          <div key={sec.title} style={{ background: 'var(--surface)', border: `1px solid ${isOpen ? (sec.colour ?? 'var(--aqua)') + '60' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden' }}>
            <button type="button" onClick={() => setOpen(isOpen ? null : i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: sec.colour ?? text }}>{sec.title}</span>
              <ChevronDown size={18} color={muted} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
            </button>
            {isOpen && (
              <ol style={{ margin: 0, padding: '0 16px 16px 34px', color: text, fontSize: '14px', lineHeight: 1.55 }}>
                {sec.steps.map((st, j) => typeof st === 'string' ? (
                  <li key={j} style={{ marginBottom: '8px' }}>{st}</li>
                ) : (
                  <li key={j} style={{ marginBottom: '8px' }}>
                    {st.text}
                    {st.sub.length > 0 && (
                      <ul style={{ margin: '6px 0 0', paddingLeft: '18px', color: muted, fontSize: '13px' }}>
                        {st.sub.map((s, k) => <li key={k} style={{ marginBottom: '4px' }}>{s}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )
      })}
    </div>
  )
}

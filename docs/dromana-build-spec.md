# AquaPro build spec: the dose calculator and the Dromana site

Sep 29, 2026 · Leonie Van Rooyen

Two builds. First, a dose calculator on the water test form, which applies to every site. It works out how much the operator has to add by hand. It does not dose anything itself, and it is not automatic dosing equipment. Second, a Dromana only site type for Senza Health Club, where three 390 L ice baths are dosed by hand four times a day and drained every night. Every number below comes from ACE-2026-SEN-TP-001 (operator training pack) and ACE-2026-SEN-LB-001 (water quality log book), both version 1.0, 27 September 2026.

## The dose calculator

This is a calculator, not a dosing system. Every site here is dosed by hand. The operator takes the reading, the app tells them how many millilitres or grams to add, and they pour it in and retest. Nothing is dosed by the app or by any equipment.

When a tech enters their readings, the app works out the dose and shows it. Three chemicals are calculated. Two are deliberately not calculated, and that is a safety decision, not an oversight.

| Chemical | What it changes | Formula | Checked against the chart |
| --- | --- | --- | --- |
| Sodium hypochlorite 12.5% | Raises free chlorine | mL = deficit (mg/L) x volume (L) / 125 | 390 L, raise 1.0 = 3.12 mL. Chart says 3.1 mL |
| Sodium bicarbonate | Raises total alkalinity | g = deficit (mg/L) x volume (L) / 591 | 390 L, raise 10 = 6.6 g. Chart says 6.6 g |
| Sodium thiosulphate | Lowers free chlorine | g = excess (mg/L) x volume (L) / 975 | 390 L, drop 1.0 = 0.4 g. Chart says 0.4 g |
| Dry acid (sodium bisulphate) | Lowers pH | Do not calculate. Fixed 7 g per 390 L bath | Fixed, two doses maximum |
| Soda ash (sodium carbonate) | Raises pH | Do not calculate. Fixed 4 g per 390 L bath | Fixed |

### Why acid is not calculated

The training pack is deliberate about this. Acid is dosed in fixed steps, circulated 15 minutes, retested, and capped at two doses before the operator stops and calls Ace on 0422 470 214.

A calculated acid dose in a 390 L bath is how someone overshoots and pits the stainless vessels. Build it as a fixed prompt with a dose counter, not a calculation.

### Rules the app has to enforce

1. The order is always test, dose, circulate 15 minutes, retest, record. The app should not accept a second dose on a body of water with no test entry in between.
2. Every dose needs a retest entry beneath it. A dose with no retest is the most common reason a record fails an inspection.
3. Acid stops at two doses. On the third attempt, block it and show the Ace phone number.
4. Thiosulphate should warn before it calculates. The pack says most of the time the right answer is to let the chlorine fall, or drain the bath.
5. Prompt to confirm the water is clear of bathers before any dose is recorded.

### What the calculation needs

Every formula multiplies by volume, so the calculator only works on pools that have a volume in the register. Hide it and show "volume not set" on any pool that is missing one, rather than calculating from a blank.

## Dromana site setup

Senza Health Club runs nothing like the rest of the portfolio, so it needs its own site type rather than the standard template.

| Field | Value |
| --- | --- |
| Site | Senza Health Club, 60 Collins Road, Dromana VIC 3936 |
| Water bodies | Bath 1, Bath 2, Bath 3. Chill Bunny cold plunge, 390 L each |
| Connected? | No. Three separate bodies of water, tested and logged separately |
| Classification | Category 1 aquatic facility, Public Health and Wellbeing Regulations 2019 |
| Council | Mornington Peninsula Shire, environmental health unit |
| Responsible person | Shannon Kyranidea, shannon@myconnect.com.au |
| Dosing | Manual only. No controller, no automatic dosing |
| Test kit | WaterLink Spin Touch, one disc per test per bath |
| Ace attendance | Weekly water balance panel, monthly laboratory sampling |

### Switch off for this site

- Controller and system screen values. There is no controller, so the "pH on screen", "free Cl on screen" and calibrated tick fields have nothing to read from.
- UV fields. No UV unit is installed.
- Backwash, filter pressure and circulation pump pressure. These are cartridge filters that come out and get cleaned by hand.

### Switch on for this site

- Three separate test entries per round, one per bath. One entry for the facility is a failed record.
- Bather count, recorded each round and again before the nightly drain.
- Daily calibration check disc result, taken before the pre-open round.
- Clarity, recorded as floor visible yes or no.
- Drain, clean and refill record, completed every night.

### The ozone trap

The baths came with an ozone unit built into the chiller. Under Victorian regulations ozone is not a disinfectant, and the guidelines require it to be not detectable in the water bathers sit in.

Do not let the app record ozone as a sanitiser or count it towards a disinfectant residual anywhere. The only thing protecting a bather here is the chlorine the operator doses and measures.

## The daily cycle

This is the biggest change to the app's model. AquaPro currently assumes one visit to a site per day. Dromana needs four rounds per day on the same site, on fixed times, plus a nightly close routine.

The gap between rounds must never exceed four hours while the baths are open. That is the legal minimum for a facility with no automatic monitoring, so the app should flag a round that runs late.

| Time | Round | What is tested |
| --- | --- | --- |
| 08:45 | Pre-open | Calibration check disc first, then the full panel on all three baths. Dose to 3.0 |
| 12:45 | Round 2 | Free and combined chlorine, pH, temperature, clarity, bather count |
| 16:45 | Round 3 | Same as round 2. The busiest period sits behind it, so expect the largest chlorine demand |
| 20:00 | Close | Final readings and bather count, then drain, clean, refill and dose |

### The pre-open round is a gate

The baths do not open until every one of them is in range. If a bath is not right at 08:45, that bath stays closed. The app should hold the site in a "not open" state until all three pre-open entries pass, rather than letting someone open and sort it out later.

1. Check the circulation pump is running on all three baths. A pump that is off means that bath cannot open.
2. Run the calibration check disc and record the result. A fail means the meter is not used and the baths do not open on its readings.
3. Bath 1: take the sample at elbow depth away from the return, run the full panel, record every reading.
4. Dose if anything is outside target, circulate 15 minutes, retest. Record the dose and the retest.
5. Repeat for bath 2, then bath 3.
6. Confirm the water is clear and the floor is visible in each bath.
7. Record the opening time and the operator name.

### Close of business, every night

All three baths are drained, cleaned and refilled every trading day. This is how the facility meets its obligation to dilute with fresh water, and it is not optional or weekly.

1. Close the baths to bathers and put the signage out.
2. Record the final readings and the day's bather count before draining.
3. Drain each bath completely.
4. Remove the cartridge filter, clean it, refit it.
5. Scrub all wetted surfaces including the waterline. Non-abrasive pad only, the vessels are stainless.
6. Rinse thoroughly with mains water.
7. Wipe down the surround, steps and handrails.
8. Refill and dose to the refill recipe below.
9. Record the drain, the clean, the refill and every dose.
10. Leave the circulation pump running overnight.

Once a week, add the deep clean: after draining, spray every wetted surface with one part chlorine to ten parts water, leave it ten minutes, then rinse thoroughly before refilling. The app needs a weekly flag for this, because it is the main defence against Pseudomonas, which lives on surfaces and never shows up on a chlorine test.

### The nightly refill recipe

The same every night. Melbourne tap water is very soft and carries almost no alkalinity, so every refill needs bicarbonate before the bath is fit to open. This is the step most often forgotten, so build it as a sequence the operator ticks through rather than free text.

| Step | Action | Dose per bath |
| --- | --- | --- |
| 1 | Refill to the operating level | 390 L |
| 2 | Check the pump is running |  |
| 3 | Add sodium bicarbonate | 39 g |
| 4 | Circulate 15 minutes |  |
| 5 | Add sodium hypochlorite 12.5% | 9.4 mL |
| 6 | Circulate 15 minutes, then test the full panel |  |
| 7 | Adjust pH to 7.3 to 7.6, retesting each time | 5 mL steps |
| 8 | Record everything |  |
| 9 | Leave the pump running overnight |  |

## Targets and the traffic light

The app should colour every reading as it is entered and tell the operator what to do. These are the bands.

| Parameter | Target | Legal requirement | Close the bath if |
| --- | --- | --- | --- |
| Free chlorine | 3.0 mg/L, trade 2.0 to 5.0 | Minimum 1.0 mg/L | Below 1.0 |
| pH | 7.3 to 7.6 | 7.2 to 7.8 | Below 7.0 or above 8.0 |
| Combined chlorine | Below 0.5 mg/L | Below 1.0 | Above 1.0 |
| Total chlorine | Below 6.0 mg/L | Maximum 10 mg/L | Above 10 |
| Total alkalinity | 80 or above | Above 60 mg/L | Correct it, do not close |
| Clarity | Clear, no film | Floor clearly visible | Floor not visible |

**Two rules here differ from the printed log book, on Ace's instruction of 3 October 2026.**

The log book closes a bath when combined chlorine is *above 1.0, or above free*. The second half
is dropped: combined chlorine closes a bath above 1.0 and not below it. In practice this changes
nothing at these baths, because free chlorine already closes below 1.0 — for combined to exceed
free while free is 1.0 or more, combined must itself be over 1.0, which closes it anyway. It
would matter at a site with no free-chlorine floor, so `closureReasons` still applies "above
free" wherever a site sets no combined-chlorine ceiling of its own.

The log book bands alkalinity 80 to 120. The upper figure is removed: high alkalinity is not
treated as a fault at these baths and nothing flags a reading over 200. The floor is unchanged —
below 80 is corrected with bicarbonate, below 60 closes the bath.

Free chlorine is dosed to 3.0 rather than the legal 1.0 on purpose. In 390 litres with people getting in and out, the residual can drop several mg/L within the hour, and every reading below 1.0 is a recorded breach sitting in the log book with someone's name on it.

### Corrective action, by condition

| Reading | What the app tells them to do | Before it reopens |
| --- | --- | --- |
| Free chlorine 1.0 to 1.9 | Still legal. Dose back to 3.0, circulate 15 minutes, retest | Stays open only if the retest is 2.0 or above |
| Free chlorine below 1.0 | Close the bath. Dose to 3.0, circulate, retest | Two readings of 2.0 or above, 15 minutes apart |
| Free chlorine above 5.0 | Do not dose. Let it fall, retest next round | Below 5.0 |
| Total chlorine above 10 | Close the bath. Drain, refill, redose | Full panel in range after the refill |
| pH 7.9 to 8.0 | 5 mL acid, circulate, retest. Once more if needed | pH 7.8 or below |
| pH above 8.0 or below 7.0 | Close the bath. 5 mL steps. If two doses do not fix it, drain and refill | pH 7.2 to 7.8 on two readings |
| Combined chlorine 0.5 to 1.0 | Note it. Tell Ace if it keeps happening |  |
| Combined above 1.0 | Close the bath. Drain, clean, refill | Full panel in range after the refill |
| Alkalinity below 60 | Dose bicarbonate from the chart. Circulate, retest | Above 60 |
| Floor not visible | Close the bath. Check the filter, drain, refill | Clear water and full panel in range |
| Pump not running | Close that bath. Restore circulation before dosing anything | Pump running, full panel in range |

### Who closes and who reopens

Any staff member on duty can close a bath and needs nobody's permission. The app must not gate a closure behind an approval, a manager login or a reason code that blocks submission.

Reopening is different. The responsible person, Shannon Kyranidea, authorises it on the evidence in the record. So the app needs two separate actions: close, available to everyone, and reopen, restricted to the responsible person and requiring the two in range retests to be logged first.

## Dose chart for a 390 L bath

Test the calculator output against these. They are the printed figures the operators work from, so the app has to agree with the card on the wall.

### Sodium hypochlorite 12.5%, to raise free chlorine

| Raise free chlorine by | One bath | All three baths |
| --- | --- | --- |
| 0.5 mg/L | 1.6 mL | 4.7 mL |
| 1.0 mg/L | 3.1 mL | 9.4 mL |
| 2.0 mg/L | 6.2 mL | 18.7 mL |
| 3.0 mg/L (refill dose and standing target) | 9.4 mL | 28.1 mL |
| 5.0 mg/L | 15.6 mL | 46.8 mL |
| 6.0 mg/L | 18.7 mL | 56.2 mL |

### Sodium bicarbonate, to raise total alkalinity

| Raise alkalinity by | One bath | All three baths |
| --- | --- | --- |
| 10 mg/L | 6.6 g | 20 g |
| 20 mg/L | 13.1 g | 39 g |
| 40 mg/L | 26.2 g | 79 g |
| 60 mg/L (refill dose) | 39.3 g | 118 g |

### Sodium thiosulphate, to lower free chlorine

| Lower free chlorine by | One bath |
| --- | --- |
| 1.0 mg/L | 0.4 g |
| 2.0 mg/L | 0.7 g |
| 3.0 mg/L | 1.0 g |
| 5.0 mg/L | 1.7 g |

Dissolve it in warm water first, it is slow to dissolve. Most of the time the right answer is to leave the chlorine to fall, since the bath is drained at close anyway.

### Fixed doses, not calculated

- Lower pH: 7 g dry acid, circulate 15 minutes, retest. Two doses maximum, then stop and call Ace.
- Raise pH: 4 g soda ash per 10 mg/L. Soda ash raises pH, bicarbonate raises alkalinity. The app should never offer one where the other is needed.
- Contamination disinfecting solution: one part chlorine to ten parts water. For 5 litres that is 455 mL chlorine into 4,545 mL water.

## Log book forms in AquaPro

The log book holds eleven forms. Most map onto screens AquaPro already has, so the Dromana build is mostly configuration plus three new forms.

| Form | What it records | How often | Where it goes in AquaPro |
| --- | --- | --- | --- |
| F1 | Daily test and dose record, three baths, four rounds | Every trading day | Water test form, reconfigured for four rounds |
| F2 | Close of business drain, clean and refill | Every trading day | New. The nightly close form |
| F3 | Testing unit calibration check | Daily, before pre-open | New. Gates the day, blocks the pre-open round on a fail |
| F4 | Corrective action and bath closure | Whenever a bath is closed or corrected | Pool Closures, extended with the retest rows |
| F5 | Contamination incident report | Every event | New. The fourteen step response |
| F6 | Weekly rotating roster | Weekly, in advance | Staff and Shifts |
| F7 | Weekly water balance panel, done by Ace | Weekly | Water test form, marked as an Ace visit |
| F8 | Weekly log book review and sign off | Weekly | New. Shannon's review screen |
| F9 | Monthly laboratory results | Monthly | Microbiology |
| F10 | Chemical delivery and stock | Every delivery, audited monthly | Chemicals and stocktake |
| F11 | Plant, equipment and facility check | Weekly | Checklists |

### The regulation 59 clock on F9

A failed laboratory result starts a legal countdown from the moment the result is received. This needs real timers and alerts in the app, not a note on a form.

| Deadline | Action |
| --- | --- |
| Within 24 hours | Corrective action taken, risk management plan reviewed, any fault corrected |
| Within 48 hours | Affected bath resampled |
| Within 24 hours of the resample result | Council notified |
| On a further failure | Repeat corrective action, plan review and resampling |
| On a second further failure | Close the facility |
| Within 24 hours of closing | Notify Council in writing |

### Three rules the forms imply

1. Entries are made at the time the work is done, not at the end of a shift. The app already timestamps, which is the strongest argument for using it here.
2. A missed round is recorded as missed, with a reason. Build a "round missed" option rather than leaving a gap, because an honest gap is a manageable finding and an invented reading is an offence under regulation 60.
3. Every dose needs a retest beneath it, and every closure needs two in range retests fifteen minutes apart before it can reopen.

## The Dromana report

The report should print to the same shape as the paper forms. That way a day's output can be filed in the folder at the premises, which is what regulation 61 actually asks for, and an inspector sees a document they recognise.

| Report | Covers | Who reads it |
| --- | --- | --- |
| Daily | Calibration check, four rounds across three baths, every dose and retest, bather counts, the close and refill | Filed at the premises. Produced to an inspector on request |
| Weekly | Roster, plant and facility check, Ace water balance panel, closures and corrective actions, Shannon's review and sign off | Shannon, and Ace at the weekly attendance |
| Monthly | Laboratory results with the certificate attached, chemical stock and safety audit, competency register | Ace, and Council if asked |

### What the daily report has to show

- Three separate rows per round, one per bath, never one row for the facility
- Free, total and combined chlorine on every entry, not just free
- Every dose with the retest underneath it
- Any round that was missed, marked as missed with the reason
- The operator's name on every entry
- Whether any bath was closed, and the form reference if so

### What makes a record fail

Worth building the report so these cannot happen. From the training pack:

- One entry for the whole facility instead of three
- A dose recorded with no retest
- Identical readings every round all week, which reads as invented
- A gap with nothing written in it
- No operator name or initials
- Readings entered all at once, well after the round time

## Building it to sell

AquaPro is now a product Ace sells on to clients, not an internal tool. That changes one thing structurally: Dromana stops being a special build and becomes the first client configuration.

Everything specific to Senza has to live in data rather than in code. The test is simple. If adding a new client means writing code, it is not a product yet. It should mean filling in a setup form.

### What has to be configurable per site

| Setting | Dromana | Why it cannot be hard coded |
| --- | --- | --- |
| Dosing type | Manual | Automated sites need the controller fields Dromana hides |
| Rounds per day | Four, at fixed times | Most sites are one visit. Some daily, some weekly |
| Water bodies | Three, separate | Others have one, or a pool plus spa plus water feature |
| Volume | 390 L each | Drives every dose calculation |
| Sanitiser | Liquid chlorine 12.5% | Salt, calcium hypochlorite and bromine all dose differently |
| Target bands | Free chlorine 3.0, pH 7.3 to 7.6 | A hydrotherapy pool at 34 degrees holds different numbers |
| Close triggers | Per the traffic light | Category and risk profile change these |
| Checklist items | Ice bath specific | Every site has its own |
| Nightly routine | Drain, clean, refill | Almost no other site does this |

### Tenancy

- Organisation is the top level. A client sees only their own sites, their own staff and their own records.
- Ace sits above as the service provider, with access to the tenants it services and nothing else.
- Senza staff never see an Ace client list, a price, or another site.
- Ace techs keep the portfolio view they have now.

Senza needs less of AquaPro, not something different. Today's rounds, the water test, the site checklist, the close and refill, incidents, the roster and the weekly review. They do not need the multi site register, WQRMP reports, the asset register, risk register or remote sites. That is a role with fewer screens.

### What Ace is actually selling

Not software. The evidence that a facility is compliant, produced automatically as the work is done: the regulation 61 record, the regulation 59 laboratory clock, the corrective action trail and the competency register.

Ace is in an unusual position here. They write the water quality risk management plan and the app enforces it. Nobody selling generic pool software can say that.

### Three things to sort before it reaches a second client

1. Regulation 61 stays with the client. Records must be held at the premises. The app supports that obligation, it does not discharge it. Put that in writing in whatever is sold.
2. Backups and liability. Once Ace holds a client's compliance record, losing it becomes Ace's problem. Daily backups, and terms that say what Ace is and is not responsible for.
3. Support hours. If AquaPro is down at 08:45 a facility cannot open. Decide what response time is promised before it is promised to anyone.

## Where things stand

Settled:

- Senza gets their own environment with no access to any Ace site
- AquaPro is built to be sold on to other clients, so multi tenant from the start
- No device at the premises. A printed daily log sheet goes in the folder, reference ACE-2026-SEN-LS-001

Still to settle with Tony:

1. Branding. Does each client get their own look and URL, or is it AquaPro by Ace Aquatics everywhere?
2. Pricing. Bundled into the service contract, or a separate fee per site?
3. Documents. Log book and training pack confirmed. Does the water quality risk management plan go up too?
4. Pool volumes. Twenty of the twenty two sites in the register are still missing volumes or sanitiser details, and the dose calculator stays dark until they are filled in.

@AGENTS.md

## Project docs

- `docs/dromana-build-spec.md` — the build spec for the dose calculator and the Senza Health Club (Dromana) site. Read it before touching dosing, the water test form, site configuration or multi tenancy. It carries the dose formulas, the target bands, the traffic light close rules and the Victorian regulation references, all taken from Ace Aquatics' own operator training pack and log book.
- `docs/ACE-2026-SEN-LS-001_Daily_Log_Sheet.pdf` — the printed daily log sheet kept at the Dromana premises. The daily report should print to the same shape.

Every site in this app is dosed BY HAND. The dose calculator tells the operator how much to add; it never doses anything and it is not automatic dosing equipment. A site with a controller (ProMinent, Chemtrol) records what the controller screen shows, and the operator still doses by hand.

## Rules that are not negotiable

- Acid doses are never calculated. Fixed 7 g per 390 L bath, two doses maximum, then stop. Overshooting acid pits the stainless vessels.
- Every dose must be followed by a retest entry. Never allow a second dose with no test in between.
- Any staff member can close a bath with no approval. Never gate a closure behind a permission check.
- Reopening a closed bath is restricted to the responsible person and requires two in range retests fifteen minutes apart.
- Ozone is not a sanitiser under Victorian regulations and must never count towards a disinfectant residual.

# Senza client access: build plan

Sep 29, 2026 · Leonie Van Rooyen · branch `client-access`

Senza Health Club get their own logins to AquaPro. They dose their own water, run their own tests and hold their own records. Ace keeps the equipment service and the weekly balance panel, and can see Senza's records because Ace services them.

This is the narrow version of multi-tenancy from the build spec's "Building it to sell" section. It is not throwaway: the fence built here is what client three logs in through.

## Who gets what

Two logins, both scoped to Senza and nothing else.

| | Owner / admin | Staff (operator) |
| --- | --- | --- |
| Record a round: test, dose, retest | Yes | Yes |
| Dose calculator | Yes | Yes |
| Site checklist and nightly close routine | Yes | Yes |
| Report a fault or incident | Yes | Yes |
| History and records for their baths | Yes | Own entries |
| Export the compliance record | Yes | No |
| Add and deactivate their own staff | Yes | No |
| Reset their staff's passwords | Yes | No |
| Anything belonging to another company | No | No |

Every Senza person gets their own login. The record is stamped with who took the reading and who poured the chemical, which is the point — a shared venue login is worth very little at an inspection.

Senza never see: the site register, other companies, prices, the roster beyond their own site, WQRMP reports, the asset register, the risk register or remote sites.

## How the fence works

An `org_id` column on two tables only: **pools** and **staff**. Everything else in the database — tests, doses, checklists, plant logs, incidents, attachments — already hangs off a pool or a staff member, so it inherits the boundary without its own column.

- Everything that exists today becomes org 1, Ace Aquatics, flagged as the service provider.
- Senza is org 2. Their three baths are tagged to it.
- A provider-to-client link lets Ace see the orgs it services. Senza have no such link, so they see only themselves.

All data access goes through one scoped helper that applies the filter centrally, rather than 47 API routes each remembering to. One place to get right, with a test that fails the build if a route bypasses it.

## Order of work

**1. Storage buckets. DONE — live.** The `attachments` bucket was public. Site access procedures now live in a private `site-docs` bucket and bug-report screenshots in a private `feedback-screenshots`, both served as links that expire after an hour. Job photos stay public deliberately. Deleting an attachment now removes the file as well as the row.

**2. The fence. DONE — commit `e713000`, not yet merged or deployed.**

- `organisations` and `provider_clients` tables. Ace is org 1 and flagged as the service provider; Senza is org 2 with Ace linked to it.
- `org_id` on six root tables. Chemicals is in that list because Senza get their own list, and `site_tasks` and `compliance_requirements` are in it because their nullable `pool_id` means "applies to every site" and would otherwise cross companies.
- `lib/org-scope.ts` is the single chokepoint: `visibleOrgIds`, `visiblePoolIds`, `canAccessPool`, `canAccessStaff`, `canAccessEntity`, `orgForNewRecord`. Applied across 22 routes.
- Attachments are polymorphic, so `canAccessEntity` resolves each `entity_type` back to its pool. An unknown type is refused rather than allowed.
- `lib/org-scope.test.ts` walks `app/api` and fails the build if a route reads a shared table without a scope helper. Exceptions are allowlisted with a reason and the allowlist is checked for rot.
- `client_admin` and `client_operator` roles exist; login sends them to `/client`; the admin and technician pages bounce a role that does not belong there. `proxy.ts` (Next 16 renamed middleware to proxy) redirects anyone without a session cookie.

Nothing visible changes for Ace: there is one org, so every query returns what it did before. No Senza login exists until the portal is built.

**3. The Senza portal.** A separate cut-down app: today's rounds, water test with the calculator, checklist, close routine, incidents. Owner login adds staff management and the record export.

**4. Dromana rules.** The parts of the build spec that make the record defensible:

- Three separate test entries per round, one per bath. Four rounds at 08:45, 12:45, 16:45, 20:00, flagged if a gap runs past four hours.
- Pre-open is a gate. The site stays "not open" until all three baths pass.
- Test, dose, circulate fifteen minutes, retest, record — in that order. No second dose on a bath with no test entry between.
- Hypochlorite, bicarbonate and thiosulphate are calculated. Acid and soda ash are fixed doses with a counter, capped at two, then the app blocks and shows 0422 470 214.
- Confirm the water is clear of bathers before any dose is recorded.
- Nightly drain, clean, refill as a ticked sequence, with the weekly deep clean flagged.
- Ozone is never recorded as a sanitiser and never counts towards a disinfectant residual.

**5. Configuration as data.** Target bands currently live in code. The `water_test_targets` table exists and nothing reads it. Move the bands, dosing type, rounds per day and checklist there, and the next client is a setup form rather than a build.

## What changes for Ace

The screens the techs use do not change. No retraining.

| | Effect |
| --- | --- |
| Site counts and dashboards | Senza's three baths would land in Ace's totals unless filtered out |
| Result emails | Currently all go to `info@aceaquatics.com.au` — needs a decision below |
| "Visit any site" | Sits on one of the endpoints being locked down. Keeps working for Ace roles, but needs care |
| Site access key screen | Must not list another company's codes |

## Decided

1. **Results email** goes to both: the Ace office inbox and Catherine@ozzfit.com.au. Needs per-site email routing, which does not exist today — one hardcoded address for everything.
2. **Senza's baths do appear in Ace's site counts.** No filtering needed on the overview or the roster coverage chips.
3. **Branding stays AquaPro by Ace Aquatics**, with room for the Senza logo on their portal. No separate URL.
4. **Senza get their own chemical list**, not a copy of Ace's. They must never see Ace's depot stock or reorder points, so `chemicals` needs an `org_id` as well as pools and staff.

## Storage: the attachment bucket is public

Checked 29 Sep 2026 against the live project. The `attachments` bucket is **public**: a request for a missing file returns "Object not found" rather than "Bucket not found", which only happens when the bucket itself is readable without a login.

What that means:

- Any attachment URL works for anyone who has it. No login, no expiry, no record of who opened it.
- That covers water test photos, fault photos, plant room photos, the gym before-and-after shots, and the site access documents — including the Meridian procedure with the front door and key safe codes in it.
- Files **cannot** be listed or enumerated anonymously (that was tested separately and returns nothing), so this is not "the whole bucket is browsable". The exposure is per URL: forwarded emails, screenshots, browser history, a phone that syncs, someone who leaves.
- The chain that matters for tenancy: the attachments API is one of the eighteen routes that only checks for a login. A Senza operator could request attachments for an entity id belonging to another site and get back permanent public links.

The fix is contained: switch the bucket to private, add a route that checks the user is entitled to the file and then returns a short-lived signed URL, and have the attachment panel ask for that instead of using the stored URL. Existing rows keep working — the object path is derived from the URL already stored.

This should be done before any Senza login exists, and the site access documents are reason enough to do it regardless.

## The regulation point

Regulation 61 records must be held at the premises. AquaPro supports that obligation, it does not discharge it. Senza remain responsible for their own records, and the printed daily log sheet (ACE-2026-SEN-LS-001) stays in the folder on site. Put that in writing in whatever is sold.

Once Ace holds a client's compliance record, losing it becomes Ace's problem: daily backups and terms that say what Ace is and is not responsible for, before the second client signs.

# Where the chemical cost rates come from

Source: **Aquachem Platinum Price List 2024**, trade price **ex GST**, cheapest pack size.
Testing consumables: **LaMotte Pacific CP 1 Aug 2025**.
Recorded 3 October 2026. Suppliers reprice — re-check these yearly.

`chemicals.unit_cost` and `chemicals.unit_charge` are both **per dose unit and ex GST**.
The dose unit is the litre or kilogram a technician records a dose in, never the drum or bag it
is stored in. Everything below is already converted to that basis.

## Cost per litre / per kilogram

| Chemical | Buy as | Cost | Aquachem RRP (ex GST) |
|---|---|---|---|
| Liquid chlorine 12.5% | 15 L drum $12.48 | **$0.83 /L** | $1.13 /L |
| Calcium hypochlorite 70% | 10 kg $55.44 | **$5.54 /kg** | $15.50 /kg |
| Granular chlorine 81% (Triple-Chlor) | 10 kg $100.24 | **$10.02 /kg** | $21.90 /kg |
| Stabilised chlorine, granular | 10 kg $76.16 | **$7.62 /kg** | $16.00 /kg |
| Stabilised chlorine tablets | 25 kg $178.08 | **$7.12 /kg** | $15.16 /kg |
| Hydrochloric acid | 15 L $22.31 | **$1.49 /L** | $2.12 /L |
| Dry acid (sodium bisulphate) | 25 kg $63.82 | **$2.55 /kg** | $6.36 /kg |
| Soda ash | 25 kg $66.08 | **$2.64 /kg** | $4.60 /kg |
| Sodium bicarbonate | 25 kg $38.06 | **$1.52 /kg** | $3.56 /kg |
| Calcium chloride | 25 kg $44.69 | **$1.79 /kg** | $4.76 /kg |
| Cyanuric acid | 25 kg $89.58 | **$3.58 /kg** | $9.16 /kg |
| Sodium thiosulphate | 25 kg $161.96 | **$6.48 /kg** | $10.73 /kg |
| Salt | 20 kg $10.17 | **$0.51 /kg** | $0.75 /kg |
| Algaecide, benzyl | 10 L $71.68 | **$7.17 /L** | $12.90 /L |
| Algaecide, copper | 10 L $72.80 | **$7.28 /L** | $18.00 /L |
| Algaecide, polyquat | 10 L $301.28 | **$30.13 /L** | $51.90 /L |
| Clarifier | 10 L $107.52 | **$10.75 /L** | $19.50 /L |
| Flocculant (alum) | 25 kg $55.35 | **$2.21 /kg** | $3.96 /kg |
| Phosphate remover | 10 L $99.68 | **$9.97 /L** | $19.90 /L |
| Non-chlorine shock | 10 kg $122.08 | **$12.21 /kg** | $19.90 /kg |
| Filter cleaner | 10 L $109.76 | **$10.98 /L** | $21.50 /L |

## Two things the price lists give away

**Calcium hypochlorite is cheaper in 10 kg than in 25 kg** — $5.54/kg against $5.64/kg. The big
drum is the dearer one. Buy the 10s.

**Spin discs are cheaper through Aquachem than from LaMotte direct, and the accessories are the
other way round.** Same part numbers:

| Item | Aquachem | LaMotte | Buy from |
|---|---|---|---|
| 501 disc, 3x3 use, 50 pack | $244.99 | $259.00 | Aquachem |
| 204 disc + phosphate, 100 pack | $389.00 | $420.00 | Aquachem |
| 801 magnesium disc, 100 pack | $419.00 | $450.00 | Aquachem |
| Syringes, 3 pack | $33.29 | $30.00 | LaMotte |
| Syringe tips, 3 pack | $25.86 | $20.00 | LaMotte |
| Spin Touch disc cover | $33.46 | $18.00 | LaMotte |

Ace buys the discs from LaMotte, so LaMotte's prices are the ones loaded into the app by
`add-lamotte-spin-discs.sql`. The Aquachem column above is only there to show the gap.

## Spin Touch discs — LaMotte Pacific, net ex GST

Per-test assumes the "3 x 3 use" discs give three tests each and the rest give one.

| Code | Disc | Pack | Price | Per disc | Per test |
|---|---|---|---|---|---|
| 4334-H | 501 — Chlorine, 3 x 3 use | 50 | $259.00 | $5.18 | **$1.73** |
| 4335-H | 601 — Chlorine + Alkalinity, 3 x 3 use | 50 | $259.00 | $5.18 | **$1.73** |
| 4348-J | 104 — Chlorine | 100 | $450.00 | $4.50 | $4.50 |
| 4348-D | 104 — Chlorine | 10 | $49.00 | $4.90 | $4.90 |
| 4349-J | 204 — Chlorine + Phosphate | 100 | $420.00 | $4.20 | $4.20 |
| 4349-D | 204 — Chlorine + Phosphate | 10 | $46.00 | $4.60 | $4.60 |
| 4350-J | 304 — Chlorine + Borate | 100 | $460.00 | $4.60 | $4.60 |
| 4355-J | 801 — Magnesium | 100 | $450.00 | $4.50 | $4.50 |
| 4355-D | 801 — Magnesium | 10 | $49.00 | $4.90 | $4.90 |
| 4331-J | 402 — Biguanide | 100 | $460.00 | $4.60 | $4.60 |

The two 3 x 3 discs are less than half the cost per test of any single-use disc. Buy in the 100s
where there is a choice: the 104 is $4.50 a disc in the 100 pack against $4.90 in the 10.

### Spin Touch accessories — LaMotte Pacific, net ex GST

| Code | Item | Price |
|---|---|---|
| 1705 | Calibration check disc, Spin Touch | $99.00 |
| 1189-3 | Syringes, 3 pack | $30.00 |
| 1189-TIP | Syringe tips, 3 pack | $20.00 |
| 1719 | Black disc cover, Spin Touch | $18.00 |
| 0669 | Cleaning tissues, 50 pack | $15.00 |
| 1712 | USB cable, Spin Touch | $45.00 |
| 1725 | AC adapter, Spin Touch | $59.00 |
| 1727-CC | Car charger | $22.00 |
| SC-1095 | SpinCare extended 3rd year warranty | $249.00 |
| 3580-AU | WaterLink Spin Touch | $1,645.00 |
| 3581-AU | WaterLink Spin Touch Mobile | $1,955.00 |

The Mobile is $1,764.00 at Aquachem, $191 under LaMotte's price. The bench unit is $1,645.00 at
both.

A disc is a per-visit consumable, not a dose into a pool, so it never reaches the monthly
chemical usage report. Charging testing on would need a separate per-visit line, or it stays
inside the service fee.

## Markup

Aquachem's own RRP implies anything from 1.36x (liquid chlorine) to 2.80x (cal hypo), so RRP is
not a usable basis for a single rule. Tony sets the markup. `set-chemical-costs.sql` loads the
cost column and then derives the charge from one multiplier at the top of the file, so changing
the markup is a one-number edit.

Watch liquid chlorine: it is the highest-volume item and the thinnest retail margin. At 2x cost
the charge is $1.66/L, which is *above* Aquachem's $1.13/L retail. That may well be right for a
chemical delivered and applied on site, but it should be a decision rather than an accident.

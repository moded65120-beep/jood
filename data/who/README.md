# WHO Child Growth Standards reference snapshot

Prepared on 2026-10-23. Data preparation only: no application imports, chart
implementation, UI edits, or changes to patient measurement behavior.

## Official sources and version

The original downloads are the expanded XLSX tables linked from WHO:

- [Weight-for-age](https://www.who.int/tools/child-growth-standards/standards/weight-for-age)
- [Length/height-for-age](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age)
- [Head circumference-for-age](https://www.who.int/tools/child-growth-standards/standards/head-circumference-for-age)

Each indicator has boys/girls Z-score and percentile files: 12 workbooks total.
`sources.json` records every exact download URL (including WHO's `sfvrsn` revision
query), retrieval timestamp, byte count and SHA-256. Original files are unchanged.

Weight and length/height standards are from **2006**; head circumference standards
are from **2007**. These are standard publication years, not download versions.
WHO does not identify these workbooks with a semantic dataset release number.
The imported snapshot is therefore identified by source URLs and file hashes.
Workbook metadata dates are preserved in `extracted/` and `validation-report.json`;
they must not be interpreted as a scientific revision to the standards.

Also archived: WHO's expanded-table instructions, WHO Anthro PC manual v3.2.2
(2011), and the 2007 reference computation note. The latter describes the older
child reference, NOT replacement data for infants; it explicitly explains the
restricted LMS method shared with the Child Growth Standards.

## Files and row structure

```text
raw/                 12 untouched XLSX + 3 official PDF documents
extracted/           12 JSON files with original columns and numeric cell strings
reference/           6 normalized JSON files (one per indicator and sex)
sources.json         original URL, hash, retrieval and file size manifest
validation-report.json
download.ps1         optional explicit refresh from official WHO pages
extract.ps1          read-only OOXML extraction; original numeric text preserved
prepare.mjs          offline import validation and normalized JSON generation
mysql-schema.sql     proposed relational schema; not executed
```

Each normalized file contains schema version, dataset ID, indicator, sex, unit,
publication year, source filenames/sheets, coverage and a `rows` array. Each row:

- `ageDays`: integer, source age in days.
- `L`, `M`, `S`: source Box-Cox power, median and coefficient of variation.
- `measurementMethod`: `recumbent_length` / `standing_height` for lhfa; otherwise null.
  This is the reference convention, not an assertion about a patient's actual method.
- `zScores`: source measurements keyed by scores `-4` through `4`.
- `percentiles`: source measurements keyed by `0.1`, `1`, `3`, `5`, `10`, `15`,
  `25`, `50`, `75`, `85`, `90`, `95`, `97`, `99`, `99.9`.

Sex is explicitly `male` or `female`, determined from the official filename.
Do not infer sex from a name or confuse external numeric sex codes. Weight is kg;
length, height and head circumference are cm. Values are imported, not estimated.
No source numeric precision is deliberately rounded during normalization. JSON
numbers use JavaScript/Excel binary double precision; `extracted/` retains the
exact XML numeric strings for audit and future import implementations.

For MySQL, use dataset + age as the LMS key, and dataset + age + curve kind +
position as the curve key. `mysql-schema.sql` separates sources, datasets, LMS
rows and curve values. Importing requires a future service; no DB is created now.

## Coverage, age and measurement method

Every workbook contains **1,857 rows: days 0 through 1,856 inclusive**, at one-day
intervals. This exceeds the required birth-through-36-month scope. The percentile
age header is sometimes `Age`, sometimes `Day`; both enumerate the same daily
indices, verified against the paired Z-score workbook.

WHO's [expanded-table instructions](https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/instructions-en.pdf?sfvrsn=5cec8c61_23)
specify daily tables, 30.4375 days per chart month, three-decimal curve values and
the length/height break between days 730 and 731. Thus 36 chart months represent
1095.75 days. Never smooth or interpolate across that measurement-method break.

For future patient lookup, parse valid birth/measurement dates as calendar dates,
convert both to UTC date-only ordinals and subtract to obtain integer ageDays.
Use the measurement date, not today. This avoids daylight-saving and timezone
errors. Use that exact daily row and the child's recorded sex: **no monthly
interpolation is needed**. Calendar age displayed in the UI is separate from the
WHO daily lookup and must not replace it. Reject missing dates/sex or ages beyond
coverage rather than inventing values or extrapolating.

The existing app's range is through the calendar third birthday (1095 or 1096
days depending on leap years). Keep all official days; agree later whether a
36-month chart ends at the nominal WHO coordinate or the calendar birthday.
Both are covered. This phase does not change the application's current policy.

The [WHO Anthro manual, sections 3.2.1 and 3.2.3](https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/software/anthro-pc-manual-v322.pdf?sfvrsn=c4e76522_2)
uses date-of-visit minus date-of-birth. Days 0–730 use recumbent length; day 731
onwards uses standing height. If measured standing below day 731, add 0.7 cm for
length-based evaluation; if measured recumbent from day 731, subtract 0.7 cm for
height-based evaluation. Preserve the original measurement, actual method and
separate adjusted value. Do not silently assume the method from age. The current
form does not capture method; this needs an approved future integration change.

If future inputs include fractional ages rather than date-only measurements,
match the official WHO implementation's rounding policy with boundary tests.
Do not introduce linear interpolation of LMS values as an undocumented clinical
method. Chart rendering between official points must preserve the day-730/731
break; rendered lines do not create new official reference records.

## Z-score methodology for the future implementation

WHO's [LMS helper implementation](https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/R/z-score-helper.R)
and [computation note](https://www.who.int/docs/default-source/child-growth/growth-reference-5-19-years/computation.pdf)
describe the calculation. At the selected sex/day, for measured value X:

```text
L != 0: Z = ((X / M)^L - 1) / (L * S)
L == 0: Z = ln(X / M) / S              (limiting LMS case)
C(z) = M * (1 + L*S*z)^(1/L)          (L != 0)
C(z) = M * exp(S*z)                   (L == 0)
```

The [weight-for-age implementation](https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/R/z-score-weight-for-age.R)
uses restricted LMS beyond +/-3:

```text
Z > 3:  finalZ = 3 + (X - C(3)) / (C(3) - C(2))
Z < -3: finalZ = -3 + (X - C(-3)) / (C(-2) - C(-3))
otherwise finalZ = Z
```

The [length/height](https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/R/z-score-length-for-age.R)
and [head-circumference](https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/R/z-score-head-circumference-for-age.R)
implementations use unadjusted LMS; imported L is 1 for these indicators, giving
`Z = (X-M)/(M*S)`. Do not apply the weight tail correction to every metric.
The imported weight +/-4 curves agree with restricted-LMS extension, not naive
Box-Cox extrapolation. These formulas are documentation and offline validation
only; no patient Z-score calculator is added to the application.

Percentile conversion uses the standard-normal cumulative distribution of Z.
Follow WHO's documented display restrictions near extreme tails; do not present
fabricated precision. Future calculations need official-software comparison
cases, domain/boundary checks, and rounding only at presentation. The downloaded
tables are authoritative for chart curves; this phase adds no diagnoses or flags.

## Reproduce and validate

From the project root, with PowerShell and Node already available:

```powershell
# Network access; only when intentionally refreshing the snapshot:
& ./src/data/who/download.ps1
# Offline extraction and validation:
& ./src/data/who/extract.ps1
node src/data/who/prepare.mjs
```

Validation passes for 22,284 source rows, combined into 11,142 sex/indicator/day
records. Checks cover file signatures/hashes, complete consecutive ages, no
missing/nonfinite cells, positive M/S/reference values, ordered curves, paired LMS
equality, median/P50 consistency, method break, source-to-JSON numeric conversion
and serialization. All 100,278 Z-curve cells reconstruct from LMS within
0.00050001 source units (WHO's three-decimal rounding, plus floating-point slack).
Percentiles are checked for ordering, numeric integrity and P50 agreement; other
percentile columns are imported verbatim, not independently regenerated.

## Decisions before chart integration

1. Capture the actual length/height measurement method and store adjustments
   separately. The approved current UI is unchanged in this phase.
2. Confirm the 36-month endpoint policy described above.
3. Agree on the displayed Z-score/percentile curves, and test the final calculation
   service against official WHO software before displaying patient assessments.

No charts should be connected until separately approved. There are no missing
required dataset files and no unofficial replacement values.

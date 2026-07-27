# BIR 1701Q AcroForm Autofill Status

## Current Scope

This branch proves that eTax can generate BIR Form 1701Q from the approved
AcroForm template using dummy data. Real taxpayer-data integration and
production tax computations are intentionally outside this milestone.

Branch: `feature/acroform_autofilling`

Approved master template:
`docs/1701Q2018_chrome_fillable.pdf`

The word `chrome` records how the template was originally created. Chrome is
not used when filling PDFs at runtime.

## Implemented

- [x] Preserve the approved master template without modifying it.
- [x] Preserve Denver's PDF and all other existing PDF files.
- [x] Load and fill the approved AcroForm directly with `pdf-lib`.
- [x] Generate PDFs without launching Chrome or Chromium at runtime.
- [x] Use the existing `DUMMY_1701Q` dataset for the current app preview.
- [x] Store dummy values in the editable
      `lib/pdf/1701q/fixtures/dummy-1701q.json` fixture.
- [x] Keep the generated PDF editable by default.
- [x] Add a `Flatten PDF` checkbox to the filing workspace.
- [x] Flatten only when `flatten=1` is explicitly requested.
- [x] Preserve searchable, selectable vector text in flattened PDFs.
- [x] Keep PDF preview/download generation free of filing-status mutations.
- [x] Reduce font size progressively for long single-line values.
- [x] Wrap addresses across the two designated address fields.
- [x] Reject values that cannot fit instead of clipping or truncating them.
- [x] Normalize whole-peso amounts and right-align amount fields.
- [x] Preserve negative amounts and format them with thousands separators.
- [x] Validate and format TIN, date of birth, ZIP code, and RDO code.
- [x] Never silently truncate or abbreviate legal names and identifiers.
- [x] Embed a Unicode-capable font for names and addresses.
- [x] Add automated tests for validation, Unicode, overflow, editable output,
      and flattened output.
- [x] Pass tests, lint, typecheck, and the production Next.js build.

## Intentionally Deferred

- [ ] Replace `DUMMY_1701Q` with authenticated Supabase and SSO profile data.
- [ ] Add missing taxpayer-profile fields or related Supabase migrations.
- [ ] Map confirmed invoice totals into Form 1701Q.
- [ ] Implement and validate real Philippine tax computations.
- [ ] Populate every conditional schedule, spouse field, and payment-detail
      field from production data.
- [ ] Display structured PDF validation errors in the filing UI.
- [ ] Persist PDF generation records or audit metadata.
- [ ] Change filing or payment status as a result of PDF generation.
- [ ] Validate the generated file against the final BIR submission channel.
- [ ] Remove legacy Chrome/iText experiment code after final compatibility
      approval. Existing PDF artifacts must remain preserved.

## Supabase Migration Status

This AcroForm feature branch adds no Supabase migrations.

It inherits `supabase/migrations/011_agentic_vertical_slice.sql` from
`feat/agentic-approval-workflow`. That migration belongs to the parent
agentic-workflow feature and is not required by the dummy-data PDF renderer.

## Generation Records

A generation record would be an optional database audit entry, not another PDF
format. It could store the template version, normalized input snapshot, output
SHA-256 hash, generation timestamp, and whether the PDF was flattened.

This would help reproduce or verify a previously generated filing document.
It is not required for the current dummy-data rendering milestone and is
therefore deferred. Previewing or downloading a PDF currently performs no
database write and does not change filing status.

## Verification Artifacts

- Editable sample: `output/pdf/1701Q2018-autofill-editable.pdf`
- Vector-flattened sample: `output/pdf/1701Q2018-autofill-flattened.pdf`

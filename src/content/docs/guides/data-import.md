## What Data Import does

Data Import brings historical business data into Aide from files you already
have — old POS exports, spreadsheets and accountant CSVs — so a business that
is migrating does not start from an empty catalogue. Each import is recorded
as an auditable batch and can be undone with one click.

**Supported today (AIDE-22)**

| | CSV | Excel (`.xlsx` / `.xls`) | PDF |
| --- | --- | --- | --- |
| Products (prices, stock, categories) | ✅ | ✅ | Phase 2 |
| Customers (codes, contacts, credit limits) | ✅ | ✅ | Phase 2 |
| Sales history | Phase 2 | Phase 2 | Phase 2 |
| Ledger opening balances | After AIDE-05 migration | — | — |

Excel workbooks with multiple sheets are supported: you pick the sheet to
import after upload. The first row must contain column headers.

## Running an import

Open **Dashboard → Data Import** (`/dashboard/import`). You need the Owner or
Manager role — staff cannot import.

1. **What** — choose Products or Customers.
2. **File** — upload a `.csv` or `.xlsx` file (max 5 MB, max 2,000 data rows).
   You will see a preview of the first rows.
3. **Map columns** — map spreadsheet columns to Aide fields. Sensible matches
   are auto-detected; anything required (marked `*`) must be mapped. The same
   mapping can be reused the next time you import.
4. **Validate & import** — run the dry run first. You will see exactly how
   many rows are ready, how many are duplicates and how many have errors, plus
   a downloadable error report — nothing is written until you confirm.
5. **Done** — a summary of created / merged / skipped / failed rows. The batch
   appears in **Import History** with full row counts.

## How duplicates are handled

Aide detects duplicates against what is already in your business:

- **Products** — by SKU, falling back to name.
- **Customers** — by customer code, then phone, then email, then name.

Choose one of two strategies in the review step:

- **Skip duplicates** (default) — matched rows are left out of the import.
- **Merge into existing** — matched records are updated, but **only the fields
  actually present in your file** are changed. Blank cells never overwrite
  existing data, and the prior values are stored so the import can be undone.

Rows that duplicate an earlier row inside the same file are always skipped.

## Undoing an import

Every import is an **Import Batch**. In **Import History** you can:

- **Undo import** — deletes exactly the records that batch created and restores
  the prior values of records it merged. Records already in use (for example a
  product that appears on a sale, or a customer linked to invoices) are kept
  and reported as blocked — undoing never silently destroys referenced data.
  Empty categories created by the import are removed.
- **Download the error report** — every row that failed, with the reason, as CSV.

The batch itself is never deleted; it is marked **Rolled back** so the audit
trail survives.

## Limits and rules

- Max **2,000 rows** and **5 MB** per file — split larger files.
- Monetary values are parsed exactly (4 decimal places, half-up rounding,
  no binary floating point), matching Aide's ledger precision. Quantities must
  be whole numbers; prices must not be negative.
- Imports only ever write into **your business**. There is no way to import
  into another tenant's data.
- Imported rows appear everywhere immediately: POS, inventory, customers,
  invoices and reports.

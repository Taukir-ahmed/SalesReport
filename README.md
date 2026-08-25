# Sales Sheet

A spreadsheet you actually enjoy filling in. Log every sale — date, customer,
course, amount — and at month end hand someone a formatted Excel file without
having ever opened Excel.

Two screens: a **Pipeline** of the numbers you're working, and a **Sales sheet**
where the closed ones land. Built with React + Vite, backed by Supabase.

---

## Run it

Everything lives in your Supabase project — nothing is kept in the browser, so
the sheet is identical on every machine you open it on.

```bash
npm install
npm run dev
```

It opens at http://localhost:5173. The badge under the title shows which
Supabase project you're connected to.

### First-time setup (once)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   Then do the same with `supabase/pipeline.sql` (that's the second screen).
3. **Project Settings → API** → copy the *Project URL* and the *anon public* key.
4. Copy `.env.example` to `.env` and paste them in:

   ```
   VITE_SUPABASE_URL=https://your-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

5. Restart `npm run dev` — Vite only reads `.env` at startup.

If anything is missing the app says so on a setup screen instead of failing
quietly: no keys, tables not created yet, wrong key, or no connection each get
their own message.

---

## Using it

| What you want | How |
|---|---|
| Add a sale | Click the dashed row at the bottom of the sheet |
| Move across a row | **Tab** (Shift+Tab goes back) |
| Next row, same column | **Enter** |
| Abandon an edit | **Esc** |
| Delete a sale | Hover the row number, click the red **×** |
| Sort | Click a column header (click again to flip, third click clears) |
| Find something | The search box in the header — filters the current month |
| Widen a column | Drag the divider in the header; the width is remembered |
| Add a part payment | Hover the amount, click **+** |
| Change a sale's date | Switch to **Flat list** — in day view the date is the group heading |
| Change months | The arrows, or the month tabs under the header |

**Every month is its own sheet.** A month key (`2026-08`) is stored on each row
and read from the **Date** column — so if you fix a date to last month, the row
quietly moves to last month's sheet and the totals on both sheets correct
themselves. New month, empty sheet, no setup.

### Exporting

**Export → Excel (.xlsx)** produces a workbook that looks like the app: title
band, dark header, frozen panes, ₹ formats, merged date cells per day, green
days and red no-sale days, status-tinted rows, a payment breakup column when any
sale was split, a colour key at the bottom, a bold **TOTAL** row using a real
`SUM()` formula — and your open pipeline on a second tab. That's the one you
share at month end. Columns size themselves to the longest name, course or
amount in them, and a row grows taller when a long remark has to wrap — nothing
to drag by hand.

**Export → CSV** is raw data for importing somewhere else.

Whatever is on screen is what exports — so search or sort first to export a slice.

---

## The two screens

### Pipeline

Every number you're chasing: **name, phone, course, remarks** and a **status**.
The status is the whole mechanism.

| Status | What happens |
|---|---|
| **Promise to pay** | Stays in the pipeline, row glows gold so you chase it |
| **No sale** | Stays, row goes red |
| **DNP** (did not pick) | Stays, row goes grey |
| **Sale done** | Asks what came in, then moves onto today's sheet as *Sale complete* |
| **Registration done** | Same, lands as *Registration done* |
| **Half payment done** | Same, lands as *Half payment* |

A moved lead isn't deleted — it's stamped with the time it moved and the sale it
became. Tick **Show leads already moved** to see them.

**Nothing is deleted in a hurry.** Removing a lead drops it into the **Bin**
(button next to the chips), where it sits for 7 days with a countdown. Restore
puts it straight back in the pipeline; Delete forever is the only thing that
actually destroys a row. Expired leads are swept the next time you open the app.

### Sales sheet

One block per calendar day of the month.

- A day with sales gets a **green** date cell. Several sales on one day sit
  under a single merged date — the date is never repeated.
- A day that has been and gone with nothing logged becomes a **red "No sale"**
  row on its own, automatically. Today stays neutral until the day is over, so
  nothing goes red while you're still working. Click *add a sale for this day*
  on any of those rows to fill it in late.
- **Hide the empty days** above the table collapses them when you want to see
  only the wins; the sheet opens scrolled to today.

Each sale row is tinted by its status:

| Status | Colour |
|---|---|
| Sale complete | green |
| Registration done | orange |
| Half payment | purple |
| No sale | red |

### Part payments

Someone pays ₹2,000 at registration and ₹24,000 the next day. Hover the amount
cell, hit **+**, type the balance. The cell then reads **₹2,000 + ₹24,000**, the
total (₹26,000) is what sums in the footer and in Excel, and the export gets a
**Payment breakup** column showing the instalments.

---

## Changing the sheet later

Hit **⚙ Columns**. You can:

- rename a column,
- **change what kind of input it is** — Course is a dropdown today; make it a
  plain text box and the cell editor changes instantly, no data lost,
- edit the dropdown choices (existing rows keep whatever was already saved),
- reorder, hide, or set a width,
- add brand-new columns.

Available field types: **Text box · Dropdown · Number · Amount (₹) · Date ·
Status pill · Checkbox**. Numbers and amounts sum in the totals row. Status
pills get colour-coded in the app *and* in the Excel export (Paid green,
Pending amber, Cancelled red, etc.).

Deleting a column only removes it from the sheet — the values stay in the
database, so adding a column back with the same key brings them right back.

### Why adding columns doesn't need a database migration

Each sale is stored as one row with a JSON blob:

```json
{ "month_key": "2026-08", "position": 3,
  "data": { "date": "2026-08-19", "customer": "Rahul S.",
            "course": "Data Science & AI", "amount": 45000 } }
```

Add a "Payment status" column and it just becomes another key inside `data`.
Nothing to `ALTER TABLE`, ever.

### Adding a whole new *kind* of field

Open `src/lib/fieldTypes.js` — one object controls how every field type
behaves (which input renders, how the value displays, whether it sums, how it's
formatted in Excel). Add an entry and it shows up in the Columns panel
automatically. That file is the only place that needs to change.

---

## Where things live

```
src/
  lib/
    fieldTypes.js   ← how each field type behaves (the customisation hub)
    columns.js      ← starting columns, month-key helpers
    db.js           ← all Supabase reads/writes + readable error messages
    supabaseClient.js
    exporters.js    ← styled .xlsx (ExcelJS) and .csv
    status.js       ← every status name and its colour, app + Excel
  components/
    TopBar.jsx      ← screen switcher, month nav, search, export
    PipelineBoard.jsx ← the pipeline screen
    ConvertModal.jsx  ← lead → sale
    PaymentModal.jsx  ← part payments
    StatCards.jsx   ← the four summary tiles
    SheetGrid.jsx   ← the spreadsheet itself
    ColumnSettings.jsx
    Toast.jsx
  App.jsx           ← state and wiring
  styles.css        ← all styling; colours are the :root block at the top
supabase/schema.sql   ← paste into Supabase once
supabase/pipeline.sql ← and this one too
```

## Deploying

`npm run build` writes a static `dist/` folder — drop it on Vercel, Netlify, or
Cloudflare Pages and set the two `VITE_SUPABASE_*` values as environment
variables there. Free tiers cover this comfortably.

# SVKD COIR — PRD

## Original Problem Statement
Offline mobile app to track a coir business's finances: Income (Date, Product = Coir Pith/Coir Bale, Amount) and Expense (Date, Category = Salaries/Current bill/Maintenance, Amount), with total income, total expenses, and net balance. Device-only storage, ₹ INR, manual date entry with today preselected, dashboard with tabs, calendar view, and specialized fields per category (Husk conversion).

## Architecture
- Frontend: React Native (Expo SDK 54), expo-router, single screen `/app/frontend/app/index.tsx`.
- Storage: 100% offline via AsyncStorage. Keys: `coir-ledger-records-v1` (records), `svkd-coir-backups-v1` (local backups). No backend / MongoDB.
- Currency: ₹ INR via `Intl.NumberFormat('en-IN')`.
- Libraries: expo-print, expo-sharing, expo-file-system (legacy), expo-document-picker, @expo/vector-icons, custom in-app date picker (no native datetimepicker).

## User Persona
Small coir business owner/operator recording daily cash, tracking customer dues, and reviewing monthly/yearly performance on a phone.

## Data Model (AsyncStorage JSON)
- Income: { id, date, product, amount, name, address, phone?, status(paid|pending), tons?, costPerTon?, payments?[{id,date,amount}] }
- Expense: { id, date, category(Salaries|Current bill|Maintenance|Husk), amount, repairAmount, description, costPerTon, totalWeight, loads, loadWeight, coirOutput, pithOutput, trips }
- Backup: { id, createdAt, incomes[], expenses[] }

## Implemented (2026-06-11)
- App named "SVKD COIR" (header, PDFs, app.json).
- Dashboard totals + net balance; segmented tabs; bottom nav (Overview/Income/Expenses/Calendar/Settings).
- Income & Expense ledgers with add/edit/delete (custom confirm modal, no Alert).
- Income tons × cost-per-ton auto-amount with manual override; part-payments & payment history (PaymentModal) with remaining-due logic; badge PAID/PART PAID/PENDING.
- Husk expense: Name, Number of trips, Cost per trip (no weight input); amount = costPerTrip × trips; 4 tons/trip output (coir 25% / pith 75%).
- Search + category chip filters + custom cross-platform date picker; From/To date-range filters.
- Calendar: Month view (per-day rows, day-detail modal, export month PDF) + Year view (12-month income/expense bar chart, best/lowest month). Product Insights (Coir Pith vs Coir Bale) in month & year.
- Customer Statements (per-customer PDF) + WhatsApp share; Payment Reminders (day-threshold chips incl. "All", mark paid, WhatsApp reminder).
- Name/Address/expense-name autocomplete suggestions (SuggestInput) from prior entries.
- Vendors & totals modal: per-vendor income & expense totals + net (income by name, expenses by description).
- Local backups (on-device snapshots: create/restore/delete) + Restore-from-file.
- Security hardening: restore input validated/coerced (sanitizeIncome/Expense); user text escaped in generated PDF HTML.

## Implemented (2026-06-12, batch 3)
- Overview "Money Position" card: TO COLLECT (receivables) vs TO PAY (payables) with a net position line; tap opens Payment Reminders. Replaces the older outstanding pill.

## Implemented (2026-06-12, batch 4)
- Photo attachment on every income & expense entry via expo-image-picker: "Take photo" (camera) or "Choose from gallery", with in-form preview/replace/remove. Contextual permission handling (camera + media library) with an "Open Settings" fallback when blocked. Photo stored as base64 in the record; a thumbnail shows on the ledger row and opens a full-screen viewer on tap. app.json updated with iOS usage strings + Android CAMERA permission + expo-image-picker plugin.

## Data Model additions
- Income/Expense now include optional `photo` (base64 data URI).

## Implemented (2026-06-13)
- Homepage income FAB relabeled "Bill" (still add-income-button / income form).
- Payment Status now defaults to Pending and shows Pending before Paid (income & expense forms).
- Removed "Current bill" and "Diesel" expense categories everywhere (categories now: Salaries, Maintenance, Husk).
- Customer/Supplier PDF statements embed attached receipt photos in a "Receipts" section (also added to legacy customer statements).
- (Skipped per user: per-supplier same-date trip totals.)

## Implemented (2026-06-13, batch 2)
- Custom categories: users can add their own income products and expense categories (inline "New" chip in the record form + a "Manage categories" screen in Settings, with delete + confirm). Stored in AsyncStorage key `svkd-coir-categories-v1`. Ledger chips, category breakdown, and category trends all derive from actual data so custom categories appear automatically.
- Multiple photos per entry: records now store `photos: string[]` (legacy `photo` string still read via `photosOf`). Form shows a thumbnail grid with per-photo remove + "Add more"; ledger row shows first thumbnail with a count badge; tapping opens a full-screen gallery viewer with prev/next paging.
- Month PDF export now embeds attached receipt photos in a Receipts section (statements already did).

## Testing
- testing_agent iterations 3–11: all flows pass, no regressions. Latest: iteration_11 all green.

## Implemented (2026-06-12, batch 2)
- New "Diesel" expense category (form option, ledger chip, breakdown, trends).
- Search box in the Customers/Suppliers screen to filter contacts by name (per tab).
- Supplier (payables) reminders: Payment Reminders modal now has two tabs — "Customers owe you" (receivables) and "You owe suppliers" (payables), with Mark paid on pending expenses. Overview pill shows both to-collect and to-pay.

## Implemented (2026-06-12)
- Customers vs Suppliers split in the contacts screen (Settings → "Customers & suppliers"): Customers built from income names, Suppliers from expense descriptions; each tappable to a drill-down history.
- Per-entity PDF statement export + WhatsApp share inside every customer/supplier drill-down.
- "Pending only" filter chip in both Income & Expense ledgers.
- Category Trends card (Calendar → Month view): month-over-month growth per income product & expense category with up/down %.
- Blue "PART PAID" badge for partly-paid income records.

## Implemented (2026-06-11, update)
- Ledgers now sort newest date first (Income & Expenses).
- Inline per-category breakdown at top of each ledger tab: Income shows RECEIVED vs PENDING for Coir Pith & Coir Bale (Pith & Bale totals); Expenses show PAID vs PENDING per category.
- Expenses now carry a Paid/Pending status (RecordForm selector + row badge).
- Vendors screen: each vendor is tappable to drill into full transaction history (income + expense, newest first) with income/expense/pending summary.

## Backlog
- P1: Split index.tsx (~1490 lines) into components/ + utils/.
- P2: On restore, clamp negative amounts and reconcile payments[] sum vs record amount.
- P2: Payment receipts (per-payment PDF); WhatsApp for statements as attachment on native build.
- P3: Top customers view; profit-by-product (income minus related expenses).

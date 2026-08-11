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

## Testing
- testing_agent iterations 3–8: all flows pass, no regressions. Latest: iteration_8 all green.

## Backlog
- P1: Split index.tsx (~1490 lines) into components/ + utils/.
- P2: On restore, clamp negative amounts and reconcile payments[] sum vs record amount.
- P2: Payment receipts (per-payment PDF); WhatsApp for statements as attachment on native build.
- P3: Top customers view; profit-by-product (income minus related expenses).

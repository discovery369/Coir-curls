# Coir Ledger — PRD

## Original Problem Statement
Build a mobile app to track coir business finances with two main tables:
- **Income**: Date, Product (Coir Pith / Coir Bale), Amount
- **Expense**: Date, Category (Salaries, Current bill, Maintenance), Amount
Calculate total income, total expenses, and net balance.

Product requirements: device-only storage (no backend), ₹ INR currency, manual date entry with today preselected, dashboard summary with tabs, calendar view for daily tracking, and specialized fields per expense category (incl. Husk conversion logic).

## Architecture
- **Frontend**: React Native (Expo SDK 54), expo-router, single screen `/app/frontend/app/index.tsx`.
- **Storage**: 100% offline via AsyncStorage (key `coir-ledger-records-v1`). No backend / MongoDB.
- **Currency**: `Intl.NumberFormat('en-IN')`, ₹ prefix, tabular mono numerals.
- **Design**: "Palm Ledger" warm light theme, dark bottom nav (per `/app/design_guidelines.json`).

## Data Model (AsyncStorage JSON)
- `incomes`: { id, date(ISO), product: "Coir Pith"|"Coir Bale", amount, name, address }
- `expenses`: { id, date(ISO), category: "Salaries"|"Current bill"|"Maintenance"|"Husk", amount, repairAmount, description, costPerTon, totalWeight, loads, loadWeight, coirOutput, pithOutput, trips }

## User Persona
Small coir business owner/operator recording daily cash movement on a phone; needs quick entry, glanceable net balance, and daily/monthly review.

## Implemented (2026-06-11)
- Dashboard: net balance + income/expenses totals, segmented tabs (Combined/Income/Expenses/Calendar), bottom nav (Overview/Income/Expenses/Calendar/Settings).
- Income & Expense ledger tables with add/edit/delete.
- Record form: today-preselected date picker, product/category selector, amount validation (> ₹0).
- Category-specific fields: Salaries & Current bill → Name; Maintenance → Description; Husk → trips, weight/trip, cost/ton, auto amount (cost×trips×weight) with manual override + coir/pith output summary (25%/75%).
- Calendar view: monthly income/expense/net summary + per-day rows, prev/next month.
- Settings: private-storage note, currency, clear-all.
- **Fixes this session**: repaired broken JSX in RecordForm that prevented compilation; moved shared amount input + Save/Cancel out of the expense-only branch (income records can now be saved); replaced non-working `Alert.alert` confirmations (delete + clear-all) with a cross-platform custom confirm modal (works on web + native).

## Backlog
- P1: Search/filter records by product/category/date range.
- P1: Export monthly ledger to CSV/PDF for sharing with an accountant.
- P2: Tap a calendar day to see that day's individual records.
- P2: Split `index.tsx` into per-component files as it grows.

## Testing
- `testing_agent` iteration 3: all flows pass after fixes. Delete/clear verified working via custom confirm modal.

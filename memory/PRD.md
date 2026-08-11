# Coir Ledger PRD

## Problem statement
Build a mobile app with Income and Expense tables. Income records contain Date, Product (Coir Pith or Coir Bale), and Amount. Expense records contain Date, Category (Salaries, Current bill, or Maintenance), and Amount. The app calculates total income, total expenses, and net balance.

## Architecture
- Expo SDK 54 React Native app in `/app/frontend`.
- AsyncStorage provides device-only persistence; no authentication, API, sync, or remote data dependency.
- Expo Router entry screen in `app/index.tsx`; native date picker for dates and Expo vector icons for actions.

## User personas
- Small coir business owners recording daily sales and operating costs on a phone.
- Operators who need a quick cash-in/cash-out view without an account or network connection.

## Core requirements (static)
- Income table: date, product, amount.
- Expense table: date, category, amount.
- Totals for income and expenses plus net balance.
- Add, view, edit, and delete records.
- ₹ INR display and local device storage.

## Implemented
- 2026-08-11: Built Palm Ledger dashboard with net balance, income total, expense total, combined view, and filtered Income/Expenses tabs.
- 2026-08-11: Added device-local AsyncStorage hydration and persistence, native date selection, product/category choices, decimal validation, add/edit/delete flows, delete confirmation, and settings information.
- 2026-08-11: Added mobile-safe keyboard-aware scrollable record sheet, accessible test IDs, empty states, dark bottom navigation, and warm ledger visual system.
- 2026-08-11: Extended income records with name and address; extended expenses with repair amount and description. Repair amounts are included in total expenses and net balance, and details remain editable locally.
- 2026-08-11: Added Husk as an expense category with per-order load count, approximate tons per load, live coir/pith output (25%/75%), cost per ton, and total weight tracking. Expense rows show the per-ton and weight context when available.
- 2026-08-11: Verified Expo preview at 390x844, including adding income and expense records. Lint and TypeScript checks pass.

## Prioritized backlog
- P0: None remaining for the requested offline ledger MVP.
- P1: Add optional date-range summaries and export/share as CSV or PDF.
- P2: Add configurable currency and optional backup/import for device migration.

## Next tasks
1. Gather feedback from daily coir ledger use.
2. Prioritize monthly reporting or export based on that feedback.
3. Add automated regression coverage for edit, delete, and persistence flows.
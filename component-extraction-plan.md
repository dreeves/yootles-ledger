# Component Extraction Plan

## 1. Extract DateRangeFilter Component
- Create new component `src/lib/components/DateRangeFilter.svelte`
- Move date range input fields and logic
- Used by both history and transactions pages
- Props:
  - startDate
  - endDate
  - onStartDateChange
  - onEndDateChange

## 2. Extract TransactionsTable Component
- Create new component `src/lib/components/TransactionsTable.svelte`
- Move table rendering and balance calculation logic
- Used by both history and transactions pages
- Props:
  - transactions
  - selectedAccount
  - showBalances (optional)
  - chronological (optional)

## 3. Extract BalanceChart Component
- Create new component `src/lib/components/BalanceChart.svelte`
- Move all chart.js logic and state
- Used by history page
- Props:
  - transactions
  - interestRates
  - selectedAccount
  - showPercentages

## 4. Extract shared utilities
- Create `src/lib/utils/formatting.ts` for shared formatting functions
- Move formatCurrency, formatDate, formatPercent functions

## 5. Update existing pages
- Update history and transactions pages to use new components
- Remove duplicated code
- Ensure proper prop passing and event handling
# UI Knowledge

## Etherpad Integration
- Each ledger uses padm.us instance
- Pad names prefixed with "yl-"
- Updates trigger balance recalculation
- Full screen mode available via URL parameter

## Balance Display
- Shows current balance for each user
- Updates via long-polling
- Negative amounts = money owed
- Positive amounts = money owed to you

## Page Components
- Etherpad iframe for editing
- Balance display section
- Refresh button
- Navigation links
  - Full Screen
  - Transactions
  - Sandbox
  - CSV Export

## Transaction History
- Sortable by date/amount
- Filtered per user
- Shows running balance
- Available in HTML and CSV formats

## Refresh Mechanism
- Manual refresh via button
- Automatic refresh on detected changes
- Uses long-polling for efficiency
- Shows loading spinner during updates
# Mathematica Code Knowledge

## Core Scripts
### ledger.m
- Main processing script
- Parses ledger files
- Calculates current balances with interest
- Generates balance and transaction files

### nightly.m
- Runs nightly via cron
- Updates all user transaction histories
- Processes list of ledgers from ledgers.txt
- Takes about 5 minutes per ledger

## Interest Calculation
- Interest rates defined in ledger files
- Format: `irate[YYYY.MM.DD] = rate`
- Rates compound continuously
- New rates take effect from specified date
- Historical rates preserved for accurate calculations

## Date Handling
Special date values:
- `LAST` - Process through last transaction
- `TODAY` - Process through noon today
- Dates formatted as YYYY.MM.DD

## Error Handling
- Invalid transactions are skipped
- Parse errors reported in balance output
- Missing files create default empty states
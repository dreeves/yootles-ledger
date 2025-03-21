# Yootles Knowledge

## Overview
- Financial ledger system for tracking IOUs and loans between friends/family
- Originally written in Scheme (2005), now PHP/JavaScript/Mathematica
- Uses etherpad for collaborative editing of ledgers

## Architecture
- Each ledger stored as text file with `.txt` extension
- Mathematica scripts process ledger files to compute balances
- Long-polling system for real-time balance updates
- Data stored in `/data` directory (gitignored)

## Key Files
- `ledger.m` - Main Mathematica script for processing ledgers
- `nightly.m` - Updates transaction histories for all users nightly
- `longpolling.php` - Handles real-time updates
- `template-snapshot.txt` - Template for new ledgers

## File Format
Ledger files contain:
- Account definitions: `account[id, "Name", "email"]`
- Transactions: `iou[YYYY.MM.DD, amount, from, to, "description"]` 
- Settings section with interest rates
- Optional notes section after `[MAGIC_LEDGER_END]`

## Development
- Run `./deploy.sh` to deploy to yootles.com
- Files in `/data` are gitignored
- Interest rates can be changed by adding new `irate[]` entries

## URLs
- `yootles.com/foo` - View ledger named "foo"
- `yootles.com/foo/transactions` - Transaction history
- `yootles.com/foo-transactions.csv` - CSV export

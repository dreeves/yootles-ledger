# Yootles

Yootles is a financial ledger system for tracking IOUs and loans between friends and family. Originally written in Scheme around 2005, it now uses PHP, JavaScript, and Mathematica to provide a collaborative ledger system with automatic interest calculations.

[Historical README](./README.historical.md)

## Features

- Collaborative ledger editing via Etherpad
- Real-time balance updates
- Automatic interest calculations
- Per-user transaction histories
- CSV export of transactions
- Multiple interest rate support
- Full transaction history view

## System Requirements

- PHP web server
- Mathematica (for ledger processing)
- Access to padm.us (for Etherpad integration)

## File Structure

- `ledger.m` - Main Mathematica script for processing ledgers
- `nightly.m` - Updates transaction histories nightly
- `ledger.php` - Main ledger view handler
- `yootles.php` - Ledger processing endpoint
- `longpolling.php` - Real-time update handler
- `yootles.js` - Client-side JavaScript
- `ledger.css` - Styles
- `template-snapshot.txt` - Template for new ledgers

## Ledger Format

```scheme
; Example ledger format
account[ali, "Alice", "alice@example.com"]
account[bob, "Bob", "bob@example.com"]

iou[2023.12.25, 1000, ali, bob, "Christmas loan"]

irate[2023.01.01] = .05  ; 5% interest rate
```

## URL Structure

- `/{ledger}` - View a ledger
- `/{ledger}/transactions` - View transaction history
- `/{ledger}.csv` - Download CSV of transactions
- `/{ledger}/{user}` - View user's transaction history

## Deployment

Use the deploy script to update the live site:

```bash
./deploy.sh
```

## Cron Setup

Required cron entries for nightly updates:

```cron
00 6 * * * $HOME/prj/yootles/fetchlist.m
05 6 * * * $HOME/prj/yootles/nightly.m
```

## Documentation

Additional documentation available in knowledge files:
- `knowledge.md` - Overview and core concepts
- `knowledge.data.md` - Data storage and file formats
- `knowledge.mathematica.md` - Mathematica processing details
- `knowledge.api.md` - API endpoints and routing
- `knowledge.ui.md` - UI components and behavior

## Authors

- Bethany Soule - Original co-author (Scheme version)
- Daniel Reeves - Original co-author and maintainer

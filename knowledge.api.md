# API Knowledge

## URL Routing (.htaccess)
- `/ledger/{name}` → `ledger.php?ledg={name}`
- `/{name}` → `ledger.php?ledg={name}`
- `/{name}/transactions` → `data/{name}-transactions.html`
- `/{name}/{user}` → `data/{name}-{user}.txt`
- `/{name}.csv` → `data/{name}.csv`

## Long-polling System
- Client polls server every 5 seconds
- Server holds request until changes detected
- Changes trigger all connected clients to update
- Implemented in longpolling.php

## Balance Updates
1. Client requests balance refresh
2. Server runs ledger.m
3. Results written to balances.txt
4. Long-polling notifies all clients
5. Clients fetch new balances

## Error States
- Missing files create default empty states
- Parse errors shown in balance display
- Network timeouts retry automatically
- Invalid ledger names show template
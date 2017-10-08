# Yootles

The good old Yootles ledgers.
Bethany Soule and I originally wrote this in Scheme around 2005:
We continue to use it extensively for friends&family accounting and loans.

<pre>
; Financial Ledger is a list of transactions where each transaction is a
; 3-element list: (amount date description)
; amount is a number -- positive means an IOU from danny to bee; neg = B->D
; date is a 3 element list of numbers (year month day)
; description is a string
</pre>

Cron entries for updating every user's personal transaction histories nightly:

<pre>
00 6 * * * $HOME/prj/yootles/fetchlist.m
05 6 * * * $HOME/prj/yootles/nightly.m
</pre>


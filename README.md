# Yootles

The good old Yootles ledgers.
Bethany Soule and I originally wrote this in Scheme around 2005:

<pre>
; Financial Ledger is a list of transactions where each transaction is a
; 3-element list: (amount date description)
; amount is a number -- positive means an IOU from danny to bee; neg = B->D
; date is a 3 element list of numbers (year month day)
; description is a string
</pre>

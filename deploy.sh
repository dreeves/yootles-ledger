#!/bin/sh
# This is entirely idiosyncratic to dreeves's setup.
# The alias 'y' is defined in ~/.ssh/config to point to yootles.com

ssh y 'cp /var/www/html/kibotzer/ledger.m \
          /var/www/html/kibotzer/tmp'

scp ledger.m        y:/var/www/html/kibotzer
scp yootles.php     y:/var/www/html/kibotzer
scp ledger.php      y:/var/www/html/yootles
scp yootles.js      y:/var/www/html/yootles
scp longpolling.php y:/var/www/html/yootles

<?php

$ledg = $_REQUEST['ledger'];

if(!isset($ledg)) {
  header('Location: http://yootles.com/');
  exit(0);
}

header('Content-type: text/plain');
echo `/usr/local/bin/mash ledger.m $ledg`;

?>

<?php

$ledg = $_REQUEST['ledger'];

if(!isset($ledg)) {
  header('Location: http://yootles.com/');
  exit(0);
}

header('Content-type: text/plain');
echo `/usr/local/bin/mash ledger.m $ledg`;

#echo "BEGINYOOTLECHUNK[addendum.txt]\n";
#echo $addendum;
#echo "ENDYOOTLECHUNK[addendum.txt]\n";

#echo "BEGINYOOTLECHUNK[${ledg}MAGICDASHbalancesMAGICDOTtxt]\n";
#echo file_get_contents("yoodat/$ledg-balances.txt");
#echo "\nENDYOOTLECHUNK[${ledg}MAGICDASHbalancesMAGICDOTtxt]\n";

#echo "BEGINYOOTLECHUNK[${ledg}MAGICDASHsnapshotMAGICDOTtxt]\n";
#echo file_get_contents("yoodat/$ledg-snapshot.txt");
#echo "\nENDYOOTLECHUNK[${ledg}MAGICDASHsnapshotMAGICDOTtxt]\n";

#echo "BEGINYOOTLECHUNK[${ledg}MAGICDASHtransactionsMAGICDOTcsv]\n";
#echo file_get_contents("yoodat/$ledg-transactions.csv");
#echo "\nENDYOOTLECHUNK[${ledg}MAGICDASHtransactionsMAGICDOTcsv]\n";

#echo "BEGINYOOTLECHUNK[${ledg}MAGICDASHtransactionsMAGICDOThtml]\n";
#echo file_get_contents("yoodat/$ledg-transactions.html");
#echo "\nENDYOOTLECHUNK[${ledg}MAGICDASHtransactionsMAGICDOThtml]\n";

#echo "BEGINYOOTLECHUNK[netbalMAGICDOTmma]\n";
#echo file_get_contents("yoodat/netbal.mma");
#echo "\nENDYOOTLECHUNK[netbalMAGICDOTmma]\n";

# OLD BEEBRAIN STUFF FOR REFERENCE:
#unlink("nonce/$slug.json");
#file_put_contents("nonce/$slug.bb", "{\"params\":$params, \"data\":$data}");
#while(!file_exists("nonce/$slug.json")) sleep(1);
##header('Content-type: text/json');
#echo file_get_contents("nonce/$slug.json");

?>

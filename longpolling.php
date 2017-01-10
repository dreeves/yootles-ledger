<?php

# (over)write file with contents, locking the file while doing so.
# just barf and die if there's an error.
function update($file, $contents)
{
  $f = fopen($file, 'w');
  if(!$f) { echo "ERROR1"; exit; } # couldn't open file for writing.
  if(!flock($f, LOCK_EX)) { echo "ERROR2"; exit; } # couldn't get lock.
  fwrite($f, $contents);
  fclose($f);  # this also releases the lock.
  return $contents;
}
  
# fetch the contents of the given file.
# if the file doesn't exist, create it with contents "[error...]"
function fetch($file)
{
  if(file_exists($file)) {
    if(!is_readable($file)) { echo "ERROR3"; exit; }
    $x = file_get_contents($file);
  } else {
    $x = "[error: file $file did not exist]";
    update($file, $x);
  }
  return $x;
}

# get the file modification time, carefully
function carefulfmt($file)
{
  if(!file_exists($file) || !is_readable($file)) { return -1; }
  clearstatcache(); # otherwise filemtime() results are cached!
  return filemtime($file);
}

$poll = $_GET['p'];
$ledg = preg_replace('/\//', '', $_GET['u']); 
#echo "[DEBUG: p=$poll, u=$ledg]\n";
$file = "data/$ledg-balances.txt";

if ( $poll == "wait" ) { # reconnecting for poll
  $last = carefulfmt($file);
  do {  # wait until some other instance causes $file to change...
    sleep(5);
  } while(carefulfmt($file) == $last);
  echo fetch($file);
} else { # do the thing that makes $file change
  #$addendum = `/usr/local/bin/mash ledger.m $ledg`;
  $addendum = file_get_contents("http://kibotzer.com/yootles.php?ledger=$ledg");

  $yd = "http://kibotzer.com/yoodat/";
  file_put_contents("data/$ledg-balances.txt", 
    file_get_contents("$yd$ledg-balances.txt"));
  file_put_contents("data/$ledg-snapshot.txt", 
    file_get_contents("$yd$ledg-snapshot.txt"));
  file_put_contents("data/$ledg-transactions.csv", 
    file_get_contents("$yd$ledg-transactions.csv"));
  file_put_contents("data/$ledg-transactions.html", 
    file_get_contents("$yd$ledg-transactions.html"));
  file_put_contents("data/netbal.mma", 
    file_get_contents("${yd}netbal.mma"));

  #while(preg_match('/BEGINYOOTLECHUNK\[([^\[\]]*)\]/', $c, $m)) {
  #  $tag = trim($m[1]);
  #  preg_match("/BEGINYOOTLECHUNK\[${tag}\](.*)ENDYOOTLECHUNK\[${tag}\]/s", 
  #             $c, $m);
  #  $stuff = $m[1];
  #  $c = preg_replace("/BEGINYOOTLECHUNK\[${tag}\]/", '', $c, 1);
  #  $tag = preg_replace('/MAGICDASH/', '-', $tag);
  #  $tag = preg_replace('/MAGICDOT/', '.', $tag);
  #  file_put_contents("data/$tag", $stuff);
  #  if($tag == "addendum.txt") $addendum = $stuff;
  #  if($tag == "$ledg-balances.txt") $contents = $stuff;
  #}

  #file_put_contents($file, "dreeves is migrating the ledgers; stand by!");
  $contents = fetch($file);
  echo update($file, $contents . $addendum); # append ledger.m's stdout to $file
}

?>

<?php 
$ledg = $_REQUEST['ledg'];
$padurl = "http://pad.beeminder.com/yl-$ledg?useMonospaceFont=true&showControls=false&showChat=false&showLineNumbers=true";
$snap = file_exists("data/$ledg-snapshot.txt");
$balfile = "data/$ledg-balances.txt";

echo <<<_END
<html><head><title>Ledger: $ledg</title>
<base href="/" />
<link rel="stylesheet" type="text/css" href="/ledger.css" />
<link rel="shortcut icon" type="image/icon" href="/favicon.ico" />
<script type="text/javascript" src="/jquery.js"></script>
<script type="text/javascript" src="/yootles.js"></script>
</head><body>

<div id="yltop">
  <h3>
  <a href="$padurl">Full Screen</a>
  &nbsp;&nbsp;&nbsp;&#8226;&nbsp;&nbsp;&nbsp;
  <a href="/$ledg/transactions">Transactions</a> 
  (<a href="/$ledg-transactions.csv">CSV</a>)
  &nbsp;&nbsp;&nbsp;&#8226;&nbsp;&nbsp;&nbsp;
_END;
if($ledg == "test") echo "[This is the Sandbox]";
else echo '<a href="/test">Sandbox</a>';
echo <<<_END
  &nbsp;&nbsp;&nbsp;&#8226;&nbsp;&nbsp;&nbsp;
  <input type="button" id="btnSubmit" value="Refresh Balances" 
         style="padding:0px;" />
  </h3>
  <div id="response">
_END;

if(!$snap) {
  echo <<<_END
<h3>To create a ledger here, paste into the etherpad the template for the ledger below. 
Then click "Refresh Balances" above.</h3>
_END;
} elseif(!file_exists($balfile) || !is_readable($balfile)) {
  echo "<pre>[No balances have been computed for $ledg]<pre>\n";
} else { include $balfile; }

echo <<<_END
  </div>
</div>
<div class="spacer"></div>
<div id="ep">
  <iframe src="$padurl"></iframe>
</div>
<div id="static">
_END;

if($snap) {
  echo <<<_END
<h3>Snapshot of ledger from the last time balances were computed:</h3>
_END;
} else {
  echo <<<_END
<h2>Copy the text below into the etherpad above to start a new ledger here.</h2>
_END;
}
echo <<<_END
  <textarea readonly rows=50 cols=100>
_END;

if($snap) {
  include "data/$ledg-snapshot.txt"; 
} else {
  include "data/template-snapshot.txt";
}

echo <<<_END
  </textarea>
</div>
</body></html>
_END;

?>

#!/Applications/Mathematica.app/Contents/MacOS/MathematicaScript -script 
(* Takes (or fetches) a list of ledgers and updates all the individualized
transaction histories. I generally cron this nightly from my laptop. *)
(* Me in 2017: why the heck don't we do this every time the balances are 
refreshed? Maybe it's slow doing it brute force like this, sifting through
all the transactions again and again for each account on the ledger. *)

baseurl = "http://yootles.com";
rpath = "y:/var/www/html/yootles/data/";
lpath = "~/tmp/";

(* Numeric InputForm: show as a decimal number, and on one line. *)
ni[x_InputForm] := x  (* do nothing if already InputForm *)
ni[x_] := Which[ IntegerQ[x], x,
                 NumericQ[x], InputForm[N[x]],
                 StringQ[x],  x,
                 True,        InputForm[x] ]
ni[x_String, _] = x;
ni[x_, decplaces_] := InputForm[N[Round[x*10^decplaces]/10^decplaces]]

(* Returns a string in TableForm. Handy for outputting tables in scripts. *)
table[t_] := StringReplace[ToString[TableForm[ni/@#&/@t]], "\n\n"->"\n"]


If[Length@ARGV > 1,
  ledgers = Rest@ARGV;
,
  (* system["~/prj/yootles/fetchlist.m"]; *)
  ledgers = Import["~/prj/yootles/ledgers.txt", "Lines"];
];

prn["Ledgers to process:\n  ", ledgers, "\n"];

go[ldg_] := Module[{procAcct, data, roster, n, t},
  data = Quiet[Import[baseurl<>"/data/"<>ldg<>"-transactions.csv"]];
  If[data === $Failed || Length@First@data < 7, roster = {},
    roster = Take[First@data, {7, -1}]];
  prn[baseurl,"/",ldg," -----------------------------------------------------"];
  each[p_, roster, (* for each person p on the roster for ledger ldg *)
    pr[baseurl,"/data/", ldg, "-", p, ".txt  "];
    t = data;
    n = Position[First@t, p][[1,1]];
    t = (#1[[{4, 1, 2, 3, 5, n}]]&) /@ t;
    t = (MapAt[ni[#, 2]&, #, {{2}, {6}}]&) /@ t; (* amt & balance *)
    t = Select[t, #[[3]]==p || #[[4]]==p &];
    PrependTo[t, {"Date", "Amount", "From", "To", "Reason", "Balance"}];
    Export[cat[lpath, p, ""], table@t, "Text"];
    system["scp ", lpath, p, " ", rpath, ldg, "-", p, ".txt"];
  ]]

start = AbsoluteTime[]; 
go /@ ledgers; 
prn["DONE in ", (AbsoluteTime[] - start)/60., " minutes."];

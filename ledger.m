#!/usr/bin/env mash
(* Daniel Reeves, 2006 June
   This is the heart of the ledger program.
   It reads the raw text of a ledger (the name of the ledger is given as a 
     command line parameter) and computes balances and an atomized list of 
     transactions.
   It also updates a file giving everyone's net balances across all ledgers.

   The input of this program is specified in CONSTANTS.
   It creates (or overwrites) multiple files, also specified in CONSTANTS,
   which show balances and lists of transactions in both html and csv.
   It also writes to stdout.
   (Anything that should be evaluated as part of the ledger but that shouldn't
   be shown on the public ledger itself can go in a secret file, also 
   specified in CONSTANTS, which gets eval'd before the ledger contents.
   PS: That was a dumb idea and basically never used.)
   The web interface appends the stdout from this program to the 
   contents of outFile and displays that on the main page for the ledger.
   Note that the stdout from this program can include print statements 
   in the ledger contents itself (since it's eval'd).

   Special syntax and macros:
   * YYYY.MM.DD dates are globally macro-expaneded to Mathematica's {YYYY,MM,DD}
     syntax by a pre-processor
   * TODAY is a macro for today's date
   * LAST is the last logged transaction or today, whichever's later
   * iou or IOU
   * iouDaily, iouWeekly, iouBiweekly, iouMonthly, iouYearly
*)

(*************************** CONSTANTS ***********************************)

start = AbsoluteTime[];
If[Length[args] < 2,
  prn["USAGE: ",args[[1]]," name_of_ledger"];
  Exit[1]];
ledg       = args[[2]]; (* the name of the ledger to process *)
lpath      = "yoodat/";
lsrc       = "http://insecure.padm.us/yl-"<>ledg<>"/export/txt";
snapFile   = lpath<>ledg<>"-snapshot.txt";  (* snapshot of the ledger source *)
outFile    = lpath<>ledg<>"-balances.txt";  (* table that shows the balances *)
csvFile    = lpath<>ledg<>"-transactions.csv";
htmlFile   = lpath<>ledg<>"-transactions.html";
secretFile = lpath<>ledg<>"-secret.m";
netbalFile = lpath<>"netbal.mma"; (* net balances across all ledgers *)

secs["second"] = 1;
secs["minute"] = 60;
secs["hour"]   = 3600;
secs["day"]    = 24*secs["hour"];
secs["week"]   = 7*secs["day"];
secs["year"]   = 365.25*secs["day"]; 
secs["month"]  = secs["year"]/12;
(* Average length of a calendar year is 365.2425 days but the standard 
   definition of "a year" is a Julian year: 365.25 days.  That happens to be
   the average calendar year length for time periods between the years 2000 
   and 2100. *)

tf = {"Year","-","Month","-","Day","_","Time"}; (* date/time format *)
df = {"Year","-","Month","-","Day"};            (* date format *)


(********************* DEFAULT PARAMETER SETTINGS ************************)

irate[{1970,1,1}] = .05375;  (* Historical default interest rate = 5.375%. *)
compound = Infinity;  (* How many times to compound interest per year. *)

(* Being < this much in debt doesn't count as being negative. *)
negThresh = 25/100;  (* Not used in current implementation. *)

(* Says what date (timestamp) the balance should reflect. Check the balance 
   from any point in the past, see it as of right now, see how much interest 
   will accrue by any point in the future, or (the default) show what it will 
   be after the last logged transaction, or now, whichever's later. *)
asOf = {};


(************************* GLOBAL VARIABLES *************************)

rawdata = {};   (* transactions generated from iou[]'s *)
expdata = {};   (* transactions with repeating transactions expanded *)
allbal;         (* gives balances for every account on every ledger *)
netbal[_] = 0;  (* gives net balances accross ledgers *)
netbal0[_] = 0; (* netbal before processing this ledger *)
ird = {};       (* Interest Rate Dates -- the domain of irate; used by irt[] *)
outString = ""; (* collects the stuff that gets written to outFile *)


(*************************** FUNCTIONS ******************************)

(* Public functions, for use on the ledgers themselves:
     iou, account, wages, tr, Today, and MASH functions such as prn *)

(* Show Number.  Round to the nearest r. *)
Unprotect[Round];   Round[x_,0] := x;   Protect[Round];
shn[x_, r_:0] := StringReplace[ToString@Round[N@x,r], re@"\\.$"->""]
(* Show Money *)
shm[x_] := shn[x, .01]

(* Delta View: Show a number with a plus or minus (since it's a delta) *)
dv[x_, r_:.01] := If[Round[x,r]<=0,"","+"] <> shn@Round[x,r]

link[url_, text_] := cat["<a href=\"",url,"\">",text,"</a>"] 

(* Returns a string that is a table in html format. *)
htmlTable[tbl_, headers_, summary_:""] := Module[{htmlrow},
  htmlrow[l_] := cat["<tr>", cat@@(cat["<td>",#,"</td>"]& /@ l), "</tr>\n"];
  cat["<table border=\"1\" summary=\"", summary, "\">\n<tr><th>",
      cat@@Riffle[headers, "</th><th>"], "</th></tr>\n",
      cat@@(htmlrow /@ tbl), "</table>"]]

(* Returns a matrix with rows and columns labeled. Helper for textTable[]. *)
labelTable[m_, rl_, cl_] := Module[{mm = m, r = PadRight[rl, Length[m], ""]},
  PrependTo[mm, PadRight[cl, Length@First@m, ""]];
  PrependTo[r, ""];
  Transpose[Prepend[Transpose[mm], r]]]

(* Helper function for textTable[]. NB: table[t] equivalent to textTable[t]. *)
table[t_] := StringReplace[ToString[TableForm[shn/@#&/@t]], "\n\n"->"\n"]

(* Returns a string representation of a table, with optional row and 
   column labels.  Handy for outputting tables in scripts. *)
textTable[tbl_, rl_:{}, cl_:{}] :=
  Which[ rl==={} && cl==={}, table[tbl],
         rl==={},            table@Prepend[tbl,cl],
         cl==={},            table@Transpose@Prepend[Transpose[tbl], rl],
         True,               table@labelTable[tbl,rl,cl] ]

lockFile[filename_String] := Module[{returnVal},
  returnVal = system["/usr/bin/lockfile ", filename, ".lock"];
  If[returnVal=!=0, perr["WARNING: lockfile didn't work.\n"]];
  returnVal
]

unlockFile[filename_String] := DeleteFile[filename<>".lock"]


(* Pre-out: for output sent to outFile.  If prout is used on the ledger 
   it will appear before output generated here.  Stdout output appears after. 
   The real reason to have prout is that stdout doesn't work if there's a 
   syntax error in the ledger -- even if the syntax error is caught with 
   SyntaxQ!  (Would $SyntaxHandler help here?  Probably not.)
   But it also has the nice feature that we can append custom output with 
   normal print statements on the ledger (without making sure to eval the 
   ledger only after all print statements here). *)
prout[stuff__] := (outString = cat[outString, stuff])

(* Convert from date to absolute seconds *)
fd[{y_, m_:6, d_:15, h_:12, mn_:0, s_:0}] := FromDate[{y,m,d,h,mn,s}]
fd[ y_, m_:6, d_:15, h_:12, mn_:0, s_:0 ] := FromDate[{y,m,d,h,mn,s}]
fd[x_] := x;  (* if it's already in absolute seconds, leave it *)

(* Convert from absolute seconds to date *)
td[x_?NumericQ] := ToDate[x]
td[x_]          := x;  (* if it's already a date, leave it *)

(* Note: to fill in the defaults for a date, eg, {2007,9} -> 
   {2007,9,15,12,0,0} use td@fd[{2007,9}]. *)

TODAY = fd@Take[td@start,3];  (* noon today *)
LAST = INDEFINITE = {};

(* Official version of this is now on mma pad *)
(* Returns, as a date, x (given as either timestamp or date) plus amount of 
   time d (given in the specified units).  If the unit is "month" then,
   for example {2008,2,1,12,00} plus one month yields {2008,3,1,12,00}, ie, 
   the common meaning of adding an integer number of months to a date.
   Similarly for adding an integer number of years.  If you don't want that,
   specify d as like 3.0 instead of 3 the integer. *) 
dPlus[x_, d_]           := td[fd@x + d]
dPlus[x_, d_, "second"] := dPlus[x, d]
dPlus[x_, d_, "day"]    := dPlus[x, d*secs["day"]]
dPlus[x_, d_, "week"]   := dPlus[x, d*secs["day"]*7]
dPlus[x_, d_, "month"]  := dPlus[x, d*secs["year"]/12]
  
dPlus[x_?NumberQ, d_Integer, "month"] := Module[{x0 = td@x, y, m, rest},
  {y, m} = Take[x0, 2];  rest = Drop[x0, 2];
  {y + Quotient[m+d, 12], Mod[m+d, 12], Sequence@@rest}]
dPlus[x_List, d_Integer, "month"] := 
  {x[[1]]+Quotient[x[[2]]+d,12], Mod[x[[2]]+d,12], Sequence@@Drop[x,2]}
  
dPlus[x_, d_, "year"] := dPlus[x, d*12, "month"]

(* helper function for repeat[] *)
repeatBrute[a_,b_,r_, u_] := Most[NestWhileList[dPlus[#,r,u]&, a, fd@#<=fd@b&]]

(* A list of dates starting with date a and repeating every r amount of time
   (measured in units ru), not exceeding date b. *)
repeat[a_,b_,r_, u_]      := td /@ Range[fd@a, fd@b, r*secs@u]
repeat[a_,b_,r_, "month"] := repeatBrute[a,b,r,"month"]
repeat[a_,b_,r_, "year"]  := repeatBrute[a,b,r,"year"]
  
(* Takes an element x and a sorted list, 
   returns the biggest element of list strictly less than x. *)
pigeon[x_, {}]           := Null
pigeon[x_, {a_}]         := If[x<=a, Null, a]
pigeon[x_, {a_,b_,c___}] := If[x<=a, Null, If[x<=b, a, pigeon[x,{b,c}]]]

(* The interest on principle p at annual rate r, compounded n times per year
   over time t (in years). *)
pert[p_,r_,t_,n_:Infinity] := p * If[n==Infinity, Exp[r*t]-1, (1+r/n)^(n*t)-1]

(* Interest rate as a function of timestamp instead of date. 
   ird is a global variable, computed from the domain of irate in crunch[]. *)
irt[t_] := irateTime[pigeon[fd@t, Sort[fd/@ird]]]

(* The default name for a tag if no account was specified for it. *)
name[tag_] := "UNKNOWN ACCOUNT " <> ToString[tag]

accountQ[_] = False;
email[a_] := cat[a,"@",ledg,".yootles.com"]

(* Should Protect[tag] so you can't assign it as a constant or anything *)
(* check out how I detect symbol collisions in bracketology *)
SetAttributes[account, HoldFirst];
account[tag_, nm_:"", eml_:"", ac_:True] := 
  (If[ValueQ[tag] || !MatchQ[tag,_Symbol], 
     prout["WARNING: invalid account name: ", HoldForm[tag], "\n"]];
   accountQ[tag] = ac;
   name[tag] = If[nm==="", ToString[tag], nm]; 
   If[eml=!="", email[tag] = eml];
   0)
acct = account;  (* alias *)

(* atomize transforms a rawdata entry, which may indicate that it is to be
   repeated, or be to/from a list of accounts, to a list of IOU entries each in
   standard {amt,frm,to,when,why} form.  
   Whenever a repeating IOU has an explicit end date the last repeated payment 
   is prorated appropriately. 
   If an IOU is from, for example, alice+bob to bob then this will 
   generate IOUs from alice to bob and from bob to bob. *)
   
atomize[{x_, a_Times, stuff___}] := Module[{l},
  l = Select[Flatten[List@@a], Head[#]==Symbol&];
  Which[Length[l] == 1, atomize[{x,l[[1]], stuff}],
        True, prn["ERROR: bad 'from' entry: ", InputForm[a]]; Exit[1]]]

atomize[{x_, a_, b_Times, stuff___}] := Module[{l},
  l = Select[Flatten[List@@b], Head[#]==Symbol&];
  Which[Length[l] == 1, atomize[{x,a,l[[1]], stuff}],
        True, prn["ERROR: bad 'to' entry: ", InputForm[b]]; Exit[1]]]

atomize[{x_, a_Plus, stuff___}] := Module[{accts, coeffs, nrml},
  accts = Variables[a];
  coeffs = D[a, #]& /@ accts;
  nrml = coeffs/Total[coeffs];  (* fraction of x that each account PAYS *)
  Join@@MapThread[atomize[{x*#1,#2, stuff}]&, {nrml,accts}]]

atomize[{x_, a_, b_Plus, stuff___}] := Module[{accts, coeffs, nrml},
  accts = Variables[b];
  coeffs = D[b, #]& /@ accts;
  nrml = coeffs/Total[coeffs];  (* fraction of x that each account GETS *)
  Join@@MapThread[atomize[{x*#1,a,#2, stuff}]&, {nrml,accts}]]

atomize[{x_,a_Symbol,b_Symbol,d_,c_,rpt_,ru_,til_,s___}] := Module[{e,l,ld},
  If[rpt<0, {{x,a,b,d,c}},
    e = If[til===-1 || til==={}, asOf, fd@til];
    l = MapIndexed[{x,a,b,#1,cat["[",#2[[1]],"] ",c]}&, repeat[d,e,rpt,ru]];
    If[til===-1 || til==={}, l, 
      ld = l[[-1,4]];  (* last date of repeating payment *)
      Append[Most@l, {x*(e-fd@ld)/(fd@dPlus[ld,rpt,ru]-fd@ld), a, b, ld, 
                      cat["[",Length@l,",prorated] ",c]}]]]]

(* Assumes global rawdata. Compute:
     expdata, accounts, balance[], lastpos[], intRcvd[], netbal[], netbal0[] *)
crunch[] := Module[{trans,ntrans,dtrans, last,dummydates,ii,srtfun,ledglist},
  (* If asOf is a list, ie a date, change it to a timestamp. *)
  If[ListQ[asOf] && asOf =!= {}, asOf = fd@asOf];  
  (* Get the timestamp of the last explicit transaction. *)
  last = Max[Join[fd/@rawdata[[All,4]], fd/@rawdata[[All,8]]]];
  (* From now on, pretend that 'now' is asOf. *)
  If[!ValueQ[asOf] || asOf===lastTransOrNow || asOf==={}, 
    asOf = Max[last,TODAY]];
  trans = Join@@(atomize /@ rawdata); (* expand repeating transactions *)
  trans = Select[trans, fd[#[[4]]] <= asOf&]; (* filter out future trans *)
  (* Get dates that the interest rate changed. ird & irateTime are global. *)
  ird = Select[Cases[keys[irate], _List], fd[#] < asOf&];
  (* irateTime maps the boundary timestamps to the interest rate *starting*
     at that time.  irt[t] maps *any* timestamp t to the interest rate that
     was in effect up until time t. *)
  irateTime[Null] = 0;  
  (irateTime[fd[#]] = irate[#])& /@ ird;

  (* Dummy transactions now and when irate changes, if not already a 
     transaction at the same time. *)
  dummydates = Complement[Append[fd/@ird,asOf],  fd/@trans[[All,4]]];
  dtrans = ({0, intDummy, intDummy, #}& /@ dummydates);
  (* Normalized transactions, sorted by time: {amt, from, to, absSeconds} *)
  ntrans = Sort[{#1,#2,#3, fd[#4]}& @@@ Join[trans, dtrans], #1[[4]]<#2[[4]]&];
  (* Same for historical transactions. *)
  expdata = Sort[Join[{#1, #2, #3, td[#4], #5, irt[#4]}& @@@ trans, 
                      {#1, "", "", td[#4], "", irt[#4]}& @@@ dtrans],
                 fd[#1[[4]]] < fd[#2[[4]]]&];
                      
  Clear[balance, intRcvd, lastpos];
  balance[_] = 0;  (* each account's balance, including interest *)
  intRcvd[_] = 0;  (* the total interest each account has received *)
  lastpos[_] = asOf; (* when was the account last nonnegative? *)
  last = 0;  (* the timestamp of the previous transaction *)
  i = 1;
  each[{y_,from_,to_,t_}, ntrans,
    (* This might be slow; if the transaction is not a dummy transaction for 
       an interest rate change, we only actually have to do an interest 
       adjustment for from and to.  But then we'd have to have the last 
       timestamp depend on the person. *)
    If[balance[from] > -negThresh, lastpos[from] = t];
    If[balance[to] > -negThresh, lastpos[to] = t];
    cum = {}; 
    each[a_, Select[keys[balance], # =!= Blank[]&],
      ii = pert[balance[a],irt[t],(t-last)/secs["year"],compound];
      balance[a] += ii;  intRcvd[a] += ii;
      AppendTo[cum, {a, balance[a]}];
    ];
    last = t;  balance[from] -= y;  balance[to] += y;

    AppendTo[cum, {from, balance[from]}];
    AppendTo[cum, {to, balance[to]}];
    AppendTo[expdata[[i]], cum];
    i++;
  ];

  accounts = Select[keys[accountQ], accountQ];
  (* glean the accounts list from the transactions *)
  accounts = Union[accounts, Select[keys[balance], # =!= Blank[]&]];
  accounts = DeleteCases[accounts, intDummy];
  (* don't include accounts with zero balances unless explicitly added *)
  allaccts = accounts;
  accounts = Select[accounts, Abs[balance[#]]>=.01 || accountQ[#]&];
  srtfun[p_] := If[balance[p]==0, Infinity, balance[p]]; 
  accounts = Sort[accounts, srtfun[#1]<srtfun[#2]&];
  allaccts = SortBy[allaccts, If[balance[#]==0, Infinity, balance[#]]&];

  (* above only sets lastpos as late as the last transxn they were part of *)
  each[a_, accounts, If[balance[a] > -negThresh, lastpos[a] = asOf]];
  
  (* Compute net balances across ledgers... *)
  
  lockFile[netbalFile];
  If[FileInformation[netbalFile] =!= {}, Get[netbalFile]];
  allbal[_,_] = 0;
  
  (* Add up allbal across ledgers to compute netbal for each account *)
  ledglist = Union@keys[allbal, 2];
  each[a_, allaccts,  netbal0[a] = Total[allbal[email@a,#]&/@ledglist]];

  (* Reset allbal for accounts on this ledger *)
  Off[Unset::"norep"];
  each[a_, keys[allbal],  Unset[allbal[a,ledg]]];
  each[a_, allaccts,  allbal[email@a, ledg] += balance@a];

  If[FileInformation[netbalFile] =!= {}, DeleteFile[netbalFile]]; 
  Save[netbalFile, {allbal}]; (* Save appends so had to delete the file first *)
  unlockFile[netbalFile];

  (* Compute net balances again now that allbal incorporates this ledger *)
  each[a_, allaccts,  netbal[a] = Total[allbal[email@a,#]&/@ledglist]];
]

(* Amount that account a's balance has changed since the last time 
   net balances were computed. *)
delta[TOT] := Total[delta/@allaccts]
delta[a_] := netbal[a] - netbal0[a]


(* Parse dates and time ranges that Mathematica would normally treat as 
   expressions, like 2009-10-20 or 2009/10/20 or 0900-1700.
   This can't handle dates like 2009.10.20 because Mma pre-parses that 
   as two numbers multiplied together (2009.1 and .2) which means we can't
   distinguish, eg, .2 from .20.  $PreRead won't work because when you do 
   eval[theguts] it doesn't apply the $PreRead function to the contents of 
   the string theguts.  But of course we can do a normal StringReplace on
   theguts before we eval it.  So that's what we do, converting strings like 
   "2009.10.20" to "{2009,10,20}", globally.  (See bookmark01 below.)
   The only downside is that that dots-to-commas/braces transformation happens 
   everywhere in the ledger, even inside strings.  But of course what happens 
   in that preparsing stage doesn't affect the official text of the ledger
   anyway. 
   (Originally I used a more complicated regex to only replace dates if 
   surrounded by commas/brackets/arrows the way these things would be in the 
   function calls, but it was too much magic.  Better to just replace 
   consistently, which is already pushing it magic-wise.)
   Another thing: parse[] is not called on dates in other functions besides
     iou[], eg irate[], so it's probably better to just always use the 
     2009.10.20 format so that it gets converted to the standard mma format,
     {2009,10,20}, everywhere, thanks to the pre-parsing.  That would make this
     parse function moot for dates, but still needed for time ranges. *)
dashy[a_, b_, c_] := {a, -b, -c}
dashy[a_, b_] := tr[a, -b]
slashy[a_, b_, c_] := {a, b, c}
slashy[a__, pow[b_,-1]] := Flatten@{a, b}
SetAttributes[parse, HoldAll];
parse[x_] := Unevaluated[x] /. {Plus->dashy, Times->slashy, Power->pow}

(* Legacy version of the iou function with amount, from, to, date, comment
   instead of date, amount, from to, comment.
   Appends a transaction (or many repeating transactions) to rawdata.
   amt:  amount to transfer (if negative same as swapping frm & to);
   frm:  the accounts issuing the IOU;
   to:   the accounts receiving the IOU;
   when: the date of the IOU;
   why:  comments -- a string describing the IOU;
   rpt:  period (as op. to freq) for auto-repeat of this IOU (default: -1);
         may also be a string that includes units, like "2 week" or "2 weeks";
   ru:   repeat unit, one of {day, week, month, year};
   til:  end date for repeating IOUs (default: -1, meaning forever);
         no auto-repeats after this date (nb: if til > last 
         auto-repeat date, it makes the last auto-repeated IOU before 
         'til' be prorated. 
   grp:  the name of the ledger;
   cur:  currency (default: "ytl");
   id:   the ID of the IOU in the Yootles system; *)
SetAttributes[iouLeg, HoldAll];
Options[iouLeg] = {amt->Null, frm->Null, to->Null, when->Null, why->"",
                      rpt->-1, ru->"", til->-1,   grp->ledg, cur->ytl, id->-1 };
iouLeg[OptionsPattern[]] := Module[{o},
  o[x___] := OptionValue[x];
  If[StringQ[o@rpt] && o@ru === "", {o@rpt, o@ru} = First[
    StringReplace[o@rpt, re@"^([\\d\\.]*)\\s*(\\w*?)s?\\s*$"->{"$1","$2"}]]];
  If[StringQ[o@rpt], o@rpt = Replace[eval[o@rpt], Null->1]];
  (* More efficient would be Sow and then Flatten[Reap[eval[ledger]][[2]],1] *)
  (* NB: parse[o@when] doesn't work for hard-to-explain HoldForm-type reasons *)
  AppendTo[rawdata, {o@amt, o@frm, o@to, parse[OptionValue@when], o@why, 
                     o@rpt, o@ru, parse[OptionValue@til], o@grp, o@cur, o@id}];
  0]
iouLeg[x_,             o:OptionsPattern[]] := iouLeg[amt->x, o]
iouLeg[x_,a_,b_,       o:OptionsPattern[]] := iouLeg[x, frm->a, to->b, o]
iouLeg[x_,a_,b_,d_,    o:OptionsPattern[]] := iouLeg[x, a, b, when->d, o]
iouLeg[x_,a_,b_,d_,c_, o:OptionsPattern[]] := iouLeg[x, a, b, d, why->c, o]
iouLeg[___] := prn["ERROR iou-rpt: please tell dreeves <br>"]

IOU = iou;   (* an alias for iou *)
iou[amt_?NumericQ, rest___] := iouLeg[amt, rest]
iou[when_, amt_, frm_, to_, why_] := iouLeg[amt, frm, to, when, why]
iouDaily[s_,e_,x_,f_,t_,c_]    := iouLeg[x, f, t, s, c, rpt->"day",   til->e]
iouWeekly[s_,e_,x_,f_,t_,c_]   := iouLeg[x, f, t, s, c, rpt->"week",  til->e]
iouBiweekly[s_,e_,x_,f_,t_,c_] := iouLeg[x, f, t, s, c, rpt->"2week", til->e]
iouMonthly[s_,e_,x_,f_,t_,c_]  := iouLeg[x, f, t, s, c, rpt->"month", til->e]
iouYearly[s_,e_,x_,f_,t_,c_]   := iouLeg[x, f, t, s, c, rpt->"year",  til->e]

(* Converts a time range like tr[120,240] into a number of hours like 1.333 *)
tr[a_, b_] := Quotient[b,100] + Mod[b,100]/60 - Quotient[a,100] - Mod[a,100]/60

(* Generate an IOU for a bunch of work, typically a week.
   hours: a list of time ranges like 900-1700 (9am-5pm)
   frm: same as for IOU
   to: same as for IOU
   startdate: the date of the first time range.
     we assume that the money is owed in a continuous stream starting at 
     startdate and ending Length[hours] days later.
   why: same as for IOU.
   hourlyrate: amount owed would be this times total hours if not for overtime.
   fullday: number of hours in a standard workday (default: 8).
   otmult: overtime multiplier (eg, time-and-a-half = 3/2; default: 1).
   otagg: how many days to aggregate for computing overtime (default: All).
     eg, if you work 7 hours and then 9 hours, that's one hour of OT if
     otagg==1 but no overtime if otagg==2 since it's 16 hours in 2 days.
*)
SetAttributes[wages, HoldAll];
wages[hours_, frm_, to_, startdate_, why_, hourlyrate_, 
      fullday_:8, otmult_:1, otagg_:All] := Module[{h,d,a,actl,full,base,ot},
  h = parse[hours];
  d = td[fd@parse[startdate] + secs["day"]*(Length@h-1)/2];
      (* the real answer that will never matter: +Log[(Exp[r*t]-1)/r/t]/r *)
  a = If[otagg === All, Length@h, otagg];
  h = Partition[h, a, a, {1,1}, {}]; (* chunk it up *)
  actl = Total /@ h; (* actual hours worked in each chunk *)
  full = fullday*Length /@ h; (* maximum non-OT hours per chunk *)
  base = MapThread[Min, {actl, full}];
  ot = actl - base;
  iou[hourlyrate*Total@base + otmult*hourlyrate*Total@ot, frm, to, d, why]]

(* Some ledgers define the following functions as syntactic sugar for the 
   wages function above and it's ugly to also do the HoldAll thing on the 
   actual ledgers so we'll do it here.  It's on the magical side, yes. *)
SetAttributes[{i0, i1, i2, i3, i4, i5, i6, i7, i8, i9, io}, HoldAll];

SetAtributes[hoursminder, HoldAll];
hoursminder[yoog_, hourlyrate_, frm_, to_] :=
  iou[hourlyrate*10, frm, to, td@fd[{2015,05,26}], "hoursminder test"]


(**************************** MAIN **********************************)

preguts = If[FileExistsQ[secretFile], Import[secretFile, "Text"], ""];
theguts = Import[lsrc, "Text"];
theguts = StringReplace[theguts, "<script>" -> "<spamscript3>"];
snapStr = OpenWrite[snapFile]; WriteString[snapStr, theguts]; Close[snapStr];
theguts = StringReplace[preguts <> theguts,       (* see the parse[] function *)
  re@"(\\d{2,4})\\.(\\d{1,2})\\.(\\d{1,2})" -> "{$1,$2,$3}"];   (* bookmark01 *)

(* Only process ledger up to and not including the line with magic string. *)
(* See http://stackoverflow.com/questions/2257884/bug-in-mathematica-reg *)
theguts = StringReplace[theguts,
                        re@"(^|\\n)[^\\n]*MAGIC_LEDGER_END(?s).*$" -> ""];

If[!SyntaxQ[theguts],
  sln = SyntaxLength[theguts];
  prout["<pre>\nSYNTAX ERROR: ... ",
    StringTake[theguts, {Max[1,sln-20],Min[StringLength[theguts],sln+20]}],
    " ...\n</pre>\n"];
  tmpStr = OpenWrite[outFile]; WriteString[tmpStr, outString]; Close[tmpStr];
  Quit[1];
,
  eval[theguts];   (* EVAL THE LEDGER (including the secret preguts) *)
];

crunch[];  (* Computes balances; next GENERATE OUTPUT (table of balances)... *)
AppendTo[accounts, TOT];
netbal[TOT] = Total[netbal/@accounts];
intRcvd[TOT] = Total[intRcvd/@accounts];
name[TOT] = "[Totals]";
prout["<pre>\n",
  "AS OF ", DateString[asOf, df], " ", cat@@Table["-", {48}], " fresh@", 
  (* timezone hack cuz server is eastern time but soule-reeveses are pacific: *)
  DateString[start - 3*3600, {"Time"}], "\n",
  "Balances, Interest earned, Net across ledgers, Change since last refresh\n", 
  cat@@Table["-", {80}], "\n",
  table[labelTable[
    {shm@balance[#], 
     (*shn[(asOf-lastpos[#])/3600/24,.1],*) (* don't care about DaysNeg *)
     shm@intRcvd[#],
     (* Special case for Dave who didn't want his netbal shown *)
     (*shm@If[email[#]==="thecat@umich.edu",Indeterminate,netbal[#]],*)
     shm@netbal[#],
     dv@delta[#],
     If[#===TOT,name@#,link[cat[ledg,"/",#],name@#]]
    }& /@ accounts, 
    accounts, {"Balance", "Interest", "NetBal", "NetDelta", ""}]],
  "\n</pre>\n"];

tmpStr = OpenWrite[outFile]; WriteString[tmpStr, outString]; Close[tmpStr];

(* Create CSV and HTML files for transaction histories. *)

(* convert a hist transacation with cumulative balances *)
convertHist[{amt_,from_,to_,d_,why_,intr_,x_}] := Module[{cum},
  cum[_] = 0;
  Scan[(cum[#[[1]]] = shm[#[[2]]])&, x];
  {shm[amt], from, to, DateString[fd@d, df], StringReplace[why, "\n"->" "], 
   intr, Sequence@@(cum/@allaccts)}]

headers = Join[{"Amount", "From", "To", "Date", "Reason", "Rate"}, allaccts];
Export[csvFile, 
        Prepend[convertHist /@ expdata, headers] /. InputForm->Identity, "CSV"];

htmlStr = OpenWrite[htmlFile];
WriteString[htmlStr, "<html>\n"];
WriteString[htmlStr, "<head><base href=\"/\" /></head><body>\n"];
tmp = StringReplace[outFile, re@"^[^\\/]*\\/" -> ""]; (* unpathify *)
WriteString[htmlStr, "<!--#include file=\"", tmp, "\" -->\n"];
WriteString[htmlStr, htmlTable[Reverse[convertHist /@ expdata], headers,
                     "All transactions with cumulative balances"], 
                     "\n</body></html>"];
Close[htmlStr];

(* Generate a list of the accounts on this ledger and their balances...
Export["accounts.csv", 
  Prepend[{ledg, #, StringSplit[name[#]][[1]], name[#], email[#],
           cat[If[balance[#]>0,"+",""], shm@balance[#]],
           cat[If[netbal[#]>0,"+",""], shm@netbal[#]]}& /@ allaccts,
    {"ledger","username","firstname","wholename","email","balance","netbal"}] /.
      InputForm->Identity, "CSV"];
*)

  
(* SCRATCH... ****************************************************************

(* SCHEDULED FOR DELETION... 
(* Numeric InputForm: show as a decimal number, and on one line. *)
ni[x_InputForm] := x  (* do nothing if already InputForm *)
ni[x_] := Which[ IntegerQ[x], x,
                 NumericQ[x], InputForm[N[x]],
                 StringQ[x],  x,
                 True,        InputForm[x] ]
ni[x_String, _] = x;
ni[x_, decplaces_] := InputForm[N[Round[x*10^decplaces]/10^decplaces]]
*)

(* SCHEDULED FOR DELETION... 
iou[opts___Rule] := Module[{f},
  f@"rpt" = -1;    f@"ru" = "";       f@"til" = -1;
  f@"grp" = ledg;  f@"cur" = "ytl";   f@"id" = -1;
  (* each[a_->v_, {opts}, f@ToString@a = v]; *)
  Scan[(f@ToString@First@# = Last@#)&, {opts}];
  If[StringQ[f@"rpt"] && f@"ru" === "", {f@"rpt", f@"ru"} = First[
    StringReplace[f@"rpt", re@"^([\\d\\.]* TODO )\\s*(\\w*?)s?\\s*$"->{"$1","$2"}]]];
  (*prout["DEBUG: rpt: ", f@"rpt", ", ru: ", f@"ru", " <br>\n"];*)
  If[StringQ[f@"rpt"], f@"rpt" = Replace[eval[f@"rpt"], Null->1]];
  (* TODO: switch to Sow and Flatten[Reap[eval[ledger]][[2]],1] *)
  AppendTo[rawdata, {f@"amt", f@"frm", f@"to", f@"when", f@"why",
                     f@"rpt", f@"ru", f@"til", f@"grp", f@"cur", f@"id"}];
  0]
iou[x_, opts___Rule] := iou["amt"->x, opts]
iou[x_,a_,b_, opts___Rule] := iou[x, "frm"->a, "to"->b, opts]
iou[x_,a_,b_,d_, opts___Rule] := iou[x, a, b, "when"->d, opts]
iou[x_,a_,b_,d_,c_, opts___Rule] := iou[x, a, b, d, "why"->c, opts]
*)

(*  SCHEDULED FOR DELETION:
unixtm[-1] = -1;
unixtm[x_] := Round[fd@x - AbsoluteTime[{1970,1,1,0,0,0},TimeZone->0]]
unixtm[s_String] := unixtm[AbsoluteTime[DateList[s]]]

convertTej[{x_,a_,b_,d_,c_,r_,e_}] :=
  {ledg, x, a, b, unixtm[d], StringReplace[c, "\n"->" "], 
   Which[r==0, 0,
         r==12, "month", 
         r==52, "week", 
         True, cat[InputForm[1/r], " year"]],
   unixtm[e], "tbd", "ytl"}

Export["tej.csv",
  Prepend[convertTej /@ data, 
  {"ledger", "amt", "frm", "to", "when", "why", "rep", "end", "int", "cur"}], 
  "CSV"];
*)

(* DEPRECATED: repeat freq and end as positional arguments
iou[x_,a_,b_,d_,c_, 12, o___Rule] := iou[x,a,b,d,c, "rpt"->1, "ru"->"month", o]
iou[x_,a_,b_,d_,c_, 52, o___Rule] := iou[x,a,b,d,c, "rpt"->1, "ru"->"week", o]
iou[x_,a_,b_,d_,c_, r_, o___Rule] := iou[x,a,b,d,c, "rpt"->1/r,"ru"->"year", o]
iou[x_,a_,b_,d_,c_, 12, e_,o___Rule] := iou[x,a,b,d,c,"rpt"->1,"ru"->"month",o]
iou[x_,a_,b_,d_,c_, 52, e_, o___Rule] :=
                             iou[x,a,b,d,c, "rpt"->1, "ru"->"week", "til"->e, o]
iou[x_,a_,b_,d_,c_, r_, e_, o___Rule] := 
                           iou[x,a,b,d,c, "rpt"->1/r, "ru"->"year", "til"->e, o]
*)

(* DEPRECATED. should move to explicit options rpt and ru...
   We treat a frequency of 12 (monthly) and 52 (weekly) specially.  
   It repeats on the same day of the month or day of the week as the first IOU.
   If you don't want this, just use 12.0 or 52.0 instead of 12 or 52 (the 
   integers). *)

(* A list of dates starting with date a and repeating on the dth of every 
   deltath month, not exceeding date b, where d is the day in date a.  
   Every date uses the time of day from date a.
   Both a and b can be either dates or timestamps. *)
monthly[a_,b_, delta_:1] := Most[NestWhileList[mPlus[#,delta]&, a, fd@#<=fd@b&]]
  
yearly[a_,b_, delta_:1] := 
  Most[NestWhileList[dPlus[#,delta,"year"]&, a, fd@#<=fd@b&]]

(* A list of dates starting with date a and repeating n times per year,
   not exceeding date b. *)
nthly[a_, b_, n_] := td /@ Range[fd[a], fd[b], secs["year"]/n]

(* Return date d with explicit time or not, depending on what template t has. *)
(* SCHEDULED FOR DELETION *)
(* conform[d_, t_?NumberQ] := d
   conform[d_List, t_List] := Take[d, Max[3, Length@t]] *)
  
(* Returns, as a date, x (given as either timestamp or date) plus d months, 
   ie, the same day and time d months later. *)
mPlus[x_, d_:1] := dPlus[x, d, "month"]

*******************************************************************************)

(* Yootles Ledger Processing *)

(* Parser functions *)
parseAccount[s_] := Module[{parts},
  parts = StringCases[s, 
    RegularExpression["account\\[(.*?),\\s*\"(.*?)\"(?:,\\s*\"(.*?)\")?\\]"] -> 
    {"$1", "$2", "$3"}
  ];
  If[Length[parts] > 0,
    Association[
      "id" -> StringTrim[First[parts][[1]]],
      "name" -> First[parts][[2]],
      "email" -> If[Length[First[parts]] > 2 && First[parts][[3]] != "", 
                   First[parts][[3]], 
                   ""]  (* Default to empty string if no email *)
    ],
    Missing["InvalidFormat"]
  ]
];

parseTransaction[s_] := Module[{parts},
  parts = StringCases[s,
    RegularExpression["iou\\[(.*?),\\s*(.*?),\\s*(.*?),\\s*(.*?),\\s*\"(.*?)\"\\]"] ->
    {"$1", "$2", "$3", "$4", "$5"}
  ];
  If[Length[parts] > 0,
    Association[
      "date" -> First[parts][[1]],
      "amount" -> ToExpression[First[parts][[2]]],
      "from" -> StringTrim[First[parts][[3]]],
      "to" -> StringTrim[First[parts][[4]]],
      "description" -> First[parts][[5]]
    ],
    Missing["InvalidFormat"]
  ]
];

parseRate[s_] := Module[{parts},
  parts = StringCases[s,
    RegularExpression["irate\\[(.*?),\\s*(.*?)\\]"] ->
    {"$1", "$2"}
  ];
  If[Length[parts] > 0,
    Association[
      "date" -> First[parts][[1]],
      "rate" -> ToExpression[First[parts][[2]]]
    ],
    Missing["InvalidFormat"]
  ]
];

(* Balance calculation with interest *)
calculateBalances[accounts_, transactions_, rates_] := Module[
  {balances, currentRate = 0, sortedTransactions, sortedRates, 
   lastDate = "", applyInterest},
  
  (* Initialize balances *)
  balances = Association[Map[#["id"] -> 0 &, accounts]];
  
  (* Sort transactions and rates by date *)
  sortedTransactions = Sort[transactions, #1["date"] <= #2["date"] &];
  sortedRates = Sort[rates, #1["date"] <= #2["date"] &];
  
  (* Function to apply interest to all balances *)
  applyInterest[fromDate_, toDate_] := If[currentRate != 0,
    Scan[
      Function[id,
        balances[id] *= (1 + currentRate * 
          DateDifference[fromDate, toDate, "Year"])
      ],
      Keys[balances]
    ]
  ];
  
  (* Process all events chronologically *)
  Scan[
    Function[event,
      Which[
        (* Interest rate change *)
        MemberQ[rates, event],
          applyInterest[lastDate, event["date"]];
          currentRate = event["rate"];
          lastDate = event["date"],
        
        (* Transaction *)
        MemberQ[transactions, event],
          applyInterest[lastDate, event["date"]];
          balances[event["from"]] -= event["amount"];
          balances[event["to"]] += event["amount"];
          lastDate = event["date"]
      ]
    ],
    Sort[
      Join[sortedTransactions, sortedRates],
      #1["date"] <= #2["date"] &
    ]
  ];
  
  (* Return final balances with account details *)
  Map[
    Function[acct,
      Association[
        "id" -> acct["id"],
        "name" -> acct["name"],
        "balance" -> Round[balances[acct["id"]], 0.01],
        "currentRate" -> currentRate
      ]
    ],
    accounts
  ]
];

(* Calculate transaction history for a specific account *)
calculateHistory[account_, transactions_, rates_] := Module[
  {balance = 0, currentRate = 0, history = {}, lastDate = ""},
  
  (* Sort transactions and rates by date *)
  transactions = Sort[transactions, #1["date"] <= #2["date"] &];
  rates = Sort[rates, #1["date"] <= #2["date"] &];
  
  (* Process each transaction *)
  Scan[
    Function[tx,
      (* Update balance based on transaction *)
      balance += Which[
        tx["from"] == account["id"], -tx["amount"],
        tx["to"] == account["id"], tx["amount"],
        True, 0
      ];
      
      (* Add to history if account involved *)
      If[tx["from"] == account["id"] || tx["to"] == account["id"],
        AppendTo[history, 
          Association[
            "date" -> tx["date"],
            "amount" -> If[tx["from"] == account["id"], 
                         -tx["amount"], 
                         tx["amount"]],
            "balance" -> Round[balance, 0.01],
            "description" -> tx["description"],
            "otherParty" -> If[tx["from"] == account["id"], 
                             tx["to"], 
                             tx["from"]]
          ]
        ]
      ]
    ],
    transactions
  ];
  
  (* Return transaction history *)
  Association[
    "account" -> account["id"],
    "transactions" -> history,
    "currentBalance" -> Round[balance, 0.01],
    "lastUpdated" -> DateString[]
  ]
];

(* Main processing function *)
processLedger[ledgerText_] := Module[{lines, accounts, transactions, rates},
  lines = StringSplit[ledgerText, "\n"];
  
  accounts = DeleteCases[
    Cases[lines, 
      s_String /; StringMatchQ[s, RegularExpression["account\\[.*\\]"]] :>
      parseAccount[s]
    ],
    Missing["InvalidFormat"]
  ];
  
  transactions = DeleteCases[
    Cases[lines,
      s_String /; StringMatchQ[s, RegularExpression["iou\\[.*\\]"]] :>
      parseTransaction[s]
    ],
    Missing["InvalidFormat"]
  ];
  
  rates = DeleteCases[
    Cases[lines,
      s_String /; StringMatchQ[s, RegularExpression["irate\\[.*\\]"]] :>
      parseRate[s]
    ],
    Missing["InvalidFormat"]
  ];
  
  (* Return response *)
  Association[
    "status" -> "success",
    "data" -> Association[
      "accounts" -> accounts,
      "transactions" -> transactions,
      "interestRates" -> rates,
      "balances" -> calculateBalances[accounts, transactions, rates],
      "summary" -> Association[
        "accountCount" -> Length[accounts],
        "transactionCount" -> Length[transactions],
        "rateCount" -> Length[rates]
      ]
    ],
    "timestamp" -> DateString[]
  ]
];

(* Deploy the API endpoints *)
CloudDeploy[
  APIFunction[
    {"ledger" -> "String"},
    processLedger[#ledger] &,
    "JSON"
  ],
  "yootles/processLedger"
];

CloudDeploy[
  APIFunction[
    {"ledger" -> "String", "accountId" -> "String"},
    Module[{result = processLedger[#ledger]},
      If[result["status"] === "success",
        Module[{account = Select[result["data", "accounts"], #["id"] == #accountId &][[1]]},
          calculateHistory[
            account,
            result["data", "transactions"],
            result["data", "interestRates"]
          ]
        ],
        result
      ]
    ] &,
    "JSON"
  ],
  "yootles/getTransactionHistory"
]
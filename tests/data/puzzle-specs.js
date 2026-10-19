/* The puzzles as puzzlekit specs (node puzzlekit.js data/puzzle-specs.js --write PUZZLES). Each one was found by
   tests/minepuzzles.js in a bot game (mined: its seed) and checked by the search: one of your moves forces the goal,
   and the move a quick player makes does not. Seats: 0 you, 1 West, 2 East. */
'use strict';
module.exports = [
 {
  "id": "win-cheaply",
  "title": "Win cheaply",
  "kind": "puzzle",
  "teachers": {
   "west": "doc",
   "east": "gus"
  },
  "mined": 11412279,
  "dealer": 2,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "7H",
    "JD",
    "JS",
    "7C",
    "KS",
    "JC",
    "QD",
    "10H",
    "AS",
    "9S"
   ],
   [
    "KD",
    "AH",
    "QC",
    "9H",
    "AD",
    "10D",
    "8C",
    "8D",
    "AC",
    "KC"
   ],
   [
    "JH",
    "10S",
    "7S",
    "9D",
    "8H",
    "8S",
    "7D",
    "9C",
    "QS",
    "10C"
   ]
  ],
  "kitty": [
   "KH",
   "JK",
   "QH"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "7H",
     "7C",
     "10H"
    ]
   },
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "8C",
     "9H",
     "QC"
    ]
   },
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "7D",
     "8H",
     "9D"
    ]
   },
   {
    "type": "BID",
    "player": 0,
    "accept": false
   },
   {
    "type": "BID",
    "player": 1,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 2,
    "cards": [
     "7S"
    ]
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JC"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "KC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "9C"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "10C"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JD"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "QD"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "8D"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "KH"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "JH"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "9S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AH"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "8S"
   }
  ],
  "goal": {
   "type": "tricks",
   "min": 4
  },
  "prompt": "Win all 3 tricks left.",
  "lesson": "Win with the lowest card that still wins. The big ones keep their power.",
  "say": {
   "intro": [
    [
     "east",
     "Low spade. Worth a shot!"
    ],
    [
     "west",
     "Three spades, three tricks. Spend only what wins."
    ]
   ],
   "hint": [
    [
     "west",
     "Your smallest spade still beats {8S}."
    ]
   ],
   "failed": [
    [
     "west",
     "{QS} is still out. Your {JS} can't beat it later."
    ]
   ]
  }
 },
 {
  "id": "lost-trick",
  "title": "A lost trick",
  "kind": "puzzle",
  "teachers": {
   "west": "viv",
   "east": "tex"
  },
  "mined": 8909875,
  "dealer": 2,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "JS",
    "JH",
    "KH",
    "KC",
    "KS",
    "AD",
    "QH",
    "8C",
    "9D",
    "10S"
   ],
   [
    "9H",
    "8D",
    "KD",
    "10H",
    "QS",
    "7S",
    "JD",
    "JC",
    "7H",
    "7C"
   ],
   [
    "10D",
    "9S",
    "7D",
    "AH",
    "10C",
    "8S",
    "9C",
    "QC",
    "JK",
    "8H"
   ]
  ],
  "kitty": [
   "AS",
   "AC",
   "QD"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "8C",
     "9D",
     "10S"
    ]
   },
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "7S",
     "7C",
     "8D"
    ]
   },
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "7D",
     "8S",
     "8H"
    ]
   },
   {
    "type": "BID",
    "player": 0,
    "accept": false
   },
   {
    "type": "BID",
    "player": 1,
    "accept": false
   },
   {
    "type": "BID",
    "player": 2,
    "accept": false
   },
   {
    "type": "NAME",
    "player": 0,
    "suit": "H"
   },
   {
    "type": "EXCHANGE",
    "player": 1,
    "cards": [
     "JC",
     "QS"
    ]
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "AD"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "QD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "10D"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JS"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "7H"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "9S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "9C"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "KC"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "KD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "JK"
   }
  ],
  "goal": {
   "type": "tricks",
   "min": 3
  },
  "prompt": "Win 2 of the last 4 tricks.",
  "lesson": "A trick you can't win: throw your least useful card, and keep your trumps.",
  "say": {
   "intro": [
    [
     "east",
     "Joker! Beat that."
    ],
    [
     "west",
     "Nobody can. Don't feed it a trump."
    ]
   ],
   "hint": [
    [
     "west",
     "Throw the spade."
    ]
   ],
   "failed": [
    [
     "west",
     "A trump, gone for nothing."
    ]
   ]
  }
 },
 {
  "id": "which-king",
  "title": "Which King?",
  "kind": "puzzle",
  "teachers": {
   "west": "zen",
   "east": "kit"
  },
  "mined": 5908574,
  "dealer": 0,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "QD",
    "7S",
    "10H",
    "KD",
    "9H",
    "7D",
    "JC",
    "7H",
    "AC",
    "KH"
   ],
   [
    "8S",
    "AD",
    "8H",
    "KS",
    "7C",
    "JK",
    "10D",
    "JD",
    "QC",
    "JS"
   ],
   [
    "AH",
    "9S",
    "9C",
    "9D",
    "8D",
    "QH",
    "AS",
    "JH",
    "10C",
    "KC"
   ]
  ],
  "kitty": [
   "QS",
   "10S",
   "8C"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "7C",
     "8H",
     "10D"
    ]
   },
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "9S",
     "9C",
     "10C"
    ]
   },
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "7S",
     "7D",
     "JC"
    ]
   },
   {
    "type": "BID",
    "player": 1,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 2,
    "cards": [
     "8D"
    ]
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "9D"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "QD"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JS"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "QS"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "7H"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JK"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "AS"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "9H"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "KS"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "JH"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "10H"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "8S"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "QH"
   }
  ],
  "goal": {
   "type": "tricks",
   "min": 2
  },
  "prompt": "Win 2 of the last 3 tricks.",
  "lesson": "Count what is gone. A King whose Ace has been played is the top card of its suit.",
  "say": {
   "intro": [
    [
     "east",
     "No spades. Which card goes?"
    ],
    [
     "west",
     "Count the Aces. {AD} is gone. {AH} is not."
    ]
   ],
   "hint": [
    [
     "west",
     "Throw the King whose Ace is still out."
    ]
   ],
   "failed": [
    [
     "west",
     "{AH} was still out. That King could not win."
    ]
   ]
  }
 },
 {
  "id": "kings-pay",
  "title": "Kings pay",
  "kind": "puzzle",
  "teachers": {
   "west": "ace",
   "east": "lou"
  },
  "mined": 8173408,
  "dealer": 0,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "AD",
    "7S",
    "8S",
    "QC",
    "9C",
    "7D",
    "JC",
    "8H",
    "KD",
    "QD"
   ],
   [
    "QS",
    "AS",
    "9D",
    "JH",
    "KH",
    "10C",
    "10S",
    "JD",
    "KC",
    "7H"
   ],
   [
    "JS",
    "KS",
    "10D",
    "8C",
    "10H",
    "8D",
    "AC",
    "AH",
    "JK",
    "7C"
   ]
  ],
  "kitty": [
   "9S",
   "QH",
   "9H"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "9D",
     "10C",
     "10S"
    ]
   },
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "8D",
     "10D",
     "10H"
    ]
   },
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "7S",
     "7D",
     "8S"
    ]
   },
   {
    "type": "BID",
    "player": 1,
    "accept": false
   },
   {
    "type": "BID",
    "player": 2,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 0,
    "cards": [
     "8H"
    ]
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "KS"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "QD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "AC"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "9C"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "KC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "JS"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "9S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "QS"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "JK"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JC"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AS"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "AH"
   }
  ],
  "goal": {
   "type": "score",
   "min": 1
  },
  "prompt": "Score a point.",
  "lesson": "A King that wins a trick scores. An Ace scores nothing, so sometimes the Ace goes first.",
  "say": {
   "intro": [
    [
     "east",
     "My Ace. Sorry."
    ],
    [
     "west",
     "Aces don't pay, champ. Kings do."
    ]
   ],
   "hint": [
    [
     "west",
     "Throw the Ace."
    ]
   ],
   "failed": [
    [
     "west",
     "No King point. Keep the King, lose the Ace."
    ]
   ]
  }
 },
 {
  "id": "guard-the-suits",
  "title": "Guard the suits",
  "kind": "puzzle",
  "teachers": {
   "west": "mei",
   "east": "gus"
  },
  "mined": 11325170,
  "dealer": 0,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "AS",
    "10C",
    "10S",
    "AH",
    "7S",
    "7H",
    "8S",
    "7C",
    "AD",
    "QS"
   ],
   [
    "10H",
    "JC",
    "8C",
    "KD",
    "JK",
    "QC",
    "KS",
    "9S",
    "AC",
    "9H"
   ],
   [
    "QD",
    "JH",
    "7D",
    "JD",
    "8D",
    "KH",
    "JS",
    "9D",
    "KC",
    "10D"
   ]
  ],
  "kitty": [
   "9C",
   "8H",
   "QH"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "9S",
     "9H",
     "10H"
    ]
   },
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "JS",
     "KH",
     "KC"
    ]
   },
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "7H",
     "7C",
     "10C"
    ]
   },
   {
    "type": "BID",
    "player": 1,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 2,
    "cards": [
     "7D"
    ]
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "QC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "9C"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "7S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "8C"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "8D"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "8S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "9D"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "10S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "10D"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "QS"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JK"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "JH"
   }
  ],
  "goal": {
   "type": "tricks",
   "min": 2
  },
  "prompt": "Win 2 of the last 3 tricks.",
  "lesson": "Keep a guard in each suit they can lead. A card in a suit nobody else holds guards nothing.",
  "say": {
   "intro": [
    [
     "east",
     "Three Aces! Can't lose, ha!"
    ],
    [
     "west",
     "Nobody else holds a heart. Your {AH} guards nothing."
    ]
   ],
   "hint": [
    [
     "west",
     "Throw the heart."
    ]
   ],
   "failed": [
    [
     "west",
     "They led the suit you threw away."
    ]
   ]
  }
 },
 {
  "id": "bower-last",
  "title": "Bower last",
  "kind": "puzzle",
  "teachers": {
   "west": "mei",
   "east": "kit"
  },
  "mined": 1964912,
  "dealer": 1,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "7C",
    "8S",
    "QS",
    "AH",
    "JC",
    "AC",
    "8H",
    "7S",
    "AD",
    "9C"
   ],
   [
    "10S",
    "KC",
    "QD",
    "KS",
    "8C",
    "7H",
    "9S",
    "10H",
    "KD",
    "JS"
   ],
   [
    "JH",
    "10D",
    "9D",
    "8D",
    "7D",
    "QC",
    "JD",
    "9H",
    "QH",
    "KH"
   ]
  ],
  "kitty": [
   "AS",
   "JK",
   "10C"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "9H",
     "QC",
     "QH"
    ]
   },
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "7C",
     "8H",
     "9C"
    ]
   },
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "7H",
     "8C",
     "10H"
    ]
   },
   {
    "type": "BID",
    "player": 2,
    "accept": false
   },
   {
    "type": "BID",
    "player": 0,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 1,
    "cards": [
     "QD"
    ]
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "JH"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "AH"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "KS"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JS"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "7D"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "7S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "KC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "8D"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "AC"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "AD"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "KD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "9D"
   }
  ],
  "goal": {
   "type": "tricks",
   "min": 4
  },
  "prompt": "Win 2 of the last 3 tricks.",
  "lesson": "Lead a small trump to pull theirs. Save the Bower to beat their Ace at the end.",
  "say": {
   "intro": [
    [
     "east",
     "The Bower first? It's the big one."
    ],
    [
     "west",
     "{AS} is still out. Your Bower beats it, but only at the end."
    ]
   ],
   "hint": [
    [
     "west",
     "Lead your smallest trump."
    ]
   ],
   "failed": [
    [
     "west",
     "The Bower went early, and {AS} took a trick."
    ]
   ]
  }
 },
 {
  "id": "spend-their-trump",
  "title": "Spend their trump",
  "kind": "puzzle",
  "teachers": {
   "west": "doc",
   "east": "tex"
  },
  "mined": 8688143,
  "dealer": 1,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "AD",
    "JD",
    "9D",
    "JC",
    "AC",
    "7D",
    "10C",
    "7S",
    "10S",
    "8H"
   ],
   [
    "QC",
    "10H",
    "QS",
    "QD",
    "9H",
    "9S",
    "10D",
    "JK",
    "JH",
    "KD"
   ],
   [
    "7H",
    "QH",
    "7C",
    "AS",
    "8S",
    "KC",
    "AH",
    "JS",
    "8C",
    "KS"
   ]
  ],
  "kitty": [
   "8D",
   "9C",
   "KH"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "7H",
     "8S",
     "QH"
    ]
   },
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "7S",
     "8H",
     "10C"
    ]
   },
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "9H",
     "9S",
     "10H"
    ]
   },
   {
    "type": "BID",
    "player": 2,
    "accept": false
   },
   {
    "type": "BID",
    "player": 0,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 1,
    "cards": [
     "QC"
    ]
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "KS"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "10S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "QS"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "AH"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JC"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "KD"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JK"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "7C"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "7D"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "8D"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "8C"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "9D"
   }
  ],
  "goal": {
   "type": "tricks",
   "min": 3
  },
  "prompt": "Win 2 of the last 3 tricks.",
  "lesson": "Short on trump? Lead a side card they must trump. Then yours are the top two.",
  "say": {
   "intro": [
    [
     "east",
     "Trump 'em all!"
    ],
    [
     "west",
     "West holds three trumps, you two. Make West spend one."
    ]
   ],
   "hint": [
    [
     "west",
     "Lead the club."
    ]
   ],
   "failed": [
    [
     "west",
     "Trump for trump, West had one more."
    ]
   ]
  }
 },
 {
  "id": "joker-last",
  "title": "Joker last",
  "kind": "puzzle",
  "teachers": {
   "west": "vex",
   "east": "lou"
  },
  "mined": 3596226,
  "dealer": 0,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "QH",
    "JK",
    "KC",
    "7H",
    "8C",
    "7S",
    "AS",
    "KS",
    "QD",
    "7C"
   ],
   [
    "AC",
    "9H",
    "8H",
    "KH",
    "AH",
    "7D",
    "JH",
    "9S",
    "QC",
    "JD"
   ],
   [
    "10S",
    "10D",
    "QS",
    "10C",
    "8S",
    "KD",
    "AD",
    "9C",
    "JC",
    "9D"
   ]
  ],
  "kitty": [
   "JS",
   "10H",
   "8D"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "7D",
     "9S",
     "QC"
    ]
   },
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "9C",
     "9D",
     "10D"
    ]
   },
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "7H",
     "7S",
     "QH"
    ]
   },
   {
    "type": "BID",
    "player": 1,
    "accept": false
   },
   {
    "type": "BID",
    "player": 2,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 0,
    "cards": [
     "7C"
    ]
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "10C"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "8C"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "KD"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "QD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "AD"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "KS"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "8H"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JS"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "9H"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "8S"
   }
  ],
  "goal": {
   "type": "tricks",
   "min": 4
  },
  "prompt": "Win 2 of the last 3 tricks.",
  "lesson": "Lead the side card first. Once East spends a trump on it, your Ace and Joker take the rest.",
  "say": {
   "intro": [
    [
     "east",
     "Oh no. You have the Joker."
    ],
    [
     "west",
     "East has the Left Bower. Your Ace can't beat it. Read that."
    ]
   ],
   "hint": [
    [
     "west",
     "Lead the club."
    ]
   ],
   "failed": [
    [
     "west",
     "The Left Bower beat your Ace."
    ]
   ]
  }
 },
 {
  "id": "guard-your-king",
  "title": "Guard your King",
  "kind": "puzzle",
  "teachers": {
   "west": "ace",
   "east": "kit"
  },
  "mined": 1418501,
  "dealer": 0,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "10D",
    "9C",
    "8S",
    "JC",
    "QS",
    "KS",
    "7S",
    "KC",
    "QC",
    "JH"
   ],
   [
    "JS",
    "JD",
    "10H",
    "7D",
    "8C",
    "AD",
    "9S",
    "10S",
    "8H",
    "QD"
   ],
   [
    "QH",
    "7H",
    "KD",
    "7C",
    "9D",
    "AC",
    "AS",
    "10C",
    "KH",
    "8D"
   ]
  ],
  "kitty": [
   "9H",
   "AH",
   "JK"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "8C",
     "8H",
     "9S"
    ]
   },
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "7C",
     "8D",
     "9D"
    ]
   },
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "9C",
     "10D",
     "JH"
    ]
   },
   {
    "type": "BID",
    "player": 1,
    "accept": false
   },
   {
    "type": "BID",
    "player": 2,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 0,
    "cards": [
     "7S"
    ]
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "JD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "7H"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "9H"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "KD"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "8S"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "7D"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "KH"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JC"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "AS"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "QS"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "10S"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "QH"
   }
  ],
  "goal": {
   "type": "score",
   "min": 1
  },
  "prompt": "Score a point.",
  "lesson": "Keep a small card under a King. When the Ace comes, the small one goes, and the King wins later.",
  "say": {
   "intro": [
    [
     "east",
     "Which one do I throw?"
    ],
    [
     "west",
     "{AC} is still out. A King needs a guard, champ."
    ]
   ],
   "hint": [
    [
     "west",
     "Keep both clubs."
    ]
   ],
   "failed": [
    [
     "west",
     "Keep the King and its guard."
    ]
   ]
  }
 },
 {
  "id": "the-last-trump",
  "title": "The last trump",
  "kind": "puzzle",
  "teachers": {
   "west": "vex",
   "east": "doc"
  },
  "mined": 943361,
  "dealer": 2,
  "scores": [
   0,
   0,
   0
  ],
  "hands10": [
   [
    "8H",
    "AC",
    "8D",
    "10H",
    "8C",
    "7S",
    "JK",
    "9D",
    "JH",
    "AH"
   ],
   [
    "10C",
    "9C",
    "KD",
    "7H",
    "7C",
    "7D",
    "AD",
    "QC",
    "JD",
    "JS"
   ],
   [
    "KC",
    "JC",
    "KH",
    "9H",
    "QD",
    "9S",
    "KS",
    "10S",
    "QH",
    "AS"
   ]
  ],
  "kitty": [
   "10D",
   "QS",
   "8S"
  ],
  "script": [
   {
    "type": "DISCARD",
    "player": 0,
    "cards": [
     "7S",
     "8D",
     "8C"
    ]
   },
   {
    "type": "DISCARD",
    "player": 1,
    "cards": [
     "7H",
     "7D",
     "JD"
    ]
   },
   {
    "type": "DISCARD",
    "player": 2,
    "cards": [
     "9H",
     "QD",
     "QH"
    ]
   },
   {
    "type": "BID",
    "player": 0,
    "accept": true
   },
   {
    "type": "EXCHANGE",
    "player": 1,
    "cards": [
     "7C"
    ]
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "AC"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "9C"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "JC"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JH"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "10D"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "9S"
   },
   {
    "type": "PLAY",
    "player": 0,
    "card": "JK"
   },
   {
    "type": "PLAY",
    "player": 1,
    "card": "AD"
   },
   {
    "type": "PLAY",
    "player": 2,
    "card": "10S"
   }
  ],
  "goal": {
   "type": "tricks",
   "min": 6
  },
  "prompt": "Win 3 of the last 4 tricks.",
  "lesson": "Their last trump has to go first. Lead a winner they must trump, and your small cards are top.",
  "say": {
   "intro": [
    [
     "east",
     "You called. Prove it."
    ],
    [
     "west",
     "West has one trump left. Make it fall."
    ]
   ],
   "hint": [
    [
     "west",
     "Lead the Ace."
    ]
   ],
   "failed": [
    [
     "west",
     "Their trump was still there."
    ]
   ]
  }
 }
];

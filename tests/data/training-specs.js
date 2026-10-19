/* The training lessons as puzzlekit specs (node puzzlekit.js data/training-specs.js --json). The built puzzles are
   TRAINING in index.html; this file is the readable source. Seats: 0 you, 1 West, 2 East. */
'use strict';
module.exports = [
  {
    id: 'follow-suit', title: 'Follow suit', teachers: { west: 'mei', east: 'kit' },
    dealer: 0, caller: 1, turned: '7H',
    hands7: [
      ['AS', '8S', 'AD', '10D', '7D', '9C', '8C'],
      ['QS', '10S', 'AH', 'KH', 'QH', 'AC', 'KC'],
      ['9S', '7H', '8H', '10C', 'QC', 'KD', 'QD']
    ],
    plays: ['QS', '9S'],
    prompt: 'Win the trick.',
    lesson: 'Follow the suit that was led. The highest card of that suit wins.',
    goal: { type: 'winTrick' },
    say: {
      intro: [['east', 'Spades led. What can you play?'], ['west', 'Only a spade: the rest are dimmed. The highest spade wins.']],
      hint: [['west', 'Your highest spade.']],
      failed: [['west', '{QS} beats {8S}. Try the higher spade.']]
    }
  },
  {
    id: 'trump', title: 'Trump', teachers: { west: 'mei', east: 'kit' },
    dealer: 0, caller: 1, turned: '7H',
    hands7: [
      ['8H', 'AD', 'KD', 'QD', 'AC', 'KC', '10C'],
      ['AS', 'QS', 'AH', 'KH', 'QH', '9C', '8C'],
      ['7S', '7H', '9H', '10H', 'JC', '9D', '8D']
    ],
    plays: ['AS', '7S'],
    prompt: 'Win the trick.',
    lesson: 'No card of the suit led? Play any card. Trump beats every other suit, even an Ace.',
    goal: { type: 'winTrick' },
    say: {
      intro: [['east', 'No spades left. Now what?'], ['west', 'Any card goes. Hearts are trump: a trump beats every other suit.']],
      hint: [['west', 'Any heart.']],
      failed: [['west', 'Only a trump beats my {AS}.']]
    }
  },
  {
    id: 'left-bower', title: 'The bowers', teachers: { west: 'mei', east: 'kit' },
    dealer: 0, caller: 1, turned: '7H',
    hands7: [
      ['JD', '9H', 'AD', '10D', '8D', 'KC', 'QC'],
      ['AS', 'KS', 'QS', '10S', '9S', 'KH', '10H'],
      ['QH', '8H', '7H', 'AC', 'JC', 'KD', 'QD']
    ],
    plays: ['AS', 'QH'],
    prompt: 'Win the trick.',
    lesson: 'Trump order: Joker, Right Bower (J of trump), Left Bower (the other Jack of that color), then A, K, Q…',
    goal: { type: 'winTrick' },
    say: {
      intro: [['east', 'I trumped with {QH}. Beat that.'], ['west', 'Read your tags. LEFT ♥ means that Jack is a heart now.']],
      hint: [['west', 'The tag says LEFT ♥.']],
      failed: [['west', '{JD} counts as a heart, above the Ace.']]
    }
  },
  {
    id: 'king-points', title: 'King points', teachers: { west: 'ace', east: 'lou' },
    dealer: 2, caller: 1, turned: '7H',
    hands7: [
      ['10C', 'KC', 'AD', '9S', '8S', '7D', '10D'],
      ['AC', 'QC', 'KD', 'AH', 'KH', 'QH', 'JH'],
      ['8C', '9C', 'QD', '7H', '8H', 'AS', 'KS']
    ],
    plays: ['10C', 'AC', '8C', 'KD', 'QD', 'AD'],
    prompt: 'Score a King point.',
    lesson: 'A King that wins a trick scores +1 at once. A King that loses scores nothing.',
    goal: { type: 'kingPoint' },
    say: {
      intro: [['east', 'Oh no. Is the {AC} still out?'], ['west', 'Gone in trick 1. My {KD} lost: no point. A King that wins pays +1, champ.']],
      hint: [['west', 'The KING tag.']],
      failed: [['east', 'Oh no. No King, no point.']]
    }
  },
  {
    id: 'first-to-ten', title: 'First to 10', teachers: { west: 'vex', east: 'tex' },
    dealer: 0, caller: 2, turned: '7H', scores: [9, 8, 7],
    hands7: [
      ['KH', '7H', 'AD', 'KD', 'QS', 'JS', '10S'],
      ['AC', 'KC', 'QC', 'AS', 'KS', '8D', '7D'],
      ['7C', '9H', 'AH', 'QH', '10H', '9D', '8S']
    ],
    plays: ['AC', '7C'],
    prompt: 'Win the game.',
    lesson: 'First to 10 points wins at once, even in the middle of a trick.',
    goal: { type: 'kingPoint' },
    say: {
      intro: [['east', 'Nine points? Deal \'em again!'], ['west', 'One point ends it. Even mid-trick.']],
      hint: [['west', 'Trump with a King.']],
      failed: [['west', 'Trick\'s yours. Point isn\'t.']]
    }
  },
  {
    id: 'calling', title: 'Calling trump', teachers: { west: 'doc', east: 'tex' },
    dealer: 2, kind: 'lesson',
    hands10: [
      ['JH', 'JD', 'AH', 'KH', '10H', 'AS', 'QC', '7S', '8C', '7D'],
      ['AC', 'KC', 'JC', '9S', '10S', 'QS', 'KD', 'QD', '8D', '7C'],
      ['AD', '10D', '9D', 'JS', 'KS', '8S', '9C', '10C', 'QH', '8H']
    ],
    kitty: ['9H', '7H', 'JK'],
    script: [{ type: 'DISCARD', player: 0, cards: ['7S', '8C', '7D'] }, { type: 'DISCARD', player: 1, cards: ['7C', '8D', '9S'] }, { type: 'DISCARD', player: 2, cards: ['8H', '9C', '10C'] }],
    prompt: 'Call or pass?',
    lesson: 'Call when you hold enough trump. Your left-hand player takes the turned card: that is the price of calling.',
    goal: { type: 'decide', accept: [{ type: 'BID', player: 0, accept: true }] },
    say: {
      intro: [['east', 'Just call it!'], ['west', '{9H} turned up. Count your hearts first. Bowers count.']],
      hint: [['west', 'Five trumps.']],
      failed: [['west', 'Five trumps. That\'s a call.']]
    }
  },
  {
    id: 'first-hand', title: 'Your first hand', teachers: { west: 'zen', east: 'kit' },
    dealer: 2, kind: 'lesson',
    hands10: [
      ['JH', 'AH', 'KH', '9H', 'AS', 'KC', 'QC', '8S', '7D', '8D'],
      ['AC', '10C', '9C', 'QS', 'JS', 'KD', 'QD', '9D', '7C', '10S'],
      ['AD', '10D', 'JD', 'KS', '9S', '7S', 'JC', '8C', 'QH', '10H']
    ],
    kitty: ['8H', '7H', 'JK'],
    script: [],
    prompt: 'Play a hand.',
    lesson: 'That is the game: discard, call, play seven tricks. First to 10 wins.',
    goal: { type: 'playHand' },
    tips: 'guided',
    say: {
      intro: [['west', 'A whole hand now. I\'ll say a word when it helps.']],
      solved: [['west', 'Most tricks: +1. All seven: +2 for the caller, +3 for anyone else.']]
    }
  }
];

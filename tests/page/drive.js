/* Page helpers for the UI scripts (scenarios.js, soak.js). drive() plays the game through the controls:
   your seat by clicks (the fast AI picks the move), Continue buttons, the seat-swap dialog.
   It records the event types (seen) and checks the Skip rule at each tick (skip). */
const A = KCT.App, app = A.app, P = KCT.Engine.P;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const q = sel => document.querySelector(sel);
const click = sel => { const el = q(sel); if (!el) throw new Error('no element ' + sel); el.click(); };
const overlayOpen = () => !q('#overlay').hidden;
const askOpen = () => !q('#askLayer').hidden;
const speed = v => { const s = q('#speedSel'); s.value = v; s.dispatchEvent(new Event('change')); };
// Event types seen, from the event logger.
const seen = window.__seen || (window.__seen = {});
if (!window.__hooked) { window.__hooked = true; KCT.Logger.enabled = true; KCT.Logger.listeners.push(l => { const t = l.split(' ')[1]; seen[t] = (seen[t] || 0) + 1; }); }
// The Skip rule, checked on each tick: the button shows only in a Showdown between the two bots.
const skip = window.__skip || (window.__skip = { botSdWaits: 0, shownInBotSd: 0, missingInBotSd: 0, shownElsewhere: 0, elsewhere: [] });
function checkSkip() {
  const st = app.state, sd = st.showdown;
  const botSd = !!(sd && sd.active && !sd.participants.includes(0));
  const shown = !!q('[data-action="skip"]');
  if (botSd && app.timerFn) { skip.botSdWaits++; if (shown) skip.shownInBotSd++; else skip.missingInBotSd++; }
  if (shown && !botSd) { skip.shownElsewhere++; if (skip.elsewhere.length < 5) skip.elsewhere.push(st.phase); }
}
// The human seat: the fast AI picks, and the test clicks the same controls a player clicks.
const human = window.__human || (window.__human = { actions: {}, continues: 0 });
function humanStep() {
  const st = app.state;
  if (!KCT.Engine.actors(st).includes(0) || app.ui.autoplay) return false;
  const a = KCT.AI.fastAction(st, 0);
  human.actions[a.type + (a.type === 'BID' ? (a.accept ? ':accept' : ':pass') : a.type === 'NAME' ? (a.suit ? ':name' : ':pass') : '')] = (human.actions[a.type + (a.type === 'BID' ? (a.accept ? ':accept' : ':pass') : a.type === 'NAME' ? (a.suit ? ':name' : ':pass') : '')] || 0) + 1;
  const card = id => click('#hand button[data-card="' + id + '"]');
  switch (a.type) {
    case 'DISCARD': a.cards.forEach(card); click('[data-action="confirm-discard"]'); break;
    case 'EXCHANGE': a.cards.forEach(card); click('[data-action="confirm-exchange"]'); break;
    case 'SHOWDOWN_DISCARD': card(a.card); click('[data-action="confirm-sd-discard"]'); break;
    case 'BID': click('[data-action="bid-' + (a.accept ? 'accept' : 'pass') + '"]'); break;
    case 'NAME': click(a.suit ? '[data-action="name-suit"][data-suit="' + a.suit + '"]' : '[data-action="name-pass"]'); break;
    case 'PLAY': card(a.card); break;
  }
  return true;
}
// Plays until stop() is true, or the game-over box shows. Returns why it stopped.
async function drive(stop, limitMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (limitMs || 900000)) {
    await sleep(15);
    checkSkip();
    if (askOpen()) return 'ask';
    if (overlayOpen()) {
      if (q('#overlay .swap')) { human.swapDialog = (human.swapDialog || 0) + 1; click('[data-action="swap-preview"]'); human.swapped = true; click('[data-action="swap-done"]'); continue; }
      if (q('#overlay .big')) return 'game-over';
      return 'overlay: ' + q('#overlay').textContent.slice(0, 60);
    }
    if (stop && stop()) return 'stop';
    if (humanStep()) continue;
    if (q('[data-action="continue"]')) { human.continues++; click('[data-action="continue"]'); }
  }
  return 'timeout';
}

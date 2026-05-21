// ── REVENU SHARED STATE ───────────────────────────────────────────────────────
// All variables shared across JS files. Loaded first.
var currentUserId    = null;
var roomsData        = [];
var bookings         = [];
var currentUpiId     = '';
var currentGuestLink = '';
var currentGuestPhone= '';
var currentGuestName = '';
var booking_pnr      = '';
var statusLabel      = {
  occupied:'Occupied', available:'Available',
  checkout:'Checkout', cleaning:'Cleaning', maintenance:'Maint.'
};

// ── ANTI-DOUBLE-CLICK HELPERS ─────────────────────────────────────────────────
// Disables a button immediately on first click so async DB writes can't be
// double-fired by rapid clicks. Returns false if button is already locked.
// Usage:
//   async function handler(arg1, arg2, btn){
//     if(!lockBtn(btn, '⏳ Saving…')) return;
//     // … validation, awaits …
//     if(!ok){ unlockBtn(btn); return; }   // re-enable on early exits
//     // on success the modal usually closes — no unlock needed
//   }
function lockBtn(btn, label){
  if(!btn) return true;                  // called without a button → no-op, allow
  if(btn.disabled) return false;         // already running — block re-entry
  btn.disabled = true;
  btn.dataset._origLabel = btn.innerHTML;
  if(label) btn.innerHTML = label;
  return true;
}
function unlockBtn(btn){
  if(!btn) return;
  btn.disabled = false;
  if(btn.dataset._origLabel !== undefined){
    btn.innerHTML = btn.dataset._origLabel;
    delete btn.dataset._origLabel;
  }
}

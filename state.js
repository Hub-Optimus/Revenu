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

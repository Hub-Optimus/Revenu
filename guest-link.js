// ── GUEST-LINK.JS — guest link modal, WhatsApp share, copy link ───────────────

function showLinkModal(bookingId, guestName, phone, source, pnr){
  booking_pnr = pnr||'';
  const baseUrl   = window.location.origin;
  const link      = `${baseUrl}/guest.html?booking=${bookingId}`;
  const hotelName = document.getElementById('sb-hotel').textContent||'our hotel';
  const firstName = guestName.split(' ')[0];
  const pnrInfo   = booking_pnr ? ` | PNR: ${booking_pnr}` : '';
  const message   = `Hi ${firstName} 👋 Your booking at ${hotelName} is confirmed!${pnrInfo}\n\nAccess your booking & hotel services here:\n${link}\n\nTo login: use your PNR${booking_pnr?' ('+booking_pnr+')':''} + your last name.`;

  currentGuestLink  = link;
  currentGuestPhone = phone.replace(/[^0-9+]/g,'');
  currentGuestName  = guestName;

  document.getElementById('lm-guest-name').textContent = `Link ready for ${guestName}`;
  document.getElementById('lm-link').textContent       = link;
  document.getElementById('lm-message').textContent    = message;
  document.getElementById('link-modal').classList.add('open');
}

function closeLinkModal(){
  document.getElementById('link-modal').classList.remove('open');
}

function sendWhatsApp(){
  const hotelName = document.getElementById('sb-hotel').textContent||'our hotel';
  const firstName = currentGuestName.split(' ')[0];
  const message   = encodeURIComponent(`Hi ${firstName} 👋 Your booking at ${hotelName} is confirmed! Complete your check-in and explore hotel services here: ${currentGuestLink}`);
  const phone     = currentGuestPhone.startsWith('+') ? currentGuestPhone.slice(1) : currentGuestPhone;
  window.open(`https://wa.me/${phone}?text=${message}`,'_blank');
}

function copyLink(){
  navigator.clipboard.writeText(currentGuestLink).then(()=>{
    document.getElementById('copy-label').textContent='✓ Link copied!';
    setTimeout(()=>{ document.getElementById('copy-label').textContent='📋 Copy link'; },2000);
  });
}

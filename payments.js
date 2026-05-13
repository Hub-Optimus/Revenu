// ── PAYMENTS.JS — payment settings (YY UPI ID) ───────────────────────────────

function openPaymentSettings(){
  document.getElementById('payment-modal').classList.add('open');
  document.getElementById('pay-upi').value = currentUpiId||'';
}

function closePaymentSettings(){
  document.getElementById('payment-modal').classList.remove('open');
}

async function savePaymentSettings(){
  const upi = document.getElementById('pay-upi').value.trim();
  const btn = document.getElementById('pay-btn');
  const msg = document.getElementById('pay-msg');

  if(!upi){ msg.textContent='Please enter your UPI ID.'; msg.className='msg error'; return; }
  btn.disabled=true; btn.textContent='Saving…';

  const {error} = await sb.auth.updateUser({data:{upi_id:upi}});
  if(error){
    msg.textContent='Error: '+error.message; msg.className='msg error';
    btn.disabled=false; btn.textContent='Save UPI ID →'; return;
  }
  currentUpiId = upi;
  msg.textContent='✓ UPI ID saved! Guests can now pay you directly.';
  msg.className='msg success';
  btn.textContent='Saved!';
  setTimeout(()=>{ closePaymentSettings(); btn.disabled=false; btn.textContent='Save UPI ID →'; msg.className='msg'; },2000);
}

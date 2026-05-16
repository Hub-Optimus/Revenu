// ── BOOKING-DETAIL.JS — booking detail modal + check-in approval (Stage G.2) ──

async function openBookingDetail(bookingId){
  document.getElementById('booking-detail-modal').classList.add('open');
  document.getElementById('booking-detail-body').innerHTML='<div style="text-align:center;padding:20px;color:var(--muted)">Loading...</div>';

  const [bRes, reqsRes, ciRes] = await Promise.all([
    sb.from('bookings').select('*').eq('id',bookingId).single(),
    sb.from('guest_requests').select('*').eq('booking_id',bookingId).order('created_at',{ascending:false}),
    sb.from('guest_checkins').select('*').eq('booking_id',bookingId).order('checked_in_at',{ascending:false}).limit(1)
  ]);

  const b = bRes.data;
  const requests = reqsRes.data || [];
  const checkin = (ciRes.data && ciRes.data[0]) || null;

  if(!b){ document.getElementById('booking-detail-body').innerHTML='<p>Booking not found.</p>'; return; }

  const totalSpend = requests.reduce((s,r)=>s+(r.amount||0),0);
  const pending    = requests.filter(r=>r.status==='pending');
  const typeColor  = {upsell:'#185FA5',food:'#15803d',service:'#92400e'};
  const typeBg     = {upsell:'#dbeafe',food:'#dcfce7',service:'#fef3c7'};

  document.getElementById('booking-detail-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:var(--bg);border-radius:10px;padding:12px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Guest</div>
        <div style="font-size:14px;font-weight:600">${b.guest_name}</div>
        <div style="font-size:12px;color:var(--muted)">${b.guest_phone}</div>
        ${b.guest_email?`<div style="font-size:12px;color:var(--muted)">${b.guest_email}</div>`:''}
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:12px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Booking</div>
        <div style="font-size:14px;font-weight:600">Room ${b.room_no} — ${b.room_type||''}</div>
        <div style="font-size:12px;color:var(--muted)">PNR: <strong>${b.pnr||'—'}</strong></div>
        <div style="font-size:12px;color:var(--muted)">${b.source||'Direct'}</div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:12px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Stay</div>
        <div style="font-size:13px">Check-in: <strong>${b.checkin}</strong></div>
        <div style="font-size:13px">Check-out: <strong>${b.checkout}</strong></div>
        ${b.arrival_time?`<div style="font-size:12px;color:var(--muted)">Arrival: ${b.arrival_time}</div>`:''}
      </div>
      <div style="background:${totalSpend>0?'#dcfce7':'var(--bg)'};border-radius:10px;padding:12px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Revenue</div>
        <div style="font-size:20px;font-weight:700;color:${totalSpend>0?'#15803d':'var(--text)'}">₹${totalSpend.toLocaleString('en-IN')}</div>
        <div style="font-size:12px;color:var(--muted)">${requests.length} request${requests.length!==1?'s':''} · ${pending.length} pending</div>
      </div>
    </div>

    ${renderCheckinSection(b, checkin)}

    ${renderPhysicalArrivalSection(b)}

    <div style="font-size:13px;font-weight:600;margin-bottom:10px">Guest requests & orders</div>
    ${requests.length===0
      ? '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px;background:var(--bg);border-radius:10px">No requests yet — guest has not placed any orders.</div>'
      : `<div style="display:flex;flex-direction:column;gap:8px">
          ${requests.map(r=>`
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--white)">
              <span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:5px;background:${typeBg[r.request_type]||'#f1f0e8'};color:${typeColor[r.request_type]||'#5f5e5a'};text-transform:uppercase">${r.request_type}</span>
              <span style="flex:1;font-size:13px;font-weight:500">${r.item_name}</span>
              <span style="font-size:13px;font-weight:600;color:#15803d">${r.amount>0?'₹'+r.amount.toLocaleString('en-IN'):'Free'}</span>
              <button onclick="markPaid('${r.id}',this)" style="font-size:11px;padding:4px 9px;border-radius:6px;border:1px solid ${r.status==='paid'?'#15803d':'var(--border)'};background:${r.status==='paid'?'#dcfce7':'var(--bg)'};color:${r.status==='paid'?'#15803d':'var(--muted)'};cursor:pointer;font-family:'DM Sans',sans-serif">${r.status==='paid'?'✓ Paid':'Mark paid'}</button>
            </div>
          `).join('')}
        </div>`
    }

    ${requests.length>0?`
    <div style="margin-top:14px;padding:12px 14px;background:var(--blue-light);border-radius:10px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;font-weight:600;color:var(--blue)">Total to settle at checkout</div>
      <div style="font-size:18px;font-weight:700;color:var(--blue)">₹${totalSpend.toLocaleString('en-IN')}</div>
    </div>`:''}

    <div style="margin-top:14px;display:flex;gap:8px">
      <button onclick="showLinkModal('${b.id}','${(b.guest_name||'').replace(/'/g,'&#39;')}','${b.guest_phone||''}','${b.source||''}','${b.pnr||''}')" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif">📱 Resend guest link</button>
      <button onclick="closeBookingDetail()" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--blue);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">Done</button>
    </div>
  `;
}

function renderCheckinSection(b, ci){
  const status = b.checkin_status || 'pending';
  const safeName = (b.guest_name||'').replace(/'/g,'&#39;');
  const safePhone = (b.guest_phone||'').replace(/'/g,'');

  // No submission yet
  if(!ci && (status==='pending' || !status)){
    return `<div class="ci-empty">🛏️ Guest has not yet submitted self check-in. They can use the guest link to complete check-in online.</div>`;
  }

  const submittedAt = ci && ci.checked_in_at ? new Date(ci.checked_in_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const idUrls = (ci && ci.id_url) ? ci.id_url.split('|').filter(Boolean) : [];
  const idType = ci ? ci.id_type : '—';
  const paxActual = ci ? ci.pax_actual : '—';

  let statusBadge='', actionButtons='', reasonBlock='';
  if(status==='guest-submitted'){
    statusBadge = '<span class="ci-status ci-status-pending">⏳ Awaiting your approval</span>';
    actionButtons = `
      <button class="ci-btn ci-btn-approve" onclick="approveCheckin('${b.id}','${safeName}','${b.room_no}','${safePhone}')">✓ Approve check-in</button>
      <button class="ci-btn ci-btn-reject" onclick="rejectCheckin('${b.id}','${safeName}','${b.room_no}','${safePhone}')">✕ Reject</button>
    `;
  } else if(status==='approved' || status==='checked-in' || status==='guest-checked-in'){
    statusBadge = '<span class="ci-status ci-status-approved">✓ Approved</span>';
    actionButtons = `
      <button class="ci-btn ci-btn-resend" onclick="sendCheckinWhatsApp('${b.id}','${safeName}','${b.room_no}','${safePhone}','approved')">📱 Send approval message</button>
      <button class="ci-btn ci-btn-reject" onclick="rejectCheckin('${b.id}','${safeName}','${b.room_no}','${safePhone}')">Revoke</button>
    `;
  } else if(status==='rejected'){
    statusBadge = '<span class="ci-status ci-status-rejected">✕ Rejected</span>';
    if(b.rejection_reason){
      reasonBlock = `<div class="ci-reason"><strong>Rejection reason sent to guest:</strong> ${b.rejection_reason}</div>`;
    }
    actionButtons = `
      <button class="ci-btn ci-btn-approve" onclick="approveCheckin('${b.id}','${safeName}','${b.room_no}','${safePhone}')">✓ Approve anyway</button>
      <button class="ci-btn ci-btn-resend" onclick="sendCheckinWhatsApp('${b.id}','${safeName}','${b.room_no}','${safePhone}','rejected','${(b.rejection_reason||'').replace(/'/g,'&#39;')}')">📱 Resend rejection message</button>
    `;
  }

  return `
    <div class="ci-section">
      <div class="ci-section-head">
        <div class="ci-section-title">🛏️ Self check-in submission</div>
        ${statusBadge}
      </div>
      <div class="ci-section-body">
        ${reasonBlock}
        <div class="ci-meta">
          <div><span>Submitted:</span> <strong>${submittedAt}</strong></div>
          <div><span>ID Type:</span> <strong>${idType}</strong></div>
          <div><span>Pax actual:</span> <strong>${paxActual}</strong></div>
          <div><span>Photos uploaded:</span> <strong>${idUrls.length}</strong></div>
        </div>
        ${idUrls.length > 0 ? `
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;font-weight:600">ID Photos (tap to enlarge)</div>
          <div class="ci-photos">
            ${idUrls.map((url, i) => `<img class="ci-photo" src="${url}" onclick="openIDLightbox('${url}')" alt="ID ${i+1}"/>`).join('')}
          </div>
        ` : ''}
        <div class="ci-actions">${actionButtons}</div>
      </div>
    </div>
  `;
}

async function approveCheckin(bookingId, guestName, roomNo, phone){
  if(!confirm('Approve this check-in?\n\nGuest will be notified, and you should physically verify their ID on arrival.')) return;

  const res = await sb.from('bookings').update({
    checkin_status: 'approved',
    rejection_reason: null
  }).eq('id', bookingId);

  if(res.error){ alert('Error: '+res.error.message); return; }

  if(typeof addActivity==='function') addActivity('✓ Approved check-in — '+guestName+' (Room '+roomNo+')');

  await openBookingDetail(bookingId);
  if(typeof loadBookings==='function') await loadBookings();
  sendCheckinWhatsApp(bookingId, guestName, roomNo, phone, 'approved');
}

async function rejectCheckin(bookingId, guestName, roomNo, phone){
  const reason = prompt('Reason for rejection? (optional — shown to guest)\n\nExamples:\n• ID photo unclear, please retake\n• Number of guests doesn\'t match booking\n• Missing back side of Aadhaar', '');
  if(reason === null) return;

  const finalReason = (reason||'').trim() || 'Please review and resubmit your check-in details.';

  const res = await sb.from('bookings').update({
    checkin_status: 'rejected',
    rejection_reason: finalReason
  }).eq('id', bookingId);

  if(res.error){ alert('Error: '+res.error.message); return; }

  if(typeof addActivity==='function') addActivity('✕ Rejected check-in — '+guestName+' (Room '+roomNo+')'+(reason?' — '+reason:''));

  await openBookingDetail(bookingId);
  if(typeof loadBookings==='function') await loadBookings();
  sendCheckinWhatsApp(bookingId, guestName, roomNo, phone, 'rejected', finalReason);
}

function sendCheckinWhatsApp(bookingId, guestName, roomNo, phone, status, reason){
  const baseUrl = window.location.origin;
  const guestLink = baseUrl+'/guest.html?booking='+bookingId;
  const firstName = (guestName||'Guest').split(' ')[0];
  const hotelName = (document.getElementById('sb-hotel') && document.getElementById('sb-hotel').textContent) || 'Hotel';

  let msg;
  if(status === 'approved'){
    msg = 'Hi '+firstName+', your check-in for Room '+roomNo+' has been *approved* ✓\n\nPlease carry your *original ID* for physical verification at reception.\n\nView your booking: '+guestLink+'\n\n— '+hotelName;
  } else {
    msg = 'Hi '+firstName+', your check-in for Room '+roomNo+' needs attention.\n\n*Reason:* '+(reason||'Please review and resubmit your check-in details.')+'\n\nPlease update your details here: '+guestLink+'\n\n— '+hotelName;
  }

  const cleanPhone = (phone||'').replace(/\D/g,'');
  let waNumber = cleanPhone;
  if(waNumber && !waNumber.startsWith('91') && waNumber.length === 10) waNumber = '91' + waNumber;

  const waUrl = waNumber
    ? 'https://wa.me/'+waNumber+'?text='+encodeURIComponent(msg)
    : 'https://wa.me/?text='+encodeURIComponent(msg);

  window.open(waUrl, '_blank');
}

function openIDLightbox(url){
  document.getElementById('id-lightbox-img').src = url;
  document.getElementById('id-lightbox').classList.add('open');
}

function closeIDLightbox(){
  document.getElementById('id-lightbox').classList.remove('open');
}

// ── STAGE H: Physical arrival / check-in / check-out ─────────────────────────

function renderPhysicalArrivalSection(b){
  const status = b.status || 'booked';
  const ciStatus = b.checkin_status || 'pending';
  const safeName = (b.guest_name||'').replace(/'/g,'&#39;');

  // Format timestamps if present
  const formatTs = function(ts){
    if(!ts) return '—';
    return new Date(ts).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  };

  let timeline = '';
  let actionButton = '';
  let walkInWarning = '';

  // Build timeline rows (always show progression)
  // Row 1: Online check-in status
  if(ciStatus === 'approved' || ciStatus === 'checked-in' || ciStatus === 'guest-checked-in'){
    timeline += '<div class="pa-row pa-done">✓ Online check-in approved</div>';
  } else if(ciStatus === 'guest-submitted'){
    timeline += '<div class="pa-row pa-pending">⏳ Online check-in awaiting your approval (above)</div>';
  } else if(ciStatus === 'rejected'){
    timeline += '<div class="pa-row pa-warn">✕ Online check-in rejected — guest may resubmit</div>';
  } else {
    timeline += '<div class="pa-row pa-muted">○ No online check-in (walk-in or guest skipped)</div>';
    walkInWarning = '<div class="pa-warning">⚠️ Guest did not submit online check-in. You\'ll need to verify physical ID at the front desk.</div>';
  }

  // Row 2: Physical arrival
  if(status === 'checked-in' || status === 'checked-out'){
    timeline += '<div class="pa-row pa-done">✓ Physically checked in &middot; <span style="color:var(--muted);font-weight:400">'+formatTs(b.actual_checkin_time)+'</span></div>';
  } else if(status === 'booked'){
    timeline += '<div class="pa-row pa-pending">⏳ Awaiting physical arrival</div>';
  }

  // Row 3: Checkout
  if(status === 'checked-out'){
    const finalT = b.final_total ? '₹'+Number(b.final_total).toLocaleString('en-IN') : '—';
    timeline += '<div class="pa-row pa-done">✓ Checked out &middot; <span style="color:var(--muted);font-weight:400">'+formatTs(b.actual_checkout_time)+' &middot; Final bill: '+finalT+'</span></div>';
  }

  // Decide action button
  if(status === 'booked' && (ciStatus === 'approved' || ciStatus === 'pending' || ciStatus === 'rejected' || ciStatus === 'guest-checked-in')){
    actionButton = '<button class="pa-btn pa-btn-checkin" onclick="markCheckedIn(\''+b.id+'\',\''+safeName+'\',\''+b.room_no+'\')">🛏️ Mark guest as checked in</button>';
  } else if(status === 'checked-in'){
    actionButton = '<button class="pa-btn pa-btn-checkout" onclick="openCheckoutModal(\''+b.id+'\')">🚪 Check out guest →</button>';
  } else if(status === 'checked-out'){
    actionButton = '<button class="pa-btn pa-btn-view" onclick="openCheckoutModal(\''+b.id+'\')">📄 View final bill</button>';
  } else if(status === 'cancelled'){
    actionButton = '<div style="font-size:12px;color:var(--muted);padding:10px 14px;background:var(--bg);border-radius:8px;text-align:center">Booking cancelled — no action available</div>';
  }

  return `
    <div class="pa-section">
      <div class="pa-section-head">
        <div class="ci-section-title">📍 Stay progress</div>
      </div>
      <div class="pa-section-body">
        ${walkInWarning}
        <div class="pa-timeline">${timeline}</div>
        ${actionButton ? '<div class="pa-actions">'+actionButton+'</div>' : ''}
      </div>
    </div>
  `;
}

async function markCheckedIn(bookingId, guestName, roomNo){
  if(!confirm('Mark '+guestName+' as physically checked in to Room '+roomNo+'?\n\nThis will:\n• Mark booking as "checked-in"\n• Auto-occupy Room '+roomNo)) return;

  const now = new Date().toISOString();

  // Update booking
  const updRes = await sb.from('bookings').update({
    status: 'checked-in',
    actual_checkin_time: now
  }).eq('id', bookingId);
  if(updRes.error){ alert('Error: '+updRes.error.message); return; }

  // Update room to occupied
  const room = (typeof roomsData!=='undefined') ? roomsData.find(function(r){return r.room_number === roomNo;}) : null;
  if(room){
    const roomUpd = await sb.from('rooms').update({status:'occupied'}).eq('id', room.id);
    if(roomUpd.error){ console.warn('Room status update failed:', roomUpd.error); }
    else { room.status = 'occupied'; }
  }

  if(typeof addActivity==='function') addActivity('🛏️ Checked in — '+guestName+' to Room '+roomNo);
  if(typeof renderRooms==='function') renderRooms();
  if(typeof loadBookings==='function') await loadBookings();
  await openBookingDetail(bookingId);
}

// ── CHECKOUT MODAL ───────────────────────────────────────────────────────────

var currentCheckoutBooking = null;

async function openCheckoutModal(bookingId){
  document.getElementById('checkout-modal').classList.add('open');
  document.getElementById('checkout-body').innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">Loading bill…</div>';

  const res = await sb.from('bookings').select('*').eq('id', bookingId).single();
  if(res.error || !res.data){ document.getElementById('checkout-body').innerHTML='<p>Booking not found.</p>'; return; }
  currentCheckoutBooking = res.data;
  renderCheckoutModal();
}

function renderCheckoutModal(){
  const b = currentCheckoutBooking;
  if(!b) return;

  // Calculate bill
  const ci = new Date(b.checkin);
  const co = new Date(b.checkout);
  const nights = Math.max(1, Math.round((co - ci) / 86400000));
  const rate = parseFloat(b.rate) || 0;
  const base = rate * nights;
  const isInclusive = b.gst_inclusive !== false;
  const gstPct = rate > 7500 ? 18 : 12;
  let total;
  if(isInclusive){
    total = base;
  } else {
    total = base * (1 + gstPct/100);
  }
  // Use frozen final_total if already checked out
  if(b.status === 'checked-out' && b.final_total){
    total = parseFloat(b.final_total);
  }
  const paid = parseFloat(b.amount_paid) || 0;
  const due = Math.max(0, total - paid);
  const isPaid = due <= 0;
  const alreadyCheckedOut = b.status === 'checked-out';

  document.getElementById('checkout-body').innerHTML = `
    <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;font-weight:600">Stay summary</div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span style="color:var(--muted)">Guest</span><strong>${b.guest_name}</strong></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span style="color:var(--muted)">Room</span><strong>${b.room_no} · ${b.room_type||''}</strong></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span style="color:var(--muted)">Check-in</span><strong>${b.checkin}</strong></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span style="color:var(--muted)">Check-out</span><strong>${b.checkout}</strong></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span style="color:var(--muted)">Nights</span><strong>${nights}</strong></div>
    </div>

    <div style="border:1.5px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px">
      <div style="padding:10px 14px;background:var(--bg);border-bottom:1px solid var(--border);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted)">Final bill</div>
      <div style="padding:14px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span>Room rate × ${nights} night${nights>1?'s':''}</span><strong>₹${Math.round(base).toLocaleString('en-IN')}</strong></div>
        ${isInclusive
          ? '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:var(--muted)"><span>GST '+gstPct+'%</span><span>(inclusive)</span></div>'
          : '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span>GST '+gstPct+'%</span><strong>₹'+Math.round(total-base).toLocaleString('en-IN')+'</strong></div>'}
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:var(--muted)"><span>Add-on services</span><span>₹0 (coming soon)</span></div>
        <div style="border-top:1.5px solid var(--border);margin-top:8px;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:14px;font-weight:700">TOTAL</span>
          <span style="font-size:22px;font-weight:700;color:var(--text)">₹${Math.round(total).toLocaleString('en-IN')}</span>
        </div>
        <div style="margin-top:10px;display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span style="color:var(--muted)">Paid so far</span><strong>₹${Math.round(paid).toLocaleString('en-IN')}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;font-weight:700">
          <span>Balance ${isPaid?'':'due'}</span>
          <span style="color:${isPaid?'var(--green)':'var(--red)'}">${isPaid?'✓ Settled':'₹'+Math.round(due).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    ${alreadyCheckedOut ? `
      <div style="padding:14px;background:var(--green-light);border-radius:10px;text-align:center;color:var(--green);font-size:13px;font-weight:600">
        ✓ This booking is checked out
      </div>
      <div style="margin-top:14px;display:flex;gap:8px">
        <button onclick="closeCheckoutModal()" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif">Close</button>
      </div>
    ` : `
      ${!isPaid ? `
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button onclick="settleBalance('${b.id}', ${total})" style="flex:1;padding:11px;border:none;border-radius:8px;background:var(--green);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">💰 Settle balance (₹${Math.round(due).toLocaleString('en-IN')})</button>
      </div>` : ''}

      <div style="padding:11px 14px;background:var(--blue-light);border-radius:8px;font-size:12px;color:var(--blue);margin-bottom:14px;line-height:1.5">
        <strong>On checkout:</strong> Room ${b.room_no} will be marked as <strong>Cleaning</strong>. It won't be bookable until you mark it ready in Room Inventory.
      </div>

      <div style="display:flex;gap:8px">
        <button onclick="closeCheckoutModal()" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif">Cancel</button>
        <button onclick="confirmCheckout('${b.id}','${(b.guest_name||'').replace(/'/g,'&#39;')}','${b.room_no}',${total},${due})" style="flex:1;padding:11px;border:none;border-radius:8px;background:var(--blue);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">Confirm checkout →</button>
      </div>
    `}
  `;
}

async function settleBalance(bookingId, total){
  if(!confirm('Mark full balance as paid?\n\nThis records ₹'+Math.round(total).toLocaleString('en-IN')+' as received.')) return;
  const res = await sb.from('bookings').update({amount_paid: total}).eq('id', bookingId);
  if(res.error){ alert('Error: '+res.error.message); return; }
  if(typeof addActivity==='function') addActivity('💰 Payment received — ₹'+Math.round(total).toLocaleString('en-IN'));
  // Refresh modal
  const fresh = await sb.from('bookings').select('*').eq('id', bookingId).single();
  currentCheckoutBooking = fresh.data;
  renderCheckoutModal();
}

async function confirmCheckout(bookingId, guestName, roomNo, total, due){
  if(due > 0){
    if(!confirm('⚠️ Balance ₹'+Math.round(due).toLocaleString('en-IN')+' is still due.\n\nCheck out '+guestName+' anyway? You can chase payment later.')) return;
  } else {
    if(!confirm('Confirm checkout for '+guestName+' from Room '+roomNo+'?\n\nRoom will be marked as Cleaning.')) return;
  }

  const now = new Date().toISOString();
  const updRes = await sb.from('bookings').update({
    status: 'checked-out',
    actual_checkout_time: now,
    final_total: total
  }).eq('id', bookingId);
  if(updRes.error){ alert('Error: '+updRes.error.message); return; }

  // Flip room to cleaning
  const room = (typeof roomsData!=='undefined') ? roomsData.find(function(r){return r.room_number === roomNo;}) : null;
  if(room){
    const roomUpd = await sb.from('rooms').update({status:'cleaning'}).eq('id', room.id);
    if(roomUpd.error){ console.warn('Room status update failed:', roomUpd.error); }
    else { room.status = 'cleaning'; }
  }

  const dueNote = due > 0 ? ' (₹'+Math.round(due).toLocaleString('en-IN')+' balance due)' : ' (fully paid)';
  if(typeof addActivity==='function') addActivity('🚪 Checked out — '+guestName+' from Room '+roomNo+dueNote);

  closeCheckoutModal();
  if(typeof renderRooms==='function') renderRooms();
  if(typeof loadBookings==='function') await loadBookings();
  await openBookingDetail(bookingId);
}

function closeCheckoutModal(){
  document.getElementById('checkout-modal').classList.remove('open');
  currentCheckoutBooking = null;
}

async function markPaid(requestId, btn){
  await sb.from('guest_requests').update({status:'paid'}).eq('id',requestId);
  btn.textContent='✓ Paid';
  btn.style.background='#dcfce7';
  btn.style.color='#15803d';
  btn.style.borderColor='#15803d';
}

function closeBookingDetail(){
  document.getElementById('booking-detail-modal').classList.remove('open');
}

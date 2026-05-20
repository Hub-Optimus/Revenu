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

    <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
      ${b.status === 'booked' ? '<button onclick="openEditBookingModal(\''+b.id+'\')" style="flex:1;min-width:140px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif">✏️ Edit booking</button>' : ''}
      <button onclick="showLinkModal('${b.id}','${(b.guest_name||'').replace(/'/g,'&#39;')}','${b.guest_phone||''}','${b.source||''}','${b.pnr||''}')" style="flex:1;min-width:140px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif">📱 Resend guest link</button>
      <button onclick="closeBookingDetail()" style="flex:1;min-width:140px;padding:10px;border:none;border-radius:8px;background:var(--blue);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">Done</button>
    </div>

    ${b.edits_count > 0 ? '<div style="margin-top:12px;padding:8px 12px;background:#fef3c7;border-radius:6px;font-size:11px;color:#92400e">📝 This booking was edited '+b.edits_count+' time'+(b.edits_count>1?'s':'')+' · Last edit: '+(b.edited_at ? new Date(b.edited_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—')+'</div>' : ''}
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
    // Check if overdue (today > check-in date)
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = b.checkin < todayStr;
    if(isOverdue){
      const daysOverdue = Math.floor((new Date(todayStr) - new Date(b.checkin)) / 86400000);
      actionButton = `
        <div class="pa-overdue-warn">
          ⚠️ <strong>Arrival overdue by ${daysOverdue} day${daysOverdue!==1?'s':''}</strong> — guest expected on ${b.checkin}.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="pa-btn pa-btn-checkin" onclick="markCheckedIn('${b.id}','${safeName}','${b.room_no}')">🛏️ Check in (late arrival)</button>
          <button class="pa-btn pa-btn-noshow" onclick="openNoShowModal('${b.id}','${safeName}','${b.room_no}')">🚫 Mark as no-show</button>
        </div>
      `;
    } else {
      actionButton = '<button class="pa-btn pa-btn-checkin" onclick="markCheckedIn(\''+b.id+'\',\''+safeName+'\',\''+b.room_no+'\')">🛏️ Mark guest as checked in</button>';
    }
  } else if(status === 'checked-in'){
    actionButton = '<button class="pa-btn pa-btn-checkout" onclick="openCheckoutModal(\''+b.id+'\')">🚪 Check out guest →</button>';
  } else if(status === 'checked-out'){
    actionButton = '<button class="pa-btn pa-btn-view" onclick="openCheckoutModal(\''+b.id+'\')">📄 View final bill</button>';
  } else if(status === 'no-show'){
    actionButton = '<div style="font-size:13px;color:#b91c1c;padding:11px 14px;background:#fee2e2;border-radius:8px;text-align:center;font-weight:600">🚫 Marked as no-show — booking closed</div>';
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
  // Fetch fresh booking data
  const bRes = await sb.from('bookings').select('*').eq('id', bookingId).single();
  if(bRes.error || !bRes.data){ alert('Error loading booking.'); return; }
  const b = bRes.data;
  const today = new Date().toISOString().split('T')[0];

  // FIX A — Block early physical check-in (with override option)
  if(b.checkin > today){
    if(!confirm(
      '⚠️ EARLY CHECK-IN DETECTED\n\n' +
      'Booking check-in date: ' + b.checkin + '\n' +
      'Today: ' + today + '\n\n' +
      'Normally early check-in is a PAID upsell.\n' +
      'Are you allowing this as a free early check-in?\n\n' +
      'Click OK to proceed, Cancel to stop.'
    )) return;
  }

  // FIX B — Block room double-occupancy (hard block, no override)
  const conflictRes = await sb.from('bookings')
    .select('id, guest_name, checkin, checkout')
    .eq('room_no', roomNo)
    .eq('status', 'checked-in')
    .neq('id', bookingId);

  if(conflictRes.data && conflictRes.data.length > 0){
    const c = conflictRes.data[0];
    alert(
      '⛔ ROOM CONFLICT — Cannot check in.\n\n' +
      'Room ' + roomNo + ' is currently occupied by:\n' +
      c.guest_name + ' (' + c.checkin + ' → ' + c.checkout + ')\n\n' +
      'You must check out the current guest first.'
    );
    return;
  }

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
    if(roomUpd.error){
      alert('⚠️ Could not auto-mark Room '+roomNo+' as Occupied: '+roomUpd.error.message+'\n\nPlease manually change it in Room Inventory.');
    } else {
      room.status = 'occupied';
      if(typeof loadRooms === 'function') await loadRooms();
    }
  } else {
    console.warn('Room '+roomNo+' not found in roomsData');
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
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span>Room rate <span style="color:var(--muted)">(₹${Math.round(rate).toLocaleString('en-IN')} × ${nights} night${nights>1?'s':''})</span></span><strong>₹${Math.round(base).toLocaleString('en-IN')}</strong></div>
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

  // Flip room to cleaning (auto-housekeeping)
  const room = (typeof roomsData!=='undefined') ? roomsData.find(function(r){return r.room_number === roomNo;}) : null;
  if(room){
    const roomUpd = await sb.from('rooms').update({status:'cleaning'}).eq('id', room.id);
    if(roomUpd.error){
      alert('⚠️ Could not auto-mark Room '+roomNo+' as Cleaning: '+roomUpd.error.message+'\n\nPlease manually change it in Room Inventory.');
    } else {
      room.status = 'cleaning';
      // Reload rooms from DB to ensure consistency
      if(typeof loadRooms === 'function') await loadRooms();
    }
  } else {
    console.warn('Room '+roomNo+' not found in roomsData — skipping auto-clean flag');
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

// ── STAGE H — EDIT BOOKING (Fix E + F) ──────────────────────────────────────

var currentEditBooking = null;

async function openEditBookingModal(bookingId){
  document.getElementById('edit-booking-modal').classList.add('open');
  document.getElementById('edit-booking-body').innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">Loading…</div>';

  const res = await sb.from('bookings').select('*').eq('id', bookingId).single();
  if(res.error || !res.data){
    document.getElementById('edit-booking-body').innerHTML = '<p style="color:var(--red)">Could not load booking.</p>';
    return;
  }
  currentEditBooking = res.data;

  // Build room options (available rooms + current room)
  var roomOptions = '';
  if(typeof roomsData !== 'undefined' && roomsData.length > 0){
    roomsData.forEach(function(r){
      const isCurrent = r.room_number === currentEditBooking.room_no;
      const isAvailable = r.status === 'available';
      if(isCurrent || isAvailable){
        roomOptions += '<option value="'+r.room_number+'" data-type="'+r.room_type+'" data-rate="'+r.price_per_night+'"'+(isCurrent?' selected':'')+'>'+
          r.room_number+' · '+r.room_type+' · ₹'+r.price_per_night+(isCurrent?' (current)':'')+'</option>';
      }
    });
  }

  const today = new Date().toISOString().split('T')[0];

  document.getElementById('edit-booking-body').innerHTML = `
    <div class="eb-info">
      Editing booking for <strong>${currentEditBooking.guest_name}</strong> · PNR: <strong>${currentEditBooking.pnr||'—'}</strong>
    </div>

    ${currentEditBooking.edits_count > 0 ? '<div class="eb-history">⚠️ This booking has been edited '+currentEditBooking.edits_count+' time'+(currentEditBooking.edits_count>1?'s':'')+' before. Last edit: '+new Date(currentEditBooking.edited_at).toLocaleString('en-IN')+'</div>' : ''}

    <div class="eb-row">
      <div class="eb-field">
        <label class="eb-label">Check-in date *</label>
        <input type="date" id="edit-checkin" class="eb-input" value="${currentEditBooking.checkin}" min="${today}" onchange="validateEditForm()"/>
      </div>
      <div class="eb-field">
        <label class="eb-label">Check-out date *</label>
        <input type="date" id="edit-checkout" class="eb-input" value="${currentEditBooking.checkout}" min="${today}" onchange="validateEditForm()"/>
      </div>
    </div>

    <div class="eb-field">
      <label class="eb-label">Room *</label>
      <select id="edit-room" class="eb-input" onchange="onEditRoomChange()">
        ${roomOptions || '<option>No rooms available</option>'}
      </select>
    </div>

    <div class="eb-field">
      <label class="eb-label">Rate per night (₹) *</label>
      <input type="number" id="edit-rate" class="eb-input" value="${currentEditBooking.rate||0}" min="1" step="100" onchange="validateEditForm()"/>
    </div>

    <div class="eb-field">
      <label class="eb-label">Reason for edit * <span style="text-transform:none;font-weight:400;color:var(--muted)">(required — for audit trail)</span></label>
      <textarea id="edit-reason" class="eb-input" rows="2" placeholder="e.g. Guest requested to extend stay by 2 days"></textarea>
    </div>

    <div id="edit-conflict-warn" class="eb-warn"></div>

    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="closeEditBookingModal()" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif">Cancel</button>
      <button id="edit-save-btn" onclick="saveBookingEdit()" style="flex:1;padding:11px;border:none;border-radius:8px;background:var(--blue);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">Save changes</button>
    </div>
  `;
}

function onEditRoomChange(){
  // When room changes, auto-fill its rate
  const sel = document.getElementById('edit-room');
  const opt = sel.options[sel.selectedIndex];
  const rate = opt.getAttribute('data-rate');
  if(rate) document.getElementById('edit-rate').value = rate;
  validateEditForm();
}

function validateEditForm(){
  const warn = document.getElementById('edit-conflict-warn');
  const ci = document.getElementById('edit-checkin').value;
  const co = document.getElementById('edit-checkout').value;
  const rate = parseFloat(document.getElementById('edit-rate').value) || 0;

  let msg = '';
  if(ci && co && ci >= co) msg = 'Check-out must be after check-in date.';
  if(rate <= 0) msg = 'Rate must be greater than 0.';

  if(msg){
    warn.textContent = '⚠️ ' + msg;
    warn.classList.add('show');
  } else {
    warn.classList.remove('show');
  }
}

async function saveBookingEdit(){
  if(!currentEditBooking) return;
  const b = currentEditBooking;

  const newCheckin = document.getElementById('edit-checkin').value;
  const newCheckout = document.getElementById('edit-checkout').value;
  const newRoom = document.getElementById('edit-room').value;
  const newRate = parseFloat(document.getElementById('edit-rate').value) || 0;
  const reason = document.getElementById('edit-reason').value.trim();

  // Validation
  if(!newCheckin || !newCheckout){ alert('Check-in and check-out dates required.'); return; }
  if(newCheckin >= newCheckout){ alert('Check-out must be after check-in.'); return; }
  if(!newRoom){ alert('Room required.'); return; }
  if(newRate <= 0){ alert('Rate must be greater than 0.'); return; }
  if(!reason){ alert('Reason for edit is required (for audit trail).'); return; }

  // Detect what actually changed
  const changes = [];
  if(newCheckin !== b.checkin) changes.push('Check-in: '+b.checkin+' → '+newCheckin);
  if(newCheckout !== b.checkout) changes.push('Check-out: '+b.checkout+' → '+newCheckout);
  if(newRoom !== b.room_no) changes.push('Room: '+b.room_no+' → '+newRoom);
  if(newRate !== parseFloat(b.rate)) changes.push('Rate: ₹'+b.rate+' → ₹'+newRate);

  if(changes.length === 0){ alert('No changes detected.'); return; }

  // Conflict check on new dates/room
  const conflictRes = await sb.from('bookings').select('id, guest_name, checkin, checkout')
    .eq('room_no', newRoom)
    .neq('id', b.id)
    .in('status', ['booked','checked-in'])
    .or('and(checkin.lte.'+newCheckout+',checkout.gte.'+newCheckin+')');

  if(conflictRes.data && conflictRes.data.length > 0){
    const c = conflictRes.data[0];
    alert('⛔ CONFLICT — Room '+newRoom+' is not free for these dates.\n\nConflicts with: '+c.guest_name+' ('+c.checkin+' → '+c.checkout+')');
    return;
  }

  // Get room type for new room (in case room changed)
  let newRoomType = b.room_type;
  if(newRoom !== b.room_no && typeof roomsData !== 'undefined'){
    const r = roomsData.find(function(rm){return rm.room_number === newRoom;});
    if(r) newRoomType = r.room_type;
  }

  if(!confirm('Save these changes?\n\n'+changes.join('\n')+'\n\nReason: '+reason)) return;

  // Save
  const updRes = await sb.from('bookings').update({
    checkin: newCheckin,
    checkout: newCheckout,
    room_no: newRoom,
    room_type: newRoomType,
    rate: newRate,
    edited_at: new Date().toISOString(),
    edits_count: (b.edits_count || 0) + 1
  }).eq('id', b.id);

  if(updRes.error){ alert('Save failed: '+updRes.error.message); return; }

  // Audit log to activity feed (Fix F)
  if(typeof addActivity === 'function'){
    addActivity('✏️ Edited booking — '+b.guest_name+' · '+changes.join(', ')+' · Reason: '+reason);
  }

  alert('✅ Booking updated successfully.');
  closeEditBookingModal();
  if(typeof loadBookings === 'function') await loadBookings();
  await openBookingDetail(b.id);
}

function closeEditBookingModal(){
  document.getElementById('edit-booking-modal').classList.remove('open');
  currentEditBooking = null;
}

// ── STAGE H — MARK AS NO-SHOW (added per PK feedback) ───────────────────────

var currentNoShowBooking = null;

async function openNoShowModal(bookingId, guestName, roomNo){
  document.getElementById('noshow-modal').classList.add('open');
  document.getElementById('noshow-body').innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">Loading…</div>';

  const bRes = await sb.from('bookings').select('*').eq('id', bookingId).single();
  if(bRes.error || !bRes.data){
    document.getElementById('noshow-body').innerHTML = '<p style="color:var(--red)">Could not load booking.</p>';
    return;
  }
  currentNoShowBooking = bRes.data;
  const b = bRes.data;

  const today = new Date().toISOString().split('T')[0];
  const daysOverdue = Math.floor((new Date(today) - new Date(b.checkin)) / 86400000);

  document.getElementById('noshow-body').innerHTML = `
    <div style="padding:12px 14px;background:#fee2e2;border-radius:8px;font-size:13px;color:#b91c1c;margin-bottom:14px;line-height:1.5">
      <strong>⚠️ ${b.guest_name}</strong> was expected to arrive on <strong>${b.checkin}</strong> · ${daysOverdue} day${daysOverdue!==1?'s':''} ago.
    </div>

    <div style="font-size:13px;color:var(--text);margin-bottom:8px;line-height:1.5">
      <strong>Before marking no-show, confirm:</strong>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.6">
      ☐ Tried calling the guest's phone<br>
      ☐ Sent WhatsApp message<br>
      ☐ Sent email reminder<br>
      ☐ Waited until check-in cutoff time
    </div>

    <div class="eb-field">
      <label class="eb-label">Contact attempts * <span style="text-transform:none;font-weight:400;color:var(--muted)">(required for audit)</span></label>
      <textarea id="noshow-contact" class="eb-input" rows="3" placeholder="e.g. Called at 3 PM — phone switched off. WhatsApp sent at 4 PM — no reply. Email sent at 5 PM."></textarea>
    </div>

    <div class="eb-field">
      <label class="eb-label">Additional notes <span style="text-transform:none;font-weight:400;color:var(--muted)">(optional)</span></label>
      <textarea id="noshow-notes" class="eb-input" rows="2" placeholder="Any other context worth recording"></textarea>
    </div>

    <div style="padding:10px 12px;background:var(--blue-light);border-radius:6px;font-size:11px;color:var(--blue);margin-bottom:14px;line-height:1.5">
      💡 <strong>Note:</strong> No-show booking is closed. Room stays available for other bookings. For OTA bookings, refer to the OTA's no-show policy for billing.
    </div>

    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="closeNoShowModal()" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif">Cancel</button>
      <button onclick="confirmNoShow('${bookingId}','${guestName.replace(/'/g,'&#39;')}','${roomNo}')" style="flex:1;padding:11px;border:none;border-radius:8px;background:#b91c1c;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">🚫 Confirm no-show</button>
    </div>
  `;
}

async function confirmNoShow(bookingId, guestName, roomNo){
  const contact = document.getElementById('noshow-contact').value.trim();
  const notes = document.getElementById('noshow-notes').value.trim();

  if(!contact){
    alert('⚠️ Please document your contact attempts before marking as no-show.\n\nThis is required for the audit trail.');
    return;
  }

  if(!confirm('Mark ' + guestName + ' as NO-SHOW?\n\nThis will:\n• Close the booking (status: no-show)\n• Keep room ' + roomNo + ' available for other bookings\n• Log all your contact attempts\n\nProceed?')) return;

  const today = new Date().toISOString().split('T')[0];
  const existingNotes = (currentNoShowBooking && currentNoShowBooking.notes) || '';
  const noShowEntry = '[NO-SHOW ' + today + '] Contact attempts: ' + contact + (notes ? ' | Notes: ' + notes : '');
  const newNotes = existingNotes ? (existingNotes + '\n\n' + noShowEntry) : noShowEntry;

  const updRes = await sb.from('bookings').update({
    status: 'no-show',
    notes: newNotes
  }).eq('id', bookingId);

  if(updRes.error){ alert('Error: ' + updRes.error.message); return; }

  if(typeof addActivity === 'function') addActivity('🚫 No-show — ' + guestName + ' (Room ' + roomNo + ') · ' + contact.substring(0,60) + (contact.length > 60 ? '…' : ''));

  closeNoShowModal();
  if(typeof loadBookings === 'function') await loadBookings();
  await openBookingDetail(bookingId);
}

function closeNoShowModal(){
  document.getElementById('noshow-modal').classList.remove('open');
  currentNoShowBooking = null;
}

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

// ── BOOKING-DETAIL.JS — booking detail modal, mark paid ──────────────────────

async function openBookingDetail(bookingId){
  document.getElementById('booking-detail-modal').classList.add('open');
  document.getElementById('booking-detail-body').innerHTML='<div style="text-align:center;padding:20px;color:var(--muted)">Loading...</div>';

  const {data:b}    = await sb.from('bookings').select('*').eq('id',bookingId).single();
  const {data:reqs} = await sb.from('guest_requests').select('*').eq('booking_id',bookingId).order('created_at',{ascending:false});

  if(!b){ document.getElementById('booking-detail-body').innerHTML='<p>Booking not found.</p>'; return; }

  const requests   = reqs||[];
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

    <div style="margin-top:12px;display:flex;gap:8px">
      <button onclick="showLinkModal('${b.id}','${b.guest_name}','${b.guest_phone}','${b.source||''}')" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif">📱 Resend guest link</button>
      <button onclick="closeBookingDetail()" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--blue);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">Done</button>
    </div>
  `;
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

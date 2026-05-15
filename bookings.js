// ── BOOKINGS.JS — load bookings, save booking, stats, activity, email ─────────

async function sendGuestEmail(booking, guestLink){
  if(!booking.guest_email) return;
  const hotelName = document.getElementById('sb-hotel').textContent || 'Your Hotel';
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE, template_id: EMAILJS_TEMPLATE,
        user_id: 'cN1ObzWUbGHOYpSnA',
        template_params:{
          to_email:booking.guest_email, hotel_name:hotelName,
          guest_name:booking.guest_name, room_no:booking.room_no,
          room_type:booking.room_type||'', checkin:booking.checkin,
          checkout:booking.checkout, source:booking.source||'Direct',
          pnr:booking.pnr||'N/A', guest_link:guestLink, email:booking.guest_email
        }
      })
    });
    if(res.ok) console.log('Email sent to',booking.guest_email);
    else console.error('Email error:', await res.text());
  } catch(e){ console.error('Email failed:',e); }
}

async function loadBookings(){
  const tbody = document.getElementById('guest-tbody');
  tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Loading bookings…</td></tr>';

  const {data,error} = await sb.from('bookings').select('*')
    .eq('user_id',currentUserId).order('created_at',{ascending:false});
  if(error){ console.error(error); return; }
  bookings = data || [];

  if(bookings.length===0){
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No bookings yet — add your first booking above</td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map(b=>`
    <tr style="cursor:pointer" onclick="openBookingDetail('${b.id}')">
      <td>
        <div class="guest-name">${b.guest_name}</div>
        <div style="font-size:11px;color:var(--muted)">${b.guest_phone}</div>
      </td>
      <td>${b.room_no} <span style="font-size:11px;color:var(--muted)">${b.room_type||''}</span></td>
      <td>${b.pnr?`<span style="font-size:12px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:2px 7px;border-radius:5px">${b.pnr}</span>`:'<span style="color:var(--muted);font-size:12px">—</span>'}</td>
      <td>${b.checkin}</td>
      <td>${b.checkout}</td>
      <td><span class="source-badge">${b.source||'Direct'}</span></td>
      <td onclick="event.stopPropagation()">
        <span class="badge badge-checkedin">${b.status||'Booked'}</span>
        <button onclick="showLinkModal('${b.id}','${b.guest_name}','${b.guest_phone}','${b.source||''}','${b.pnr||''}')" style="margin-left:6px;font-size:11px;padding:3px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);cursor:pointer;color:var(--blue);font-family:'DM Sans',sans-serif">📱 Send link</button>
      </td>
    </tr>
  `).join('');

  const today = new Date().toISOString().split('T')[0];
  bookings.forEach(b=>{
    if(b.checkin<=today && b.checkout>today){
      const room = roomsData.find(r=>r.room_number===b.room_no);
      if(room) room.status='occupied';
    }
  });
  renderRooms();
  updateStats();
}

function updateStats(){
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('stat-checkins').textContent  = bookings.filter(b=>b.checkin===today).length;
  document.getElementById('stat-checkouts').textContent = bookings.filter(b=>b.checkout===today).length;
  document.getElementById('stat-occupied').textContent  = bookings.filter(b=>b.checkin<=today&&b.checkout>today).length;
}

function addActivity(text){
  const list = document.getElementById('activity-list');
  if(!list) return;
  const time = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const item = document.createElement('div');
  item.className='activity-item';
  item.innerHTML=`
    <div class="activity-dot" style="background:#1a56a0"></div>
    <div><div class="activity-text">${text}</div><div class="activity-time">${time}</div></div>`;
  // Safely clear placeholder if present
  try {
    if(list.children.length===1){
      const placeholderText = list.children[0].querySelector('.activity-text');
      if(placeholderText && placeholderText.textContent.includes('No activity')){
        list.innerHTML='';
      }
    }
  } catch(e) { /* ignore — just append below */ }
  list.prepend(item);
  // Cap to last 15 items to keep card tidy
  while(list.children.length > 15) list.removeChild(list.lastChild);
}

// ── ADD BOOKING MODAL ─────────────────────────────────────────────────────────
function openModal(){ document.getElementById('modal').classList.add('open'); }
function closeModal(){ document.getElementById('modal').classList.remove('open'); }
document.getElementById('modal').addEventListener('click',e=>{
  if(e.target===document.getElementById('modal')) closeModal();
});

function showModalMsg(text,type){
  const el=document.getElementById('modal-msg');
  el.textContent=text; el.className='msg '+type;
}

async function saveBooking(){
  const pnr             = document.getElementById('pnr').value.trim();
  const source          = document.getElementById('source').value;
  const guest_firstname = document.getElementById('guest_firstname').value.trim();
  const guest_lastname  = document.getElementById('guest_lastname').value.trim();
  const guest_name      = (guest_firstname+' '+guest_lastname).trim();
  const guest_phone     = document.getElementById('guest_phone').value.trim();
  const guest_email     = document.getElementById('guest_email').value.trim();
  const pax_count       = document.getElementById('pax_count').value;
  const room_no         = document.getElementById('room_no').value;
  const room_type       = document.getElementById('room_type').value;
  const checkin         = document.getElementById('checkin').value;
  const checkout        = document.getElementById('checkout').value;
  const arrival_time    = document.getElementById('arrival_time').value;
  const rate            = document.getElementById('rate').value;
  const early_checkin   = document.getElementById('early_checkin').value;
  const late_checkout   = document.getElementById('late_checkout').value;
  const notes           = document.getElementById('notes').value.trim();
  const btn             = document.getElementById('save-btn');

  if(!guest_firstname||!guest_lastname||!guest_phone||!room_no||!room_type||!checkin||!checkout||!source){
    showModalMsg('Please fill in all required fields.','error'); return;
  }
  btn.disabled=true; btn.textContent='Saving…';

  const hotelName = document.getElementById('sb-hotel').textContent||'';
  const {data,error} = await sb.from('bookings').insert([{
    user_id:currentUserId, hotel_name:hotelName, upi_id:currentUpiId||null,
    pnr, source, guest_name, guest_phone, guest_email,
    pax_count, room_no, room_type, checkin, checkout,
    arrival_time, rate:rate||null, early_checkin, late_checkout, notes, status:'booked'
  }]).select();

  if(error){ showModalMsg('Error: '+error.message,'error'); btn.disabled=false; btn.textContent='Save booking →'; return; }
  if(!data||data.length===0){ showModalMsg('Saved but could not get booking ID. Refresh and try again.','error'); btn.disabled=false; btn.textContent='Save booking →'; return; }

  addActivity(`New booking — ${guest_name}, Room ${room_no} (${source}${pnr?' · '+pnr:''})`);
  showModalMsg('✓ Booking saved! Sending email to guest…','success');
  btn.textContent='Saved!';
  await loadBookings();

  const savedId  = data[0].id;
  const baseUrl  = window.location.origin;
  const guestLink= `${baseUrl}/guest.html?booking=${savedId}`;

  if(guest_email){
    await sendGuestEmail({guest_name,guest_email,room_no,room_type,checkin,checkout,source,pnr}, guestLink);
    showModalMsg('✓ Booking saved! Email sent to guest automatically.','success');
    addActivity(`Email sent to ${guest_name} (${guest_email})`);
  } else {
    showModalMsg('✓ Booking saved! No email provided — share link manually.','success');
  }

  setTimeout(()=>{
    closeModal();
    btn.disabled=false; btn.textContent='Save booking →';
    document.getElementById('modal-msg').className='msg';
    showLinkModal(savedId, guest_name, guest_phone, source, pnr);
  },1500);
}

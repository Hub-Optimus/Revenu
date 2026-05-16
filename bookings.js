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
  if(typeof applyBPFilters==='function') try{applyBPFilters();}catch(e){console.error(e);}
  if(typeof updatePendingBadge==='function') try{updatePendingBadge();}catch(e){console.error(e);}
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
function openModal(){
  document.getElementById('modal').classList.add('open');
  resetBookingForm();
}
function closeModal(){ document.getElementById('modal').classList.remove('open'); }
document.getElementById('modal').addEventListener('click',function(e){
  if(e.target===document.getElementById('modal')) closeModal();
});

function resetBookingForm(){
  ['pnr','guest_firstname','guest_lastname','guest_phone','guest_email','room_type','rate','notes','arrival_time'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('source').value='';
  document.getElementById('room_no').value='';
  var rpd=document.getElementById('room-picker-display');
  if(rpd) rpd.value='';
  document.getElementById('pax_count').value='2';
  document.getElementById('gst_inclusive').checked=true;
  document.getElementById('returning-guest-notice').style.display='none';
  document.getElementById('room-conflict-warn').style.display='none';
  document.getElementById('gst-note').innerHTML='';
  document.getElementById('pnr-label').textContent='PNR / Booking ID';
  document.getElementById('pnr-note').textContent='';
  document.getElementById('pnr').placeholder='Select booking source first';
  document.getElementById('modal-msg').className='msg';
  var today=new Date().toISOString().split('T')[0];
  var tom=new Date(); tom.setDate(tom.getDate()+1);
  document.getElementById('checkin').value=today;
  document.getElementById('checkout').value=tom.toISOString().split('T')[0];
}

// ── SOURCE → PNR AUTO-GENERATION ─────────────────────────────────────────────
var IN_HOUSE_SOURCES = ['Walk-in','Direct / phone','Corporate'];

function generatePNR(hotelName){
  var code=(hotelName||'XXX').replace(/[^a-zA-Z]/g,'').substring(0,3).toUpperCase();
  while(code.length<3) code+='X';
  var d=new Date();
  var yy=String(d.getFullYear()).slice(-2);
  var mm=String(d.getMonth()+1).padStart(2,'0');
  var dd=String(d.getDate()).padStart(2,'0');
  var hh=String(d.getHours()).padStart(2,'0');
  var mi=String(d.getMinutes()).padStart(2,'0');
  return code+'-'+yy+mm+dd+'-'+hh+mi;
}

function handleSourceChange(){
  var source=document.getElementById('source').value;
  var pnrInput=document.getElementById('pnr');
  var pnrLabel=document.getElementById('pnr-label');
  var pnrNote=document.getElementById('pnr-note');
  if(IN_HOUSE_SOURCES.indexOf(source)>=0){
    var hotelName=document.getElementById('sb-hotel').textContent||'XXX';
    pnrInput.value=generatePNR(hotelName);
    pnrInput.readOnly=true;
    pnrInput.style.background='var(--bg)';
    pnrLabel.textContent='Auto-generated PNR';
    pnrNote.textContent='Generated automatically. Saves on commit.';
    pnrInput.placeholder='';
  } else if(source){
    pnrInput.value='';
    pnrInput.readOnly=false;
    pnrInput.style.background='';
    pnrLabel.textContent=source+' PNR / Booking ID';
    pnrNote.textContent='Enter the PNR from '+source+' confirmation.';
    var placeholders={'OYO':'e.g. OYO-839201','MakeMyTrip':'e.g. NR4291847','Booking.com':'e.g. 1234567890','Agoda':'e.g. 9876543','Goibibo':'e.g. GOI4291847','Other OTA':'Enter OTA reference'};
    pnrInput.placeholder=placeholders[source]||'OTA reference';
  } else {
    pnrInput.value='';
    pnrInput.readOnly=true;
    pnrInput.style.background='var(--bg)';
    pnrLabel.textContent='PNR / Booking ID';
    pnrNote.textContent='';
    pnrInput.placeholder='Select booking source first';
  }
}

// ── RETURNING GUEST DETECTION ────────────────────────────────────────────────
function checkReturningGuest(){
  var phone=document.getElementById('guest_phone').value.trim();
  var notice=document.getElementById('returning-guest-notice');
  if(!phone || phone.replace(/\D/g,'').length<6){ notice.style.display='none'; return; }
  var key=phone.replace(/\D/g,'').slice(-8);
  var prev=bookings.filter(function(b){
    return b.guest_phone && b.guest_phone.replace(/\D/g,'').slice(-8)===key;
  });
  if(prev.length>0){
    var latest=prev[0];
    notice.innerHTML='👋 <strong>Returning guest:</strong> '+latest.guest_name+' — last stayed '+latest.checkout+', '+prev.length+' prior booking'+(prev.length>1?'s':'')+'. Filled in details for you.';
    notice.style.display='block';
    var firstEl=document.getElementById('guest_firstname');
    var lastEl=document.getElementById('guest_lastname');
    var emailEl=document.getElementById('guest_email');
    if(!firstEl.value && !lastEl.value){
      var nameParts=latest.guest_name.split(' ');
      firstEl.value=nameParts[0]||'';
      lastEl.value=nameParts.slice(1).join(' ')||'';
    }
    if(!emailEl.value && latest.guest_email) emailEl.value=latest.guest_email;
  } else {
    notice.style.display='none';
  }
}

// ── ROOM CHANGE: AUTO-FILL TYPE, RATE, PAX ───────────────────────────────────
function handleRoomChange(){
  var roomNum=document.getElementById('room_no').value;
  var room=roomsData.find(function(r){return r.room_number===roomNum;});
  if(room){
    document.getElementById('room_type').value=room.room_type;
    document.getElementById('rate').value=room.price_per_night;
    var paxSel=document.getElementById('pax_count');
    var cap=room.capacity;
    paxSel.value=cap>=5?'5+':String(cap);
    updateGSTNote();
  } else {
    document.getElementById('room_type').value='';
    document.getElementById('rate').value='';
    document.getElementById('gst-note').innerHTML='';
  }
  checkRoomConflict();
}

// ── ROOM CONFLICT DETECTION ──────────────────────────────────────────────────
function checkRoomConflict(){
  var roomNo=document.getElementById('room_no').value;
  var ci=document.getElementById('checkin').value;
  var co=document.getElementById('checkout').value;
  var warn=document.getElementById('room-conflict-warn');
  if(!roomNo || !ci || !co){ warn.style.display='none'; return; }
  if(ci>=co){
    warn.innerHTML='⚠️ Check-out must be after check-in.';
    warn.style.display='block'; return;
  }
  var conflicts=bookings.filter(function(b){
    if(b.room_no!==roomNo) return false;
    if(b.status==='cancelled') return false;
    return !(b.checkout<=ci || b.checkin>=co);
  });
  if(conflicts.length>0){
    var c=conflicts[0];
    warn.innerHTML='⚠️ <strong>Room '+roomNo+' already booked</strong> '+c.checkin+' → '+c.checkout+' ('+c.guest_name+'). Pick another room or dates.';
    warn.style.display='block';
  } else {
    warn.style.display='none';
  }
}

// ── GST CALCULATION (India: ≤₹7,500 = 12%, >₹7,500 = 18%) ────────────────────
function updateGSTNote(){
  var rate=parseFloat(document.getElementById('rate').value)||0;
  var inclusive=document.getElementById('gst_inclusive').checked;
  var note=document.getElementById('gst-note');
  if(rate<=0){ note.innerHTML=''; return; }
  var pct=rate>7500?18:12;
  if(inclusive){
    var base=rate/(1+pct/100);
    var gst=rate-base;
    note.innerHTML='Base ₹'+base.toFixed(0)+' + '+pct+'% GST ₹'+gst.toFixed(0)+' = <strong>₹'+rate.toFixed(0)+'</strong>';
  } else {
    var gst=rate*pct/100;
    var total=rate+gst;
    note.innerHTML='Rate ₹'+rate.toFixed(0)+' + '+pct+'% GST ₹'+gst.toFixed(0)+' = <strong>₹'+total.toFixed(0)+' total</strong>';
  }
}

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
  const gst_inclusive   = document.getElementById('gst_inclusive').checked;
  const notes           = document.getElementById('notes').value.trim();
  const btn             = document.getElementById('save-btn');

  if(!source){showModalMsg('Please select a booking source first.','error'); return;}
  if(!guest_firstname||!guest_lastname){showModalMsg('Please enter guest first and last name.','error'); return;}
  if(!guest_phone){showModalMsg('Please enter guest phone number.','error'); return;}
  if(!room_no){showModalMsg('Please select a room.','error'); return;}
  if(!checkin||!checkout){showModalMsg('Please set check-in and check-out dates.','error'); return;}
  if(checkin>=checkout){showModalMsg('Check-out date must be after check-in date.','error'); return;}
  if(!rate){showModalMsg('Please enter the rate per night.','error'); return;}

  var finalConflicts=bookings.filter(function(b){
    if(b.room_no!==room_no) return false;
    if(b.status==='cancelled') return false;
    return !(b.checkout<=checkin || b.checkin>=checkout);
  });
  if(finalConflicts.length>0){
    showModalMsg('Room '+room_no+' is already booked for these dates. Please choose another room or dates.','error');
    return;
  }

  btn.disabled=true; btn.textContent='Saving…';

  const hotelName = document.getElementById('sb-hotel').textContent||'';
  const {data,error} = await sb.from('bookings').insert([{
    user_id:currentUserId, hotel_name:hotelName, upi_id:currentUpiId||null,
    pnr, source, guest_name, guest_phone, guest_email,
    pax_count, room_no, room_type, checkin, checkout,
    arrival_time, rate:rate||null, notes, status:'booked'
  }]).select();

  if(error){ showModalMsg('Error: '+error.message,'error'); btn.disabled=false; btn.textContent='Save booking →'; return; }
  if(!data||data.length===0){ showModalMsg('Saved but could not get booking ID. Refresh and try again.','error'); btn.disabled=false; btn.textContent='Save booking →'; return; }

  addActivity('New booking — '+guest_name+', Room '+room_no+' ('+source+(pnr?' · '+pnr:'')+')');
  showModalMsg('✓ Booking saved! Sending email to guest…','success');
  btn.textContent='Saved!';
  await loadBookings();

  const savedId  = data[0].id;
  const baseUrl  = window.location.origin;
  const guestLink= baseUrl+'/guest.html?booking='+savedId;

  if(guest_email){
    await sendGuestEmail({guest_name,guest_email,room_no,room_type,checkin,checkout,source,pnr}, guestLink);
    showModalMsg('✓ Booking saved! Email sent to guest automatically.','success');
    addActivity('Email sent to '+guest_name+' ('+guest_email+')');
  } else {
    showModalMsg('✓ Booking saved! No email provided — share link manually.','success');
  }

  setTimeout(function(){
    closeModal();
    btn.disabled=false; btn.textContent='Save booking →';
    document.getElementById('modal-msg').className='msg';
    showLinkModal(savedId, guest_name, guest_phone, source, pnr);
  },1500);
}

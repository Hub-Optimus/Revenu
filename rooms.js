// ── ROOMS.JS — room inventory, manage modal, add/edit/delete ─────────────────

async function loadRooms(){
  if(!currentUserId) return;
  const {data,error} = await sb.from('rooms').select('*')
    .eq('user_id',currentUserId).order('room_number');
  if(error){ console.error('Rooms load error:',error); return; }
  roomsData = data || [];
  renderRooms();
  populateRoomSelect();
}

function renderRooms(){
  const grid = document.getElementById('room-grid');
  if(roomsData.length===0){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:28px 20px;color:var(--muted)">
      <div style="font-size:24px;margin-bottom:8px">🏨</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">No rooms set up yet</div>
      <div style="font-size:12px;margin-bottom:12px">Add your rooms to start tracking inventory</div>
      <button onclick="openRoomsModal()" style="padding:8px 16px;background:var(--blue);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">Set up rooms →</button>
    </div>`;
    document.getElementById('room-summary').textContent = 'No rooms yet';
    document.getElementById('stat-occupied').textContent = '0';
    return;
  }
  grid.innerHTML = roomsData.map(r=>`
    <div class="room-cell ${r.status}" onclick="openRoomEdit('${r.id}')"
      title="Room ${r.room_number} — ${r.room_type} — Click to edit">
      <div class="room-num">${r.room_number}</div>
      <div class="room-type">${r.room_type.substring(0,4)}</div>
      <div class="room-status-text">${statusLabel[r.status]||r.status}</div>
    </div>
  `).join('');
  const avail = roomsData.filter(r=>r.status==='available').length;
  const occ   = roomsData.filter(r=>r.status==='occupied').length;
  document.getElementById('room-summary').textContent = `${avail} available · ${occ} occupied`;
  document.getElementById('stat-occupied').textContent = occ;
}

function populateRoomSelect(){
  const sel = document.getElementById('room_no');
  sel.innerHTML = '<option value="">Select room…</option>';
  roomsData.filter(r=>r.status==='available').forEach(r=>{
    const o = document.createElement('option');
    o.value = r.room_number;
    o.textContent = `Room ${r.room_number} — ${r.room_type}`;
    sel.appendChild(o);
  });
}

// ── MANAGE ROOMS MODAL ────────────────────────────────────────────────────────
function openRoomsModal(){
  document.getElementById('rooms-modal').classList.add('open');
  renderRoomsList();
}
function closeRoomsModal(){
  document.getElementById('rooms-modal').classList.remove('open');
  document.getElementById('add-room-form').classList.remove('open');
}
document.getElementById('rooms-modal').addEventListener('click',e=>{
  if(e.target===document.getElementById('rooms-modal')) closeRoomsModal();
});

function toggleAddRoomForm(){
  const form = document.getElementById('add-room-form');
  form.classList.toggle('open');
  const btn = document.getElementById('add-room-toggle');
  if(form.classList.contains('open')){
    document.getElementById('new-room-num').focus();
    btn.innerHTML = '✕ Cancel';
  } else {
    btn.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Add room';
  }
}

function renderRoomsList(){
  const list  = document.getElementById('rooms-list');
  const count = document.getElementById('rooms-count');
  count.textContent = `${roomsData.length} room${roomsData.length!==1?'s':''} set up`;
  if(roomsData.length===0){
    list.innerHTML = '<div class="rooms-empty">No rooms yet. Click "Add room" to get started.</div>';
    return;
  }
  list.innerHTML = roomsData.map(r=>`
    <div class="room-row">
      <div class="room-row-num">${r.room_number}</div>
      <div class="room-row-type">${r.room_type}</div>
      <div class="room-row-cap">${r.capacity} guest${r.capacity!=1?'s':''}</div>
      <div class="room-row-price">₹${Number(r.price_per_night).toLocaleString('en-IN')}/night</div>
      <button class="rm-edit" onclick="openRoomEdit('${r.id}')" title="Edit room">✏️</button>
      <button class="rm-del"  onclick="deleteRoom('${r.id}')"   title="Delete room">🗑</button>
    </div>
  `).join('');
}

async function saveNewRoom(){
  const num   = document.getElementById('new-room-num').value.trim();
  const type  = document.getElementById('new-room-type').value;
  const cap   = parseInt(document.getElementById('new-room-cap').value);
  const price = parseFloat(document.getElementById('new-room-price').value)||0;
  const btn   = document.getElementById('save-room-btn');
  const msg   = document.getElementById('rooms-msg');

  if(!num||!type){ msg.textContent='Please enter room number and type.'; msg.className='msg error'; return; }
  if(roomsData.find(r=>r.room_number===num)){
    msg.textContent=`Room ${num} already exists.`; msg.className='msg error'; return;
  }
  btn.disabled=true; btn.textContent='Saving…';

  const {data,error} = await sb.from('rooms').insert([{
    user_id:currentUserId, room_number:num, room_type:type,
    capacity:cap, price_per_night:price, status:'available'
  }]).select();

  if(error){
    msg.textContent='Error: '+error.message; msg.className='msg error';
    btn.disabled=false; btn.textContent='Save room →'; return;
  }
  roomsData.push(data[0]);
  roomsData.sort((a,b)=>a.room_number.localeCompare(b.room_number,undefined,{numeric:true}));

  document.getElementById('new-room-num').value='';
  document.getElementById('new-room-type').value='';
  document.getElementById('new-room-price').value='';
  btn.disabled=false; btn.textContent='Save room →';
  msg.textContent=`✓ Room ${num} added!`; msg.className='msg success';
  setTimeout(()=>{ msg.className='msg'; },3000);

  toggleAddRoomForm();
  renderRoomsList();
  renderRooms();
  populateRoomSelect();
  addActivity(`Room ${num} (${type}) added to inventory`);
}

async function deleteRoom(roomId){
  if(!confirm('Remove this room from your inventory?')) return;
  const {error} = await sb.from('rooms').delete().eq('id',roomId);
  if(error){ alert('Error: '+error.message); return; }
  roomsData = roomsData.filter(r=>r.id!==roomId);
  renderRoomsList();
  renderRooms();
  populateRoomSelect();
}

// ── ROOM EDIT MODAL ───────────────────────────────────────────────────────────
function openRoomEdit(roomId){
  const r = roomsData.find(x=>x.id===roomId);
  if(!r) return;

  document.getElementById('room-edit-id').value           = r.id;
  document.getElementById('room-edit-title').textContent  = `Room ${r.room_number}`;
  document.getElementById('room-edit-num-display').textContent = r.room_number;
  document.getElementById('room-edit-price').value        = r.price_per_night;
  document.getElementById('room-edit-msg').className      = 'msg';

  // Set selects to current values
  const typeEl = document.getElementById('room-edit-type');
  for(let i=0;i<typeEl.options.length;i++){
    if(typeEl.options[i].value===r.room_type){ typeEl.selectedIndex=i; break; }
  }
  const capEl = document.getElementById('room-edit-cap');
  for(let i=0;i<capEl.options.length;i++){
    if(parseInt(capEl.options[i].value)===r.capacity){ capEl.selectedIndex=i; break; }
  }
  const stEl = document.getElementById('room-edit-status');
  for(let i=0;i<stEl.options.length;i++){
    if(stEl.options[i].value===r.status){ stEl.selectedIndex=i; break; }
  }

  document.getElementById('room-edit-modal').classList.add('open');
}

function closeRoomEdit(){
  document.getElementById('room-edit-modal').classList.remove('open');
}
document.getElementById('room-edit-modal').addEventListener('click',e=>{
  if(e.target===document.getElementById('room-edit-modal')) closeRoomEdit();
});

async function saveRoomEdit(){
  const id     = document.getElementById('room-edit-id').value;
  const type   = document.getElementById('room-edit-type').value;
  const cap    = parseInt(document.getElementById('room-edit-cap').value);
  const price  = parseFloat(document.getElementById('room-edit-price').value)||0;
  const status = document.getElementById('room-edit-status').value;
  const btn    = document.getElementById('room-edit-save-btn');
  const msg    = document.getElementById('room-edit-msg');

  btn.disabled=true; btn.textContent='Saving…';

  const {error} = await sb.from('rooms').update({
    room_type:type, capacity:cap, price_per_night:price, status
  }).eq('id',id);

  if(error){
    msg.textContent='Error: '+error.message; msg.className='msg error';
    btn.disabled=false; btn.textContent='Save changes →'; return;
  }

  // Update local data
  const r = roomsData.find(x=>x.id===id);
  if(r){ r.room_type=type; r.capacity=cap; r.price_per_night=price; r.status=status; }

  btn.disabled=false; btn.textContent='Save changes →';
  msg.textContent='✓ Changes saved!'; msg.className='msg success';
  setTimeout(()=>{ closeRoomEdit(); msg.className='msg'; },1200);

  renderRooms();
  renderRoomsList();
  populateRoomSelect();
  addActivity(`Room ${r?r.room_number:''} updated — ${type}, ${statusLabel[status]||status}`);
}

async function deleteRoomFromEdit(){
  const id = document.getElementById('room-edit-id').value;
  const r  = roomsData.find(x=>x.id===id);
  if(!confirm(`Delete Room ${r?r.room_number:''}? This cannot be undone.`)) return;

  const {error} = await sb.from('rooms').delete().eq('id',id);
  if(error){ alert('Error: '+error.message); return; }

  roomsData = roomsData.filter(x=>x.id!==id);
  closeRoomEdit();
  renderRooms();
  renderRoomsList();
  populateRoomSelect();
  addActivity(`Room ${r?r.room_number:''} removed from inventory`);
}

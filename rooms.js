// ── ROOMS.JS — room inventory, manage modal, add/edit/delete, CSV import ──────

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
  var snap = document.getElementById('room-snapshot');
  if(!snap) return;

  if(roomsData.length===0){
    snap.innerHTML='<div style="text-align:center;padding:24px 20px;color:var(--muted)">'+
      '<div style="font-size:28px;margin-bottom:8px">🏨</div>'+
      '<div style="font-size:13px;font-weight:600;margin-bottom:4px">No rooms set up yet</div>'+
      '<div style="font-size:12px;margin-bottom:12px">Add rooms or bulk-import via CSV</div>'+
      '<button onclick="showRoomsPage()" style="padding:8px 16px;background:var(--blue);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif">Set up rooms →</button>'+
      '</div>';
    document.getElementById('stat-occupied').textContent='0';
    return;
  }

  var total = roomsData.length;
  var avail = roomsData.filter(function(r){return r.status==='available';}).length;
  var occ   = roomsData.filter(function(r){return r.status==='occupied';}).length;
  var cln   = roomsData.filter(function(r){return r.status==='cleaning';}).length;
  var mnt   = roomsData.filter(function(r){return r.status==='maintenance';}).length;

  // Count available by type
  var availByType = {};
  roomsData.filter(function(r){return r.status==='available';}).forEach(function(r){
    availByType[r.room_type] = (availByType[r.room_type]||0) + 1;
  });
  // Include zero-count types that exist in inventory but have no available rooms
  var allTypes = {};
  roomsData.forEach(function(r){ allTypes[r.room_type]=true; });
  var typeRows = Object.keys(allTypes).sort().map(function(t){
    var c = availByType[t]||0;
    return '<div class="snap-type-row"><span class="snap-type-name">'+t+'</span><span class="snap-type-count'+(c===0?' zero':'')+'">'+c+'</span></div>';
  }).join('');

  var pills = '';
  pills += '<span class="snap-pill snap-pill-occ">🛏️ '+occ+' occupied</span>';
  if(cln>0) pills += '<span class="snap-pill snap-pill-cln">🧹 '+cln+' cleaning</span>';
  if(mnt>0) pills += '<span class="snap-pill snap-pill-mnt">🔧 '+mnt+' maintenance</span>';

  snap.innerHTML =
    '<div class="snap-row">'+
      '<div class="snap-tile snap-tile-tot">'+
        '<div class="snap-tile-val">'+total+'</div>'+
        '<div class="snap-tile-lbl">Total rooms</div>'+
      '</div>'+
      '<div class="snap-tile snap-tile-avl">'+
        '<div class="snap-tile-val">'+avail+'</div>'+
        '<div class="snap-tile-lbl">Available now</div>'+
      '</div>'+
    '</div>'+
    '<div class="snap-pills">'+pills+'</div>'+
    '<div class="snap-section-lbl">Available by type</div>'+
    typeRows;

  document.getElementById('stat-occupied').textContent = occ;
}

function populateRoomSelect(){
  const sel = document.getElementById('room_no');
  sel.innerHTML = '<option value="">Select room...</option>';
  roomsData.filter(r=>r.status==='available').forEach(r=>{
    const o = document.createElement('option');
    o.value = r.room_number;
    o.textContent = `Room ${r.room_number} — ${r.room_type}`;
    sel.appendChild(o);
  });
}

// Auto-fill actual rate when room selected in booking form
document.getElementById('room_no').addEventListener('change', function(){
  const room = roomsData.find(r=>r.room_number===this.value);
  if(room && room.price_per_night){
    document.getElementById('rate').value = room.price_per_night;
  } else {
    document.getElementById('rate').value = '';
  }
});

// ── MANAGE ROOMS MODAL ────────────────────────────────────────────────────────
function openRoomsModal(){
  document.getElementById('rooms-modal').classList.add('open');
  document.getElementById('rooms-msg').className='msg';
  // Auto-open add form since that's all the modal now shows
  document.getElementById('add-room-form').classList.add('open');
  document.getElementById('new-room-num').focus();
}
function closeRoomsModal(){
  document.getElementById('rooms-modal').classList.remove('open');
  document.getElementById('add-room-form').classList.remove('open');
}
document.getElementById('rooms-modal').addEventListener('click',e=>{
  if(e.target===document.getElementById('rooms-modal')) closeRoomsModal();
});

function toggleAddRoomForm(){
  // no-op: form is always open in simplified modal
}

function renderRoomsList(){
  var list=document.getElementById('rooms-list');
  if(!list) return; // rooms list removed from modal — handled by rooms page
  var count=document.getElementById('rooms-count');
  if(count) count.textContent=roomsData.length+' room'+(roomsData.length!==1?'s':'')+' set up';
  list.innerHTML=roomsData.length===0?'<div class="rooms-empty">No rooms yet.</div>':
    roomsData.map(function(r){return'<div class="room-row"><div class="room-row-num">'+r.room_number+'</div><div class="room-row-type">'+r.room_type+'</div><div class="room-row-cap">'+r.capacity+' guest'+(r.capacity!=1?'s':'')+'</div><div class="room-row-price">₹'+Number(r.price_per_night).toLocaleString('en-IN')+'/night</div><button class="rm-edit" onclick="openRoomView(\''+r.id+'\')" title="View/edit">✏️</button><button class="rm-del" onclick="deleteRoom(\''+r.id+'\')" title="Delete">🗑</button></div>';}).join('');
}

async function saveNewRoom(){
  const num   = document.getElementById('new-room-num').value.trim();
  const type  = document.getElementById('new-room-type').value;
  const cap   = parseInt(document.getElementById('new-room-cap').value);
  const price = parseFloat(document.getElementById('new-room-price').value)||0;
  const btn   = document.getElementById('save-room-btn');
  const msg   = document.getElementById('rooms-msg');
  if(!num||!type){ msg.textContent='Please enter room number and type.'; msg.className='msg error'; return; }
  if(roomsData.find(r=>r.room_number===num)){ msg.textContent=`Room ${num} already exists.`; msg.className='msg error'; return; }
  btn.disabled=true; btn.textContent='Saving...';
  const {data,error} = await sb.from('rooms').insert([{
    user_id:currentUserId, room_number:num, room_type:type,
    capacity:cap, price_per_night:price, status:'available'
  }]).select();
  if(error){ msg.textContent='Error: '+error.message; msg.className='msg error'; btn.disabled=false; btn.textContent='Save room →'; return; }
  roomsData.push(data[0]);
  roomsData.sort((a,b)=>a.room_number.localeCompare(b.room_number,undefined,{numeric:true}));
  document.getElementById('new-room-num').value='';
  document.getElementById('new-room-type').value='';
  document.getElementById('new-room-price').value='';
  btn.disabled=false; btn.textContent='Save room →';
  msg.textContent='Room '+num+' added!'; msg.className='msg success';
  setTimeout(()=>{ msg.className='msg'; },3000);
  toggleAddRoomForm();
  renderRoomsList();
  renderRooms();
  populateRoomSelect();
  addActivity('Room '+num+' ('+type+') added to inventory');
}

async function deleteRoom(roomId){
  var r = roomsData.find(function(x){return x.id===roomId;});
  if(!confirm('Remove this room from your inventory?')) return;
  const {error} = await sb.from('rooms').delete().eq('id',roomId);
  if(error){ alert('Error: '+error.message); return; }
  roomsData = roomsData.filter(r=>r.id!==roomId);
  renderRoomsList();
  renderRooms();
  populateRoomSelect();
  if(r) addActivity('Room '+r.room_number+' deleted from inventory');
}

// ── ROOM VIEW/EDIT MODAL ──────────────────────────────────────────────────────
var statusColors = {available:'#15803d',occupied:'#1a56a0',checkout:'#92400e',cleaning:'#166534',maintenance:'#b91c1c'};
var statusEmoji  = {available:'✅',occupied:'🛏️',checkout:'🚪',cleaning:'🧹',maintenance:'🔧'};

function openRoomView(roomId){
  const r = roomsData.find(x=>x.id===roomId);
  if(!r) return;
  document.getElementById('room-edit-id').value      = r.id;
  document.getElementById('room-edit-old-num').value = r.room_number;
  document.getElementById('room-edit-msg').className = 'msg';
  document.getElementById('room-edit-title').textContent = 'Room '+r.room_number;
  document.getElementById('view-room-type').textContent  = r.room_type;
  document.getElementById('view-room-cap').textContent   = r.capacity+' guest'+(r.capacity!=1?'s':'');
  document.getElementById('view-room-price').textContent = '₹'+Number(r.price_per_night).toLocaleString('en-IN')+'/night';
  var stEl = document.getElementById('view-room-status');
  stEl.textContent = (statusEmoji[r.status]||'')+' '+(statusLabel[r.status]||r.status);
  stEl.style.color = statusColors[r.status]||'';
  document.getElementById('room-edit-num').value   = r.room_number;
  document.getElementById('room-edit-price').value = r.price_per_night;
  var typeEl = document.getElementById('room-edit-type');
  for(var i=0;i<typeEl.options.length;i++) if(typeEl.options[i].value===r.room_type){typeEl.selectedIndex=i;break;}
  var capEl = document.getElementById('room-edit-cap');
  for(var i=0;i<capEl.options.length;i++) if(parseInt(capEl.options[i].value)===r.capacity){capEl.selectedIndex=i;break;}
  var stSelectEl = document.getElementById('room-edit-status');
  for(var i=0;i<stSelectEl.options.length;i++) if(stSelectEl.options[i].value===r.status){stSelectEl.selectedIndex=i;break;}
  document.getElementById('room-view-mode').style.display='block';
  document.getElementById('room-edit-mode').style.display='none';
  document.getElementById('room-num-warn').style.display='none';
  document.getElementById('room-edit-modal').classList.add('open');
}

function enterRoomEditMode(){
  document.getElementById('room-view-mode').style.display='none';
  document.getElementById('room-edit-mode').style.display='block';
  document.getElementById('room-edit-num').focus();
}

function exitRoomEditMode(){
  document.getElementById('room-view-mode').style.display='block';
  document.getElementById('room-edit-mode').style.display='none';
  document.getElementById('room-edit-msg').className='msg';
}

function closeRoomEdit(){
  document.getElementById('room-edit-modal').classList.remove('open');
}
document.getElementById('room-edit-modal').addEventListener('click',e=>{
  if(e.target===document.getElementById('room-edit-modal')) closeRoomEdit();
});

document.getElementById('room-edit-num').addEventListener('input', function(){
  var oldNum = document.getElementById('room-edit-old-num').value;
  var warn   = document.getElementById('room-num-warn');
  warn.style.display = (this.value.trim()!==oldNum) ? 'block' : 'none';
});

async function saveRoomEdit(){
  var id     = document.getElementById('room-edit-id').value;
  var oldNum = document.getElementById('room-edit-old-num').value;
  var newNum = document.getElementById('room-edit-num').value.trim();
  var type   = document.getElementById('room-edit-type').value;
  var cap    = parseInt(document.getElementById('room-edit-cap').value);
  var price  = parseFloat(document.getElementById('room-edit-price').value)||0;
  var status = document.getElementById('room-edit-status').value;
  var btn    = document.getElementById('room-edit-save-btn');
  var msg    = document.getElementById('room-edit-msg');
  if(!newNum){ msg.textContent='Room number cannot be empty.'; msg.className='msg error'; return; }
  if(newNum!==oldNum && roomsData.find(r=>r.room_number===newNum&&r.id!==id)){
    msg.textContent='Room '+newNum+' already exists.'; msg.className='msg error'; return;
  }
  btn.disabled=true; btn.textContent='Saving...';
  var {error} = await sb.from('rooms').update({
    room_number:newNum, room_type:type, capacity:cap, price_per_night:price, status
  }).eq('id',id);
  if(error){ msg.textContent='Error: '+error.message; msg.className='msg error'; btn.disabled=false; btn.textContent='Save changes →'; return; }
  if(newNum!==oldNum){
    await sb.from('bookings').update({room_no:newNum}).eq('user_id',currentUserId).eq('room_no',oldNum);
    document.getElementById('room-edit-old-num').value = newNum;
  }
  var r = roomsData.find(x=>x.id===id);
  if(r){ r.room_number=newNum; r.room_type=type; r.capacity=cap; r.price_per_night=price; r.status=status; }
  btn.disabled=false; btn.textContent='Save changes →';
  msg.textContent='Saved!'; msg.className='msg success';
  setTimeout(()=>{ closeRoomEdit(); msg.className='msg'; },900);
  renderRooms(); renderRoomsList(); populateRoomSelect();
  addActivity('Room '+newNum+' updated — '+type+', '+statusLabel[status]);
}

async function deleteRoomFromEdit(){
  var id  = document.getElementById('room-edit-id').value;
  var num = document.getElementById('room-edit-old-num').value;
  if(!confirm('Delete Room '+num+'? This cannot be undone.')) return;
  var {error} = await sb.from('rooms').delete().eq('id',id);
  if(error){ alert('Error: '+error.message); return; }
  roomsData = roomsData.filter(x=>x.id!==id);
  closeRoomEdit(); renderRooms(); renderRoomsList(); populateRoomSelect();
  addActivity('Room '+num+' removed from inventory');
}

// ── CSV TEMPLATE & IMPORT — handled by rooms-page.js ─────────────────────────
// downloadRoomTemplate() and importRoomsCSV() are in rooms-page.js

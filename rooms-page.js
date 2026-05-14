// ── ROOMS-PAGE.JS — Full rooms management page ────────────────────────────────

var rpFiltered    = [];
var rpPage        = 1;
var rpPerPage     = 25;
var rpSelected    = new Set();
var rpPendingImport = [];
var lastImportBatch = [];
var activeInlineEdit = null;

// ── PAGE SWITCHING ────────────────────────────────────────────────────────────
function showRoomsPage(){
  try {
    var dc = document.getElementById('dashboard-content');
    var rp = document.getElementById('rooms-page');
    var tt = document.getElementById('topbar-title');
    var nr = document.getElementById('nav-rooms');
    if(!dc || !rp){ alert('Rooms page elements missing. Please hard-refresh (Ctrl+Shift+R).'); return; }
    dc.style.display = 'none';
    rp.style.display = 'block';
    if(tt) tt.textContent = 'Room Inventory';
    document.querySelectorAll('.nav-item').forEach(function(el){el.classList.remove('active');});
    if(nr) nr.classList.add('active');
    rpSelected.clear();
    applyRPFilters();
    renderRPSummary();
  } catch(e){
    console.error('showRoomsPage error:',e);
    alert('Error opening Rooms page: '+e.message);
  }
}

function showDashboard(){
  document.getElementById('rooms-page').style.display        = 'none';
  document.getElementById('dashboard-content').style.display = 'block';
  document.getElementById('topbar-title').textContent        = 'Dashboard';
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-dashboard').classList.add('active');
}

// ── FILTER & RENDER ───────────────────────────────────────────────────────────
function applyRPFilters(){
  var search  = (document.getElementById('rp-search').value||'').trim().toLowerCase();
  var statusF = document.getElementById('rp-status-filter').value;
  var typeF   = document.getElementById('rp-type-filter').value;

  rpFiltered = roomsData.filter(function(r){
    var ms = !search  || r.room_number.toLowerCase().includes(search) || r.room_type.toLowerCase().includes(search);
    var mx = !statusF || r.status===statusF;
    var mt = !typeF   || r.room_type===typeF;
    return ms && mx && mt;
  });
  rpPage = 1;
  renderRPTable();
  renderRPSummary();
}

function renderRPSummary(){
  var total = roomsData.length;
  var avail = roomsData.filter(function(r){return r.status==='available';}).length;
  var occ   = roomsData.filter(function(r){return r.status==='occupied';}).length;
  document.getElementById('rp-summary').textContent = total+' rooms · '+avail+' available · '+occ+' occupied';
}

var ST_BG  = {available:'var(--green-light)',occupied:'var(--blue-light)',checkout:'var(--amber-light)',cleaning:'#f0fdf4',maintenance:'var(--red-light)'};
var ST_COL = {available:'var(--green)',occupied:'var(--blue)',checkout:'var(--amber)',cleaning:'#166534',maintenance:'var(--red)'};
var ST_ICO = {available:'●',occupied:'●',checkout:'●',cleaning:'🧹',maintenance:'🔧'};

function renderRPTable(){
  var tbody   = document.getElementById('rp-tbody');
  var emptyEl = document.getElementById('rp-empty');
  var tableEl = document.getElementById('rp-table');

  if(rpFiltered.length===0){
    tbody.innerHTML='';
    emptyEl.style.display='block';
    tableEl.style.display='none';
    document.getElementById('rp-pagination').innerHTML='';
    return;
  }
  emptyEl.style.display='none';
  tableEl.style.display='table';

  var start     = (rpPage-1)*rpPerPage;
  var pageRooms = rpFiltered.slice(start, start+rpPerPage);

  tbody.innerHTML = pageRooms.map(function(r, idx){
    var srNo = start+idx+1;
    var sel  = rpSelected.has(r.id);
    var st   = r.status||'available';
    var bg   = ST_BG[st]||'var(--bg)';
    var col  = ST_COL[st]||'var(--text)';
    var ico  = ST_ICO[st]||'●';
    return '<tr class="'+(sel?'rp-row-selected':'')+'" id="rp-row-'+r.id+'" data-room-id="'+r.id+'">'+
      '<td class="rt-checkbox"><input type="checkbox" '+(sel?'checked':'')+' onchange="toggleRoomSelect(\''+r.id+'\',this)"/></td>'+
      '<td style="color:var(--muted);font-size:12px">'+srNo+'</td>'+
      '<td style="font-weight:700;color:var(--blue)">'+r.room_number+'</td>'+
      '<td>'+r.room_type+'</td>'+
      '<td>'+r.capacity+' guest'+(r.capacity!=1?'s':'')+'</td>'+
      '<td>₹'+Number(r.price_per_night).toLocaleString('en-IN')+'</td>'+
      '<td><span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;background:'+bg+';color:'+col+'">'+ico+' '+(statusLabel[st]||st)+'</span></td>'+
      '<td style="text-align:right;white-space:nowrap">'+
        '<button class="rp-row-edit" onclick="startRowEdit(\''+r.id+'\')" title="Edit room">✏️</button>'+
        '<button class="rp-row-del" onclick="deleteRoomFromPage(\''+r.id+'\')" title="Delete room">🗑</button>'+
      '</td>'+
      '</tr>';
  }).join('');

  renderRPPagination();
  updateBulkBar();
  var allSel = pageRooms.length>0 && pageRooms.every(function(r){return rpSelected.has(r.id);});
  document.getElementById('rp-select-all').checked = allSel;
}

function renderRPPagination(){
  var total = rpFiltered.length, totalPages = Math.ceil(total/rpPerPage);
  var pg = document.getElementById('rp-pagination');
  if(totalPages<=1){pg.innerHTML='';return;}
  var s=(rpPage-1)*rpPerPage+1, e=Math.min(rpPage*rpPerPage,total);
  var btns='';
  for(var i=1;i<=totalPages;i++) btns+='<button class="rp-page-btn'+(i===rpPage?' active':'')+'" onclick="goRPPage('+i+')">'+i+'</button>';
  pg.innerHTML='<span style="font-size:12px;color:var(--muted)">Showing '+s+'–'+e+' of '+total+'</span><div style="display:flex;gap:4px">'+btns+'</div>';
}

function goRPPage(n){rpPage=n;renderRPTable();}

// ── SELECTION ─────────────────────────────────────────────────────────────────
function toggleRoomSelect(id,cb){
  if(cb.checked) rpSelected.add(id); else rpSelected.delete(id);
  var row=document.getElementById('rp-row-'+id);
  if(row) row.className=cb.checked?'rp-row-selected':'';
  updateBulkBar();
}

function toggleSelectAll(cb){
  var s=(rpPage-1)*rpPerPage;
  rpFiltered.slice(s,s+rpPerPage).forEach(function(r){
    if(cb.checked) rpSelected.add(r.id); else rpSelected.delete(r.id);
  });
  renderRPTable();
}

function clearRoomSelection(){rpSelected.clear();renderRPTable();}

function updateBulkBar(){
  var bar=document.getElementById('rp-bulk-bar');
  var n=rpSelected.size;
  bar.style.display=n>0?'flex':'none';
  if(n>0) document.getElementById('rp-selected-count').textContent=n+' room'+(n!==1?'s':'')+' selected';
  document.getElementById('rp-bulk-status').value='';
}

// ── ROW-LEVEL EDIT (click ✏️ → whole row editable → explicit Save/Cancel) ─────
var activeInlineEdit=null; // kept for compatibility, unused

function startRowEdit(roomId){
  var r=roomsData.find(function(x){return x.id===roomId;});
  if(!r) return;
  var row=document.getElementById('rp-row-'+roomId);
  if(!row) return;
  row.classList.add('rp-row-editing');
  var typeOpts=['Standard','Deluxe','Suite','Premium','Family','Super Deluxe'].map(function(t){return'<option'+(r.room_type===t?' selected':'')+'>'+t+'</option>';}).join('');
  var capOpts=[1,2,3,4,5].map(function(n){return'<option value="'+n+'"'+(r.capacity==n?' selected':'')+'>'+n+'</option>';}).join('');
  var stOpts=[{v:'available',l:'✅ Available'},{v:'cleaning',l:'🧹 Cleaning'},{v:'maintenance',l:'🔧 Maintenance'}].map(function(s){return'<option value="'+s.v+'"'+(r.status===s.v?' selected':'')+'>'+s.l+'</option>';}).join('');
  row.innerHTML=
    '<td><input type="checkbox" disabled/></td>'+
    '<td style="color:var(--muted);font-size:12px">—</td>'+
    '<td>'+
      '<input type="text" class="inline-input" id="re-num-'+roomId+'" value="'+r.room_number+'" style="width:80px"/>'+
      '<div id="re-numwarn-'+roomId+'" style="display:none;font-size:10px;color:var(--amber);margin-top:2px">⚠️ Updates all bookings</div>'+
    '</td>'+
    '<td><select class="inline-input" id="re-type-'+roomId+'">'+typeOpts+'</select></td>'+
    '<td><select class="inline-input" id="re-cap-'+roomId+'" style="width:72px">'+capOpts+'</select></td>'+
    '<td><input type="number" class="inline-input" id="re-price-'+roomId+'" value="'+r.price_per_night+'" style="width:90px"/></td>'+
    '<td><select class="inline-input" id="re-status-'+roomId+'">'+stOpts+'</select></td>'+
    '<td style="text-align:right;white-space:nowrap">'+
      '<button onclick="saveRowEdit(this.closest(\'[data-room-id]\').dataset.roomId)" style="padding:5px 10px;background:#15803d;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;margin-right:4px">&#10003; Save</button>'+
      '<button onclick="cancelRowEdit(this.closest(\'[data-room-id]\').dataset.roomId)" style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;background:white">&#10005;</button>'+
    '</td>';
  var numInput=document.getElementById('re-num-'+roomId);
  if(numInput){numInput.focus();numInput.select();
    numInput.addEventListener('input',function(){var w=document.getElementById('re-numwarn-'+roomId);if(w)w.style.display=this.value.trim()!==r.room_number?'block':'none';});}
}

async function saveRowEdit(roomId){
  var r=roomsData.find(function(x){return x.id===roomId;});if(!r)return;
  var newNum=((document.getElementById('re-num-'+roomId)||{}).value||'').trim();
  var newType=(document.getElementById('re-type-'+roomId)||{}).value||r.room_type;
  var newCap=parseInt((document.getElementById('re-cap-'+roomId)||{}).value)||r.capacity;
  var newPrice=parseFloat((document.getElementById('re-price-'+roomId)||{}).value);
  var newStatus=(document.getElementById('re-status-'+roomId)||{}).value||r.status;
  if(isNaN(newPrice))newPrice=r.price_per_night;
  if(!newNum){showRPToast('Room number cannot be empty.','error');return;}
  if(newNum!==r.room_number&&roomsData.find(function(x){return x.room_number===newNum&&x.id!==roomId;})){showRPToast('Room '+newNum+' already exists.','error');return;}
  if(newPrice<100){if(!confirm('Price ₹'+newPrice+' seems very low for a room rate. Are you sure?'))return;}
  var res=await sb.from('rooms').update({room_number:newNum,room_type:newType,capacity:newCap,price_per_night:newPrice,status:newStatus}).eq('id',roomId);
  if(res.error){showRPToast('Save failed: '+res.error.message,'error');return;}
  if(newNum!==r.room_number){await sb.from('bookings').update({room_no:newNum}).eq('user_id',currentUserId).eq('room_no',r.room_number);addActivity('Room '+r.room_number+' renumbered to '+newNum);}
  r.room_number=newNum;r.room_type=newType;r.capacity=newCap;r.price_per_night=newPrice;r.status=newStatus;
  showRPToast('✓ Room '+newNum+' saved','success');
  applyRPFilters();renderRooms();populateRoomSelect();
}

function cancelRowEdit(roomId){applyRPFilters();}

// ── BULK ACTIONS ──────────────────────────────────────────────────────────────
async function bulkChangeStatus(status){
  if(!status||rpSelected.size===0) return;
  var ids=Array.from(rpSelected);
  var res=await sb.from('rooms').update({status}).in('id',ids);
  if(res.error){showRPToast('Error: '+res.error.message,'error');return;}
  ids.forEach(function(id){var r=roomsData.find(function(x){return x.id===id;});if(r)r.status=status;});
  showRPToast('✓ '+ids.length+' rooms updated','success');
  rpSelected.clear(); applyRPFilters(); renderRooms();
}

async function bulkDeleteRooms(){
  var n=rpSelected.size; if(n===0) return;
  if(!confirm('Delete '+n+' room'+(n!==1?'s':'')+' permanently?')) return;
  var ids=Array.from(rpSelected);
  var res=await sb.from('rooms').delete().in('id',ids);
  if(res.error){showRPToast('Error: '+res.error.message,'error');return;}
  roomsData=roomsData.filter(function(r){return!ids.includes(r.id);});
  rpSelected.clear();
  showRPToast('✓ '+n+' rooms deleted','success');
  applyRPFilters(); renderRooms(); populateRoomSelect();
}

async function deleteRoomFromPage(roomId){
  var r=roomsData.find(function(x){return x.id===roomId;});
  if(!confirm('Delete Room '+(r?r.room_number:'')+' permanently?')) return;
  var res=await sb.from('rooms').delete().eq('id',roomId);
  if(res.error){showRPToast('Error: '+res.error.message,'error');return;}
  roomsData=roomsData.filter(function(x){return x.id!==roomId;});
  rpSelected.delete(roomId);
  applyRPFilters(); renderRooms(); populateRoomSelect();
  showRPToast('Room deleted','success');
}

// ── BULK ADD (in-browser grid) ────────────────────────────────────────────────
var bulkRows=[];

function openBulkAdd(){
  bulkRows=[{num:'',type:'',cap:2,price:''}];
  renderBulkGrid();
  document.getElementById('bulk-add-modal').classList.add('open');
  document.getElementById('bulk-msg').className='msg';
}

function closeBulkAdd(){
  document.getElementById('bulk-add-modal').classList.remove('open');
}

function renderBulkGrid(){
  var typeOpts=['','Standard','Deluxe','Suite','Premium','Family','Super Deluxe'];
  document.getElementById('bulk-tbody').innerHTML=bulkRows.map(function(r,i){
    var tOpts=typeOpts.map(function(t){return'<option value="'+t+'"'+(r.type===t?' selected':'')+'>'+t+'</option>';}).join('');
    var cOpts=[1,2,3,4,5].map(function(n){return'<option value="'+n+'"'+(r.cap==n?' selected':'')+'>'+n+'</option>';}).join('');
    return'<tr>'+
      '<td style="padding:4px 6px;color:var(--muted);font-size:12px;text-align:center">'+(i+1)+'</td>'+
      '<td style="padding:3px"><input type="text" class="bulk-cell" placeholder="101" value="'+r.num+'" oninput="bulkRows['+i+'].num=this.value" onkeydown="bulkKey(event,'+i+')"/></td>'+
      '<td style="padding:3px"><select class="bulk-cell" onchange="bulkRows['+i+'].type=this.value" onkeydown="bulkKey(event,'+i+')">'+tOpts+'</select></td>'+
      '<td style="padding:3px"><select class="bulk-cell" onchange="bulkRows['+i+'].cap=parseInt(this.value)" onkeydown="bulkKey(event,'+i+')">'+cOpts+'</select></td>'+
      '<td style="padding:3px"><input type="number" class="bulk-cell" placeholder="2500" value="'+r.price+'" oninput="bulkRows['+i+'].price=this.value" onkeydown="bulkKey(event,'+i+')"/></td>'+
      '<td style="padding:3px;text-align:center"><button onclick="removeBulkRow('+i+')" style="border:none;background:none;cursor:pointer;color:#b91c1c;font-size:14px;padding:2px">✕</button></td>'+
      '</tr>';
  }).join('');
}

function bulkKey(e,rowIdx){
  if(e.key==='Enter'){
    e.preventDefault();
    if(rowIdx===bulkRows.length-1) addBulkRow();
    else{
      var rows=document.getElementById('bulk-tbody').querySelectorAll('tr');
      if(rows[rowIdx+1]){var f=rows[rowIdx+1].querySelector('input');if(f)f.focus();}
    }
  }
}

function addBulkRow(){
  bulkRows.push({num:'',type:'',cap:2,price:''});
  renderBulkGrid();
  var rows=document.getElementById('bulk-tbody').querySelectorAll('tr');
  var last=rows[rows.length-1];
  if(last){var f=last.querySelector('input');if(f)f.focus();}
}

function removeBulkRow(i){
  bulkRows.splice(i,1);
  if(bulkRows.length===0) bulkRows=[{num:'',type:'',cap:2,price:''}];
  renderBulkGrid();
}

async function saveBulkRooms(){
  // Sync current DOM values
  document.getElementById('bulk-tbody').querySelectorAll('tr').forEach(function(row,i){
    if(!bulkRows[i]) return;
    var cells=row.querySelectorAll('input,select');
    if(cells[0]) bulkRows[i].num=cells[0].value.trim();
    if(cells[1]) bulkRows[i].type=cells[1].value;
    if(cells[2]) bulkRows[i].cap=parseInt(cells[2].value)||2;
    if(cells[3]) bulkRows[i].price=cells[3].value;
  });

  var existing=new Set(roomsData.map(function(r){return r.room_number;}));
  var valid=[],dupes=[],incomplete=[];
  bulkRows.forEach(function(r){
    if(!r.num||!r.type){incomplete.push(r);return;}
    if(existing.has(r.num)){dupes.push(r);return;}
    valid.push(r);existing.add(r.num);
  });

  if(valid.length===0){
    var msg=document.getElementById('bulk-msg');
    msg.textContent='No new rooms to add.'+(dupes.length?' '+dupes.length+' duplicate(s) skipped.':'')+(incomplete.length?' '+incomplete.length+' row(s) incomplete.':'');
    msg.className='msg error'; return;
  }

  var summary='Adding '+valid.length+' room'+(valid.length!==1?'s':'');
  if(dupes.length) summary+=', '+dupes.length+' duplicate'+(dupes.length!==1?'s':'')+' skipped';
  if(incomplete.length) summary+=', '+incomplete.length+' incomplete row'+(incomplete.length!==1?'s':'')+' skipped';
  if(!confirm(summary+'. Proceed?')) return;

  var btn=document.getElementById('bulk-save-btn');
  btn.disabled=true; btn.textContent='Saving…';

  var rows=valid.map(function(r){return{user_id:currentUserId,room_number:r.num,room_type:r.type,capacity:r.cap||2,price_per_night:parseFloat(r.price)||0,status:'available'};});
  var res=await sb.from('rooms').insert(rows).select();
  if(res.error){showRPToast('Error: '+res.error.message,'error');btn.disabled=false;btn.textContent='Save rooms →';return;}

  lastImportBatch=res.data.map(function(r){return r.id;});
  roomsData.push.apply(roomsData,res.data);
  roomsData.sort(function(a,b){return a.room_number.localeCompare(b.room_number,undefined,{numeric:true});});

  closeBulkAdd();
  applyRPFilters(); renderRooms(); populateRoomSelect();
  addActivity('Bulk added '+res.data.length+' rooms via in-browser grid');
  showRPToast('✓ '+res.data.length+' rooms added! <button onclick="undoLastImport()" style="margin-left:8px;text-decoration:underline;background:none;border:none;cursor:pointer;color:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px">Undo</button>','success',10000);
  btn.disabled=false; btn.textContent='Save rooms →';
}

// ── CSV IMPORT ────────────────────────────────────────────────────────────────
function handleRPCSV(input){
  var file=input.files[0]; if(!file) return;
  var reader=new FileReader();
  reader.onload=function(e){parseAndPreviewCSV(e.target.result);};
  reader.readAsText(file);
  input.value='';
}

function parseAndPreviewCSV(text){
  var lines=text.trim().split('\n').filter(function(l){return l.trim();});
  if(lines.length<2){showRPToast('CSV has no data rows.','error');return;}

  // Flexible header detection (supports your format: "Room No", "Room Type" etc)
  var header=lines[0].split(',').map(function(h){return h.trim().toLowerCase().replace(/[^a-z0-9]/g,'');});
  var numIdx  =header.findIndex(function(h){return h.includes('roomno')||h.includes('roomnumber')||h==='no';});
  var typeIdx =header.findIndex(function(h){return h.includes('type');});
  var capIdx  =header.findIndex(function(h){return h.includes('cap');});
  var priceIdx=header.findIndex(function(h){return h.includes('price')||h.includes('rate');});

  if(numIdx<0||typeIdx<0){showRPToast('CSV must have "Room No" and "Room Type" columns. Download the template.','error');return;}

  var existing=new Set(roomsData.map(function(r){return r.room_number;}));
  var valid=[],dupes=[],errors=[];

  for(var i=1;i<lines.length;i++){
    var cols=lines[i].split(',').map(function(c){return c.trim().replace(/^"|"$/g,'');});
    var num=cols[numIdx],type=cols[typeIdx];
    if(!num||!type){errors.push({row:i+1,reason:'Missing Room No or Room Type'});continue;}
    if(existing.has(num)){dupes.push({row:i+1,num,type});continue;}
    valid.push({srno:i,num,type,cap:parseInt(cols[capIdx])||2,price:parseFloat(cols[priceIdx])||0});
    existing.add(num);
  }
  rpPendingImport=valid;
  showImportPreview(valid,dupes,errors);
}

function showImportPreview(valid,dupes,errors){
  var summary='<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">'+
    '<div style="background:var(--green-light);color:var(--green);padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600">✅ '+valid.length+' rooms ready</div>'+
    (dupes.length?'<div style="background:var(--amber-light);color:var(--amber);padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600">⚠️ '+dupes.length+' duplicates skipped</div>':'')+
    (errors.length?'<div style="background:var(--red-light);color:var(--red);padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600">❌ '+errors.length+' rows with errors</div>':'')+
    '</div>';

  var trows=valid.slice(0,50).map(function(r){
    return'<tr style="border-top:1px solid var(--border)">'+
      '<td style="padding:7px 10px;font-size:12px;color:var(--muted)">'+r.srno+'</td>'+
      '<td style="padding:7px 10px;font-size:13px;font-weight:700;color:var(--blue)">'+r.num+'</td>'+
      '<td style="padding:7px 10px;font-size:13px">'+r.type+'</td>'+
      '<td style="padding:7px 10px;font-size:13px">'+r.cap+'</td>'+
      '<td style="padding:7px 10px;font-size:13px">₹'+Number(r.price).toLocaleString('en-IN')+'</td>'+
      '</tr>';
  }).join('');
  var more=valid.length>50?'<tr><td colspan="5" style="padding:10px;text-align:center;color:var(--muted);font-size:12px">…and '+(valid.length-50)+' more rooms</td></tr>':'';

  var table=valid.length===0?'<div style="text-align:center;padding:20px;color:var(--muted)">No valid rooms to import.</div>':
    '<div style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">'+
    '<table style="width:100%;border-collapse:collapse"><thead style="background:var(--bg);position:sticky;top:0">'+
    '<tr><th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);text-align:left">Sr.No</th>'+
    '<th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);text-align:left">Room No</th>'+
    '<th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);text-align:left">Room Type</th>'+
    '<th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);text-align:left">Capacity</th>'+
    '<th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);text-align:left">Price/Night</th>'+
    '</tr></thead><tbody>'+trows+more+'</tbody></table></div>';

  var errDetail=errors.length?'<div style="margin-top:10px;background:var(--red-light);border-radius:8px;padding:10px 12px">'+
    '<div style="font-size:12px;font-weight:600;color:var(--red);margin-bottom:4px">Rows skipped (errors):</div>'+
    errors.slice(0,5).map(function(e){return'<div style="font-size:11px;color:var(--red)">Row '+e.row+': '+e.reason+'</div>';}).join('')+
    (errors.length>5?'<div style="font-size:11px;color:var(--red)">…and '+(errors.length-5)+' more</div>':'')+'</div>':'';

  document.getElementById('import-preview-content').innerHTML=summary+table+errDetail;
  var btn=document.getElementById('commit-import-btn');
  btn.textContent='Import '+valid.length+' rooms →';
  btn.disabled=valid.length===0;
  document.getElementById('import-preview-modal').classList.add('open');
}

function closeImportPreview(){
  document.getElementById('import-preview-modal').classList.remove('open');
  rpPendingImport=[];
}

async function commitImport(){
  if(rpPendingImport.length===0) return;
  var btn=document.getElementById('commit-import-btn');
  btn.disabled=true; btn.textContent='Importing…';
  // Atomic: single insert — all or nothing
  var rows=rpPendingImport.map(function(r){return{user_id:currentUserId,room_number:r.num,room_type:r.type,capacity:r.cap,price_per_night:r.price,status:'available'};});
  var res=await sb.from('rooms').insert(rows).select();
  if(res.error){
    btn.disabled=false; btn.textContent='Import '+rpPendingImport.length+' rooms →';
    showRPToast('Import failed: '+res.error.message+' — no rooms were saved.','error'); return;
  }
  lastImportBatch=res.data.map(function(r){return r.id;});
  roomsData.push.apply(roomsData,res.data);
  roomsData.sort(function(a,b){return a.room_number.localeCompare(b.room_number,undefined,{numeric:true});});
  closeImportPreview();
  applyRPFilters(); renderRooms(); populateRoomSelect();
  addActivity('CSV import: '+res.data.length+' rooms added');
  showRPToast('✓ '+res.data.length+' rooms imported! <button onclick="undoLastImport()" style="margin-left:8px;text-decoration:underline;background:none;border:none;cursor:pointer;color:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px">Undo import</button>','success',10000);
}

async function undoLastImport(){
  if(lastImportBatch.length===0){showRPToast('Nothing to undo.','warn');return;}
  if(!confirm('Remove the '+lastImportBatch.length+' rooms from the last import?')) return;
  var res=await sb.from('rooms').delete().in('id',lastImportBatch);
  if(res.error){showRPToast('Undo failed: '+res.error.message,'error');return;}
  var n=lastImportBatch.length;
  roomsData=roomsData.filter(function(r){return!lastImportBatch.includes(r.id);});
  lastImportBatch=[];
  applyRPFilters(); renderRooms(); populateRoomSelect();
  showRPToast('✓ Import undone — '+n+' rooms removed.','success');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
var rpToastTimer=null;
function showRPToast(msg,type,dur){
  var el=document.getElementById('rp-toast');
  if(!el) return;
  el.innerHTML=msg;
  el.className='rp-toast rp-toast-'+type+' show';
  clearTimeout(rpToastTimer);
  rpToastTimer=setTimeout(function(){el.className='rp-toast';},dur||3000);
}

// ── CSV TEMPLATE (updated to your format with Sr.no) ─────────────────────────
function downloadRoomTemplate(){
  var csv='Sr.No,Room No,Room Type,Capacity,Price Per Night\n'+
    '1,101,Standard,2,2000\n2,102,Deluxe,2,3000\n3,201,Suite,4,6000\n4,301,Premium,2,4500\n5,401,Family,4,3500';
  var blob=new Blob([csv],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='revenu_rooms_template.csv';
  a.click();
}

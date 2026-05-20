// ── BOOKINGS-PAGE.JS — Full bookings management page ──────────────────────────

var bpFiltered = [];
var bpPage     = 1;
var bpPerPage  = 25;

// ── DATE HELPERS ─────────────────────────────────────────────────────────────
function bpToday(){ return new Date().toISOString().split('T')[0]; }
function bpStartOfWeek(){
  var d=new Date(); var day=d.getDay();
  var diff=d.getDate()-day+(day===0?-6:1); // Monday start
  var monday=new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}
function bpEndOfWeek(){
  var d=new Date(); var day=d.getDay();
  var diff=d.getDate()-day+(day===0?0:7);
  var sunday=new Date(d.setDate(diff));
  return sunday.toISOString().split('T')[0];
}
function bpStartOfMonth(){
  var d=new Date();
  return new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0];
}
function bpEndOfMonth(){
  var d=new Date();
  return new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().split('T')[0];
}

// ── FILTERING ────────────────────────────────────────────────────────────────
function applyBPFilters(){
  if(typeof bookings==='undefined') return;
  var search  = (document.getElementById('bp-search').value||'').trim().toLowerCase();
  var statusF = document.getElementById('bp-status-filter').value;
  var sourceF = document.getElementById('bp-source-filter').value;
  var dateF   = document.getElementById('bp-date-filter').value;
  var today   = bpToday();

  bpFiltered = bookings.filter(function(b){
    // Search across multiple fields
    if(search){
      var fields=[b.guest_name,b.guest_phone,b.guest_email,b.pnr,b.room_no,b.notes].filter(Boolean).map(function(x){return String(x).toLowerCase();});
      if(!fields.some(function(f){return f.includes(search);})) return false;
    }
    if(statusF && b.status!==statusF) return false;
    if(sourceF && b.source!==sourceF) return false;
    if(dateF){
      switch(dateF){
        case 'active':           if(!(b.checkin<=today && b.checkout>today)) return false; break;
        case 'arriving-today':   if(b.checkin!==today) return false; break;
        case 'departing-today':  if(b.checkout!==today) return false; break;
        case 'upcoming':         if(b.checkin<=today) return false; break;
        case 'this-week':        if(b.checkin<bpStartOfWeek()||b.checkin>bpEndOfWeek()) return false; break;
        case 'this-month':       if(b.checkin<bpStartOfMonth()||b.checkin>bpEndOfMonth()) return false; break;
        case 'past':             if(b.checkout>=today) return false; break;
      }
    }
    return true;
  });

  bpPage=1;
  renderBPTable();
  renderBPSummary();
}

function renderBPSummary(){
  if(typeof bookings==='undefined'){document.getElementById('bp-summary').textContent='Loading…';return;}
  var today  = bpToday();
  var total  = bookings.length;
  var active = bookings.filter(function(b){return b.checkin<=today&&b.checkout>today&&b.status!=='cancelled';}).length;
  var upcoming = bookings.filter(function(b){return b.checkin>today&&b.status!=='cancelled';}).length;
  var past   = bookings.filter(function(b){return b.checkout<today;}).length;
  var cancel = bookings.filter(function(b){return b.status==='cancelled';}).length;
  var parts  = [total+' total', active+' active'];
  if(upcoming>0) parts.push(upcoming+' upcoming');
  if(past>0) parts.push(past+' past');
  if(cancel>0) parts.push(cancel+' cancelled');
  document.getElementById('bp-summary').textContent = parts.join(' · ');
}

// ── RENDER TABLE ─────────────────────────────────────────────────────────────
var SOURCE_BG = {
  'OYO':'#fee2e2','MakeMyTrip':'#fed7aa','Booking.com':'#dbeafe',
  'Agoda':'#fecaca','Goibibo':'#e0e7ff','Other OTA':'#f1f5f9',
  'Walk-in':'#dcfce7','Direct / phone':'#dcfce7','Corporate':'#ede9fe'
};
var SOURCE_COL = {
  'OYO':'#b91c1c','MakeMyTrip':'#ea580c','Booking.com':'#1a56a0',
  'Agoda':'#9a1a1a','Goibibo':'#4338ca','Other OTA':'#475569',
  'Walk-in':'#15803d','Direct / phone':'#15803d','Corporate':'#7c3aed'
};

var STATUS_BG = {
  'booked':'#dbeafe','checked-in':'#dcfce7','checked-out':'#f1f5f9','cancelled':'#fee2e2','no-show':'#ffe4e6'
};
var STATUS_COL = {
  'booked':'#1a56a0','checked-in':'#15803d','checked-out':'#475569','cancelled':'#b91c1c','no-show':'#9f1239'
};
var STATUS_LABEL_BP = {
  'booked':'📋 Booked','checked-in':'🛏️ Checked-in','checked-out':'✓ Checked-out','cancelled':'✕ Cancelled','no-show':'🚫 No-show'
};

function renderBPTable(){
  var tbody   = document.getElementById('bp-tbody');
  var emptyEl = document.getElementById('bp-empty');
  var tableEl = document.getElementById('bp-table');
  if(!tbody) return;

  if(bpFiltered.length===0){
    tbody.innerHTML='';
    emptyEl.style.display='block';
    tableEl.style.display='none';
    document.getElementById('bp-pagination').innerHTML='';
    return;
  }
  emptyEl.style.display='none';
  tableEl.style.display='table';

  var start     = (bpPage-1)*bpPerPage;
  var pageRows  = bpFiltered.slice(start, start+bpPerPage);

  tbody.innerHTML = pageRows.map(function(b, idx){
    var srNo = start+idx+1;
    var src  = b.source||'—';
    var srcBg = SOURCE_BG[src]||'var(--bg)';
    var srcCol= SOURCE_COL[src]||'var(--text)';
    var st = b.status||'booked';
    var stBg = STATUS_BG[st]||'var(--bg)';
    var stCol= STATUS_COL[st]||'var(--text)';
    var stLbl= STATUS_LABEL_BP[st]||st;
    var pnrCell = b.pnr
      ? '<span style="font-size:11px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:2px 7px;border-radius:5px">'+b.pnr+'</span>'
      : '<span style="color:var(--muted);font-size:12px">—</span>';

    // Pending check-in indicator (Stage G.2)
    var ciStatus = b.checkin_status;
    var rowStyle = 'cursor:pointer';
    var ciIndicator = '';
    if(ciStatus === 'guest-submitted'){
      rowStyle += ';border-left:3px solid #f59e0b;background:#fffbeb';
      ciIndicator = ' <span title="Check-in awaiting approval" style="display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:#fef3c7;color:#92400e;margin-left:6px;vertical-align:middle">⏳ APPROVAL PENDING</span>';
    } else if(ciStatus === 'approved'){
      ciIndicator = ' <span title="Online ID verified — physical arrival still pending" style="display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:#dcfce7;color:#15803d;margin-left:6px;vertical-align:middle">✓ ID VERIFIED</span>';
    } else if(ciStatus === 'rejected'){
      ciIndicator = ' <span title="Check-in rejected" style="display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:#fee2e2;color:#b91c1c;margin-left:6px;vertical-align:middle">✕ REJECTED</span>';
    }

    return '<tr style="'+rowStyle+'" onclick="openBookingDetail(\''+b.id+'\')">'+
      '<td style="color:var(--muted);font-size:12px">'+srNo+'</td>'+
      '<td><div style="font-weight:600">'+(b.guest_name||'—')+ciIndicator+'</div>'+(b.guest_email?'<div style="font-size:11px;color:var(--muted)">'+b.guest_email+'</div>':'')+'</td>'+
      '<td style="font-size:12px">'+(b.guest_phone||'—')+'</td>'+
      '<td><strong style="color:var(--blue)">'+(b.room_no||'—')+'</strong> <span style="font-size:11px;color:var(--muted)">'+(b.room_type||'')+'</span></td>'+
      '<td><span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:5px;background:'+srcBg+';color:'+srcCol+'">'+src+'</span></td>'+
      '<td style="font-size:12px">'+(b.checkin||'')+' → '+(b.checkout||'')+'</td>'+
      '<td>'+pnrCell+'</td>'+
      '<td><span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;background:'+stBg+';color:'+stCol+'">'+stLbl+'</span></td>'+
      '</tr>';
  }).join('');

  renderBPPagination();
}

function renderBPPagination(){
  var total = bpFiltered.length;
  var totalPages = Math.ceil(total/bpPerPage);
  var pg = document.getElementById('bp-pagination');
  if(!pg) return;
  if(totalPages<=1){ pg.innerHTML=''; return; }
  var s=(bpPage-1)*bpPerPage+1;
  var e=Math.min(bpPage*bpPerPage,total);
  var btns='';
  for(var i=1;i<=totalPages;i++){
    btns += '<button class="rp-page-btn'+(i===bpPage?' active':'')+'" onclick="goBPPage('+i+')">'+i+'</button>';
  }
  pg.innerHTML='<span style="font-size:12px;color:var(--muted)">Showing '+s+'–'+e+' of '+total+'</span><div style="display:flex;gap:4px">'+btns+'</div>';
}

function goBPPage(n){ bpPage=n; renderBPTable(); }

// ── PENDING APPROVAL BADGE (Stage G.2) ───────────────────────────────────────
function updatePendingBadge(){
  if(typeof bookings === 'undefined') return;
  var pendingCount = bookings.filter(function(b){ return b.checkin_status === 'guest-submitted'; }).length;
  var badge = document.getElementById('nav-bookings-badge');
  if(!badge) return;
  if(pendingCount > 0){
    badge.textContent = pendingCount > 99 ? '99+' : pendingCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ── AUTH.JS — Supabase client + authentication ────────────────────────────────
var sb = window.supabase.createClient(
  'https://hytiokbgbtoetwpjxgnb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dGlva2JnYnRvZXR3cGp4Z25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDk0ODQsImV4cCI6MjA5MzQ4NTQ4NH0.odfG2wPNcQSQOI4JlxlA4VG4S0RHrvINW1zM8E0MRcM'
);
var EMAILJS_SERVICE  = 'service_9zw5vb7';
var EMAILJS_TEMPLATE = 'template_pkgm3k8';

async function initDashboard(){
  const {data:{session}} = await sb.auth.getSession();
  if(!session){ window.location.href='login.html'; return; }
  currentUserId = session.user.id;
  const meta = session.user.user_metadata || {};
  const hotelName = meta.hotel_name || meta.hotelName || '';
  const firstName  = meta.first_name || meta.firstName ||
    (meta.full_name ? meta.full_name.split(' ')[0] : '');
  if(!hotelName){
    document.getElementById('setup-modal').classList.add('open');
    if(firstName) document.getElementById('setup-firstname').value = firstName;
  }
  applyProfile(hotelName||'My Hotel', firstName||'there');
  currentUpiId = meta.upi_id||'';
  const now = new Date();
  document.getElementById('topbar-date').textContent =
    now.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const today = now.toISOString().split('T')[0];
  document.getElementById('checkin').value = today;
  const tom = new Date(); tom.setDate(tom.getDate()+1);
  document.getElementById('checkout').value = tom.toISOString().split('T')[0];
  await loadRooms();
  loadBookings();
  updateStats();
}

function applyProfile(hotelName, firstName){
  document.getElementById('sb-hotel').textContent  = hotelName;
  document.getElementById('owner-name').textContent = 'Hi, '+(firstName||'there');
}

async function saveSetup(){
  const hotel = document.getElementById('setup-hotel').value.trim();
  const first = document.getElementById('setup-firstname').value.trim();
  const last  = document.getElementById('setup-lastname').value.trim();
  const upi   = document.getElementById('setup-upi').value.trim();
  const btn   = document.getElementById('setup-btn');
  const msg   = document.getElementById('setup-msg');
  if(!hotel||!first){ msg.textContent='Please enter your hotel name and first name.'; msg.className='msg error'; return; }
  btn.disabled=true; btn.textContent='Saving…';
  const {error} = await sb.auth.updateUser({data:{hotel_name:hotel,first_name:first,last_name:last,upi_id:upi}});
  if(error){ msg.textContent='Error: '+error.message; msg.className='msg error'; btn.disabled=false; btn.textContent='Save & continue →'; return; }
  applyProfile(hotel, first);
  currentUpiId = upi;
  document.getElementById('setup-modal').classList.remove('open');
}

async function handleLogout(){
  await sb.auth.signOut();
  window.location.href='login.html';
}

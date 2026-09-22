import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let session = null;
let profile = null;
let tournaments = [];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function go(id){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  $$(".nav").forEach(b=>b.classList.toggle("active",b.dataset.go===id));
  scrollTo(0,0);
}
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));

function fmtDate(s){
  if(!s) return "";
  return new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(s));
}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function eventCard(t){
  const v=t.venues||{};
  return `<article class="card event">
    <h3>${esc(t.title)}</h3>
    <div class="meta">${esc(v.name||"Venue")} · ${esc(v.city||"")}${v.state?", "+esc(v.state):""}<br>
    ${esc(t.game||"")} · ${fmtDate(t.start_at)}${t.entry_fee!=null?` · $${Number(t.entry_fee).toFixed(0)} entry`:""}</div>
    <span class="pill">${esc(t.game||"Pool")}</span>${t.recurrence_rule?'<span class="pill">Recurring</span>':""}
    ${t.format?`<p>${esc(t.format)}</p>`:""}${t.details?`<p class="meta">${esc(t.details)}</p>`:""}
  </article>`;
}

async function loadTournaments(){
  const {data,error}=await supabase.from("tournaments")
    .select("id,title,game,start_at,entry_fee,table_size,format,details,contact_text,recurrence_rule,status,venues(name,address1,city,state,postal_code)")
    .eq("status","published").order("start_at",{ascending:true});
  if(error){ $("#homeEvents").innerHTML=`<div class="card">Could not load tournaments: ${esc(error.message)}</div>`; return; }
  tournaments=data||[];
  $("#homeEvents").innerHTML=tournaments.length?tournaments.map(eventCard).join(""):'<div class="card muted">No published tournaments yet.</div>';
  $("#searchResults").innerHTML=tournaments.map(eventCard).join("");
}

async function loadVenues(){
  const {data}=await supabase.from("venues").select("id,name,city,state").order("name");
  $("#venueSelect").innerHTML=(data||[]).map(v=>`<option value="${v.id}">${esc(v.name)} — ${esc(v.city)}, ${esc(v.state)}</option>`).join("");
}

async function refreshAuth(){
  const {data:{session:s}}=await supabase.auth.getSession(); session=s;
  if(session){
    const {data}=await supabase.from("profiles").select("display_name,role").eq("id",session.user.id).maybeSingle();
    profile=data;
  } else profile=null;
  renderAuth();
}

function renderAuth(){
  $("#authBtn").textContent=session?"Sign Out":"Sign In";
  const canPost=session && ["td","both"].includes(profile?.role);
  $("#postGate").classList.toggle("hidden",canPost);
  $("#postForm").classList.toggle("hidden",!canPost);
  $("#profileBox").innerHTML=session?`<h2>${esc(profile?.display_name||session.user.email)}</h2><p>${esc(session.user.email)}</p><span class="pill">${profile?.role==="both"?"Player + Tournament Director":esc(profile?.role||"player")}</span>`:'<p class="muted">Sign in to view your profile.</p>';
}

function openLogin(){ $("#authDialog").showModal(); }
$("#postSignIn").addEventListener("click",openLogin);
$("#authBtn").addEventListener("click",async()=>{
  if(session){await supabase.auth.signOut(); session=null; profile=null; renderAuth();}
  else openLogin();
});
$("#loginBtn").addEventListener("click",async()=>{
  $("#loginMsg").textContent="Signing in…";
  const {data,error}=await supabase.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
  if(error){$("#loginMsg").textContent=error.message;return;}
  session=data.session; await refreshAuth(); $("#authDialog").close(); $("#password").value="";
});

$("#searchBtn").addEventListener("click",()=>{
  const q=$("#searchText").value.trim().toLowerCase(), game=$("#gameFilter").value;
  const filtered=tournaments.filter(t=>{
    const v=t.venues||{};
    const hay=[t.title,v.name,v.city,v.state,v.postal_code].join(" ").toLowerCase();
    return (!q||hay.includes(q)) && (!game||t.game===game);
  });
  $("#searchResults").innerHTML=filtered.length?filtered.map(eventCard).join(""):'<div class="card muted">No matches found.</div>';
});

$("#postForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!session) return openLogin();
  const f=new FormData(e.currentTarget);
  const local=f.get("start_at");
  const startAt=new Date(local).toISOString();
  const row={
    created_by:session.user.id, venue_id:f.get("venue_id"), title:f.get("title"),
    game:f.get("game"), start_at:startAt, entry_fee:f.get("entry_fee")?Number(f.get("entry_fee")):null,
    table_size:f.get("table_size")||null, format:f.get("format")||null,
    details:f.get("details")||null, contact_text:f.get("contact_text")||null,
    recurrence_rule:f.get("recurrence")||null, status:"published", last_confirmed_at:new Date().toISOString()
  };
  $("#postMsg").textContent="Publishing…";
  const {error}=await supabase.from("tournaments").insert(row);
  if(error){$("#postMsg").textContent=error.message;return;}
  $("#postMsg").textContent="Tournament published!";
  e.currentTarget.reset(); await loadTournaments();
});

await Promise.all([refreshAuth(),loadTournaments(),loadVenues()]);
supabase.auth.onAuthStateChange(()=>setTimeout(refreshAuth,0));

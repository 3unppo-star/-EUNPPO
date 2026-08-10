/* Project keys. Replace both lines if the Supabase project is ever recreated.
   The same pair is also inlined in overlay/index.html.
   Load order: supabase.js -> site.js -> page script -> fx.js */
const SUPABASE_URL  = 'https://fqzgqqenrznzhfpxjltf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxemdxcWVucnpuemhmcHhqbHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMjM4NzIsImV4cCI6MjEwMTc5OTg3Mn0.o_l9AilywN8YK-YTS5tU-tqeibz9O_133tjGevibetA';

const { createClient } = (window.supabase || { createClient: null });
const db = createClient ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

async function fetchAll(table, options = {}) {
  let query = db.from(table).select('*');
  if (options.order)  query = query.order(options.order, { ascending: options.asc ?? false });
  if (options.limit)  query = query.limit(options.limit);
  if (options.filter) query = query.eq(options.filter.col, options.filter.val);
  const { data, error } = await query;
  if (error) { console.error('fetchAll ' + table, error); return []; }
  return data;
}

async function insertRow(table, row) {
  const { error } = await db.from(table).insert(row);
  if (error) { console.error('insertRow ' + table, error); return false; }
  return true;
}

async function deleteRow(table, id) {
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) { console.error('deleteRow ' + table, error); return false; }
  return true;
}

async function updateRow(table, id, updates) {
  const { error } = await db.from(table).update(updates).eq('id', id);
  if (error) { console.error('updateRow ' + table, error); return false; }
  return true;
}

async function compressImage(file, maxW = 1200, quality = 0.8) {
  if (file.type === 'image/gif') return file;
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = URL.createObjectURL(file);
    });
    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(img.src);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    return blob || file;
  } catch (e) {
    console.error('compressImage', e);
    return file;
  }
}

async function uploadImage(file, folder = 'uploads') {
  try {
    const blob = await compressImage(file);
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${folder}/${Date.now()}_${rand}.jpg`;
    const { error } = await db.storage.from('images').upload(path, blob, {
      upsert: true, contentType: 'image/jpeg'
    });
    if (error) { console.error('uploadImage', error); return null; }
    const { data } = db.storage.from('images').getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) {
    console.error('uploadImage', e);
    return null;
  }
}

function showToast(msg, duration = 2500) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

/* Height postMessage stays disabled: SOOP does not listen, and the post viewer can loop on
   frame resize. initIframeResize() is intentionally empty. */
function initIframeResizeDisabled() {
  if (window.self === window.top) return;
  var last = 0;
  function send() {
    var h = Math.ceil(Math.max(
      document.body.scrollHeight, document.body.offsetHeight,
      document.documentElement.offsetHeight));
    if (!h || Math.abs(h - last) < 2) return;
    last = h;
    var p = window.parent;
    try { p.postMessage(h, '*'); } catch (e) {}
    try { p.postMessage({ type: 'resize', height: h }, '*'); } catch (e) {}
    try { p.postMessage({ height: h }, '*'); } catch (e) {}
    try { p.postMessage({ context: 'iframe.resize', height: h }, '*'); } catch (e) {}
    try { p.postMessage('setHeight:' + h, '*'); } catch (e) {}
  }
  send();
  window.addEventListener('load', send);
  window.addEventListener('resize', send);
  document.addEventListener('click', function () { setTimeout(send, 120); });
  if (window.ResizeObserver) new ResizeObserver(send).observe(document.body);
  [200, 600, 1200, 2500].forEach(function (t) { setTimeout(send, t); });
}

function initIframeResize() { }
function enableIframeAutoHeight() { initIframeResize(); }

async function applyTheme(){
  try{
    const { data } = await db.from('profile').select('data').eq('id',1).single();
    const p = (data && data.data) || {};
    const map = {
      'theme-ep-paper':      '--ep-paper',
      'theme-ep-paper-soft': '--ep-paper-soft',
      'theme-ep-week':       '--ep-week',
      'theme-ep-forest':     '--ep-forest',
      'theme-ep-ink':        '--ep-ink',
      'theme-ep-body':       '--ep-body',
      'theme-ep-muted':      '--ep-muted',
      'theme-ep-line':       '--ep-line',
      'theme-ep-yellow':     '--ep-yellow',
      'theme-ep-leaf':       '--ep-leaf',
      'type-display':        '--fs-display',
      'type-title':          '--fs-title',
      'type-body':           '--fs-body',
      'type-label':          '--fs-label'
    };
    Object.keys(map).forEach(function(k){
      if(p[k]) document.documentElement.style.setProperty(map[k], p[k]);
    });
  }catch(e){  }
}
applyTheme();

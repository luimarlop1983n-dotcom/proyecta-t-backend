import './api-config.js';

// Shared by the website and Capacitor. Only random identifiers are sent.
if (!document.querySelector('[data-community]')) {
  const SESSION_KEY = 'proyectat-community-session-v1';
  const VISITOR_KEY = 'proyectat-community-visitor-v1';
  const HELPED_KEY = 'proyectat-community-helped-v1';
  const IDLE_LIMIT = 30 * 60 * 1000;
  const POLL_INTERVAL = 10000;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const base = String(globalThis.PROYECTAT_API_BASE || location.origin).replace(/\/$/, '');
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/community.css';
  document.head.append(stylesheet);
  const panel = document.createElement('section');
  panel.className = 'community-panel';
  panel.dataset.community = '';
  panel.setAttribute('aria-labelledby', 'community-title');
  panel.innerHTML = `<div class="community-intro"><p class="community-kicker">Vamos haciendo camino</p><h2 id="community-title">¿Te ayudó a encontrar tu rumbo?</h2><p>Si aquí has encontrado una idea, un estudio o un próximo paso, cuéntanoslo con un clic.</p></div><div class="community-numbers" aria-label="Actividad de Proyecta-T"><div><strong data-community-visits>—</strong><span>Visitas · sesiones web y app</span></div><div><strong data-community-helped>—</strong><span>«Me has orientado» · opiniones</span></div></div><div class="community-action"><button type="button" data-community-vote aria-describedby="community-vote-status">¡Qué crack! Me has orientado</button><p id="community-vote-status" role="status"></p></div><p class="community-sync" data-community-sync role="status">Cargando los contadores…</p><details class="community-explanation"><summary>Cómo se cuentan</summary><p>Las visitas son sesiones, no personas únicas. Una sesión nueva comienza tras 30 minutos sin actividad en esta pestaña. El botón guarda una opinión anónima por navegador; borrar sus datos o cambiar de dispositivo permite otra. No pedimos nombre ni cuenta. Los contadores se actualizan cada 10 segundos mientras esta página está visible y tiene conexión.</p></details>`;
  const main = document.querySelector('main');
  const footer = main?.querySelector(':scope > footer');
  if (footer) footer.before(panel);
  else (main || document.body).append(panel);

  const visitCount = panel.querySelector('[data-community-visits]');
  const helpedCount = panel.querySelector('[data-community-helped]');
  const voteButton = panel.querySelector('[data-community-vote]');
  const voteStatus = panel.querySelector('#community-vote-status');
  const syncStatus = panel.querySelector('[data-community-sync]');
  const number = new Intl.NumberFormat('es-ES');
  const controllers = new Set();
  let session, visitor, helped = false, votePending = false, stopped = false;
  let timer, polling = false, lastSaved = 0, totals = null;
  const pendingVisits = new Set();
  const confirmedVisits = new Set();

  function read(storage, key) {
    try { return window[storage].getItem(key); } catch { return null; }
  }
  function write(storage, key, value) {
    try { window[storage].setItem(key, value); } catch { /* Keep the same identifiers in memory. */ }
  }
  function newId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  function getVisitor() {
    if (visitor) return visitor;
    const saved = read('localStorage', VISITOR_KEY);
    visitor = uuidPattern.test(saved || '') ? saved : newId();
    write('localStorage', VISITOR_KEY, visitor);
    return visitor;
  }
  function updateVoteState() {
    voteButton.disabled = helped || votePending;
    voteButton.setAttribute('aria-pressed', String(helped));
  }
  function setCounts(data) {
    if (!Number.isSafeInteger(data.visits) || data.visits < 0 || !Number.isSafeInteger(data.helped) || data.helped < 0) throw new Error('Invalid counters');
    // A GET already in flight can finish after a vote or visit response.
    totals = {visits: Math.max(totals?.visits || 0, data.visits), helped: Math.max(totals?.helped || 0, data.helped)};
    visitCount.textContent = number.format(totals.visits);
    helpedCount.textContent = number.format(totals.helped);
    syncStatus.textContent = 'Datos actualizados · se renuevan cada 10 s';
    panel.dataset.communityState = 'ready';
  }
  function syncFailed() {
    syncStatus.textContent = totals ? 'Mostramos los últimos datos recibidos. No se han podido actualizar.' : 'Los contadores no están disponibles ahora. Volveremos a intentarlo con conexión.';
    panel.dataset.communityState = 'unavailable';
  }
  async function request(path, body) {
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${base}/api/community${path}`, {
        method: body ? 'POST' : 'GET',
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        ...(body ? {headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})
      });
      if (!response.ok) throw new Error('Community unavailable');
      return await response.json();
    } finally { clearTimeout(timeout); controllers.delete(controller); }
  }
  async function registerVisit(id) {
    if (stopped || document.hidden || !navigator.onLine || pendingVisits.has(id) || confirmedVisits.has(id)) return;
    pendingVisits.add(id);
    try {
      const data = await request('/visit', {session_id: id});
      if (!stopped) { setCounts(data); confirmedVisits.add(id); }
    } catch { if (!stopped) syncFailed(); }
    finally { pendingVisits.delete(id); }
  }
  function activity() {
    if (stopped || document.hidden) return;
    const now = Date.now();
    if (!session) {
      try { session = JSON.parse(read('sessionStorage', SESSION_KEY)); } catch { session = null; }
    }
    if (!session || !uuidPattern.test(session.id || '') || !Number.isFinite(session.lastActive) || now - session.lastActive >= IDLE_LIMIT || session.lastActive > now) {
      session = {id: newId(), lastActive: now};
      lastSaved = 0;
    }
    session.lastActive = now;
    if (now - lastSaved >= 1000) {
      write('sessionStorage', SESSION_KEY, JSON.stringify(session));
      lastSaved = now;
    }
    void registerVisit(session.id);
  }
  async function refresh() {
    if (stopped || document.hidden || !navigator.onLine || polling) return;
    polling = true;
    try { const data = await request(''); if (!stopped) setCounts(data); }
    catch { if (!stopped) syncFailed(); }
    finally { polling = false; }
    // Retry the existing visit after a network failure, never extend its activity time.
    if (session) void registerVisit(session.id);
  }
  function pause() { clearInterval(timer); timer = null; }
  function resume() {
    pause();
    if (stopped || document.hidden) return;
    if (!navigator.onLine) { syncFailed(); return; }
    void refresh();
    timer = setInterval(refresh, POLL_INTERVAL);
  }
  function visibility() { if (document.hidden) pause(); else { activity(); resume(); } }
  function offline() { pause(); syncFailed(); }
  function storageChanged(event) {
    if (event.key !== HELPED_KEY || event.newValue !== visitor) return;
    helped = true;
    updateVoteState();
    voteStatus.textContent = 'Tu opinión ya está contada. ¡Gracias por compartir tu próximo paso!';
    void refresh();
  }
  const activityEvents = ['pointerdown', 'keydown', 'scroll'];
  function attachActivity() { for (const type of activityEvents) document.addEventListener(type, activity, {passive: true}); }
  function detachActivity() { for (const type of activityEvents) document.removeEventListener(type, activity); }
  function pagehide() {
    stopped = true;
    pause();
    detachActivity();
    for (const controller of controllers) controller.abort();
    if (session) write('sessionStorage', SESSION_KEY, JSON.stringify(session));
  }
  function pageshow(event) {
    if (!event.persisted) return;
    stopped = false;
    attachActivity();
    activity();
    resume();
  }
  voteButton.addEventListener('click', async () => {
    if (helped || votePending) return;
    votePending = true;
    voteStatus.textContent = 'Guardando tu opinión…';
    updateVoteState();
    try {
      const data = await request('/helped', {visitor_id: getVisitor()});
      if (typeof data.already_counted !== 'boolean') throw new Error('Invalid response');
      setCounts(data);
      helped = true;
      write('localStorage', HELPED_KEY, visitor);
      voteStatus.textContent = data.already_counted ? 'Tu opinión ya estaba contada. ¡Gracias por volver!' : '¡Gracias! Tu opinión está contada. A por tu próximo paso.';
    } catch {
      voteStatus.textContent = 'No hemos podido confirmar tu opinión. Pulsa otra vez para reintentarlo; no se contará dos veces.';
    } finally { votePending = false; updateVoteState(); }
  });

  getVisitor();
  helped = read('localStorage', HELPED_KEY) === visitor;
  if (helped) voteStatus.textContent = 'Tu opinión ya está contada. ¡Gracias por compartir tu próximo paso!';
  updateVoteState();
  attachActivity();
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('online', resume);
  window.addEventListener('offline', offline);
  window.addEventListener('storage', storageChanged);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', pageshow);
  activity();
  resume();
}

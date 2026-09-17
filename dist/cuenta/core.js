import '../api-config.js';
export const API_BASE = globalThis.PROYECTAT_API_BASE;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sourceURL(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
export function eligibility(o) {
  const e = o.eligibility || {};
  const expired = /^\d{4}-\d{2}-\d{2}$/.test(o.deadline || '') && o.deadline < new Date().toLocaleDateString('sv-SE');
  if (o.status === 'unverified') return 'pending';
  if (o.status === 'closed' || o.status === 'stale' || e.eligible === false || expired) return 'excluded';
  return e.eligible === true && e.complete === true && !(e.unknown || []).length ? 'ready' : 'pending';
}
export function filterOpportunities(rows, query='', type='', status='', category='', verification='') {
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = normalize(query.trim());
  return rows.filter(o => (!q || normalize([o.title,o.org,o.location,o.summary,o.type,...(o.categories||[])].join(' ')).includes(q)) && (!type || o.type === type) && (!status || eligibility(o) === status) && (!category || (o.categories||[]).includes(category)) && (!verification || o.status === verification));
}
export class ApiError extends Error { constructor(message, status=0) { super(message); this.status=status; } }
export function createAPI(getToken, fetcher=fetch) {
  let session = new AbortController();
  const request = async (path, options={}) => {
    const timer = new AbortController();
    const timeout = setTimeout(() => timer.abort(), 20000);
    const signal = AbortSignal.any([session.signal, timer.signal]);
    try {
      const token = getToken();
      const headers = {Accept:'application/json', ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {})};
      const response = await fetcher(API_BASE + path, {...options,headers,signal,credentials:'omit',cache:'no-store'});
      if(signal.aborted) throw new DOMException('Cancelada','AbortError');
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        let message = typeof data?.detail === 'string' ? data.detail : Array.isArray(data?.detail) ? data.detail.map(x=>x.msg).join('. ') : '';
        if(response.status===401&&path==='/api/login')message='El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.';
        if(response.status===409&&path==='/api/signup')message='Ya hay una cuenta con este correo. Pulsa Entrar para acceder.';
        if(response.status===429)message='Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.';
        if(response.status>=500) message='El servicio no está disponible ahora. Inténtalo de nuevo.';
        throw new ApiError(message || `No se pudo completar la petición (${response.status}).`,response.status);
      }
      if(data === null) throw new ApiError('El servidor devolvió una respuesta inesperada.');
      return data;
    } catch (error) {
      if(timer.signal.aborted) throw new ApiError('La conexión está tardando demasiado. Vuelve a intentarlo.');
      if(error.name==='AbortError' || error instanceof ApiError) throw error;
      throw new ApiError('No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.');
    } finally { clearTimeout(timeout); }
  };
  request.cancel=()=>{session.abort();session=new AbortController();};
  return request;
}

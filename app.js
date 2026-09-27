/* NEGRET'S PRO MASTER — js/app.js — interface */
'use strict';

const $  = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtMoney = v => BRL.format(Number(v) || 0);
const priceText = v => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad4 = n => String(n).padStart(4, '0');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const fmtDate = iso => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function parsePrice(str){
  const raw = String(str ?? '').trim();
  if (!raw) return 0;
  const n = raw.includes(',')
    ? parseFloat(raw.replace(/\./g, '').replace(',', '.'))
    : parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ícones SVG */
const SW = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const svgWrap = (inner, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" ${SW}>${inner}</svg>`;
const I = {
  plus:   (s) => svgWrap('<path d="M12 5v14M5 12h14"/>', s),
  check:  (s) => svgWrap('<path d="M5 12.5l4.5 4.5L19 7.5"/>', s),
  pencil: (s) => svgWrap('<path d="M4 20l4.2-1.1L20.4 6.7a2.05 2.05 0 0 0-2.9-2.9L5.3 15.9 4 20z"/><path d="M14.5 6.2l2.9 2.9"/>', s),
  trash:  (s) => svgWrap('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>', s),
  camera: (s) => svgWrap('<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7l1.4-2.4h3.2L15 7"/><circle cx="12" cy="13.3" r="3.4"/>', s),
  file:   (s) => svgWrap('<path d="M7 2.5h7l5 5V19a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 19V5A2.5 2.5 0 0 1 7 2.5z"/><path d="M14 2.5V8h5"/>', s),
  x:      (s) => svgWrap('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', s),
  chevron:(s) => svgWrap('<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>', s)
};

/* toast */
const Toast = (() => {
  let el, timer;
  return {
    show(msg, type = 'ok'){
      el = el || $('#toast');
      el.textContent = msg;
      el.className = 'toast show' + (type === 'error' ? ' error' : '');
      clearTimeout(timer);
      timer = setTimeout(() => { el.className = 'toast'; }, 3000);
    }
  };
})();

/* confirmação */
const Confirm = (() => {
  let onYes = null;
  function open({ title, message, yes = 'Confirmar', no = 'Cancelar', danger = false, onYes: cb }){
    onYes = cb || null;
    $('#confirm-title').textContent = title;
    $('#confirm-msg').textContent = message;
    const b = $('#confirm-yes');
    b.textContent = yes;
    b.classList.toggle('btn-danger', danger);
    b.classList.toggle('btn-primary', !danger);
    $('#confirm-no').textContent = no;
    $('#confirm-modal').classList.add('open');
  }
  function close(){ $('#confirm-modal').classList.remove('open'); onYes = null; }
  function bind(){
    $('#confirm-yes').addEventListener('click', () => { const cb = onYes; close(); if (cb) cb(); });
    $('#confirm-no').addEventListener('click', close);
    $('#confirm-modal').addEventListener('click', e => { if (e.target.id === 'confirm-modal') close(); });
  }
  return { open, close, bind };
})();

/* estado */
const State = { services: [], orders: [], draft: null, editingService: null, view: 'home' };
let quotaWarned = false;

function buildDraft(){
  State.draft = {
    client: '',
    date: todayISO(),
    signature: null,
    sigRatio: 3,
    modules: State.services.map(s => ({
      serviceId: s.id,
      name: s.name,
      price: s.price,
      included: false,
      tasks: (s.tasks || []).map(t => ({ label: t, done: false })),
      photos: { before: [], after: [] }
    }))
  };
}

function syncDraft(){
  const d = State.draft;
  if (!d) return;
  State.services.forEach(s => {
    if (!d.modules.some(m => m.serviceId === s.id)) {
      d.modules.push({
        serviceId: s.id, name: s.name, price: s.price, included: false,
        tasks: (s.tasks || []).map(t => ({ label: t, done: false })),
        photos: { before: [], after: [] }
      });
    }
  });
}

function persistDraft(){
  try { DB.saveDraft(State.draft); }
  catch (e) {
    if (!quotaWarned) {
      quotaWarned = true;
      Toast.show('Armazenamento quase cheio — remova fotos antigas do histórico.', 'error');
    }
  }
}

/* navegação */
function go(view){
  State.view = view;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'home') renderHome();
  if (view === 'new') renderNew();
  if (view === 'services') renderServices();
  if (view === 'history') renderHistory();
  window.scrollTo({ top: 0 });
}

/* ================= INÍCIO ================= */
function renderHome(){
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthOrders = State.orders.filter(o => String(o.date).startsWith(monthKey));
  const revenue = monthOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const photos = State.orders.reduce((s, o) =>
    s + (o.modules || []).reduce((a, m) => a + (m.photos?.before?.length || 0) + (m.photos?.after?.length || 0), 0), 0);

  $('#stat-revenue').textContent = fmtMoney(revenue);
  $('#stat-orders').textContent = monthOrders.length;
  $('#stat-photos').textContent = photos;
  $('#hero-next').textContent = 'Próxima ordem #' + pad4(DB.peekNextOrderNumber());

  const recent = State.orders.slice(0, 3);
  $('#home-recent').innerHTML = recent.length
    ? recent.map(orderRow).join('')
    : '<div class="card pad empty">Nenhuma ordem concluída ainda. Toque em <b>Nova Ordem de Serviço</b> para começar.</div>';

  $('#home-services').innerHTML = State.services.map(s => `
    <div class="row">
      <div class="row-main"><b>${esc(s.name)}</b><span>${(s.tasks || []).length} tarefas padrão</span></div>
      <span class="row-price">${fmtMoney(s.price)}</span>
    </div>`).join('');
}

function orderRow(o){
  const count = (o.modules || []).length;
  return `
  <button class="card order-head order-row" data-open-order="${o.id}" style="border-radius:var(--r)">
    <span class="order-num">#${pad4(o.number)}</span>
    <span class="order-main"><b>${esc(o.client)}</b><span>${fmtDate(o.date)} · ${count} serviço${count === 1 ? '' : 's'}</span></span>
    <span class="order-total">${fmtMoney(o.total)}</span>
    ${I.chevron(18)}
  </button>`;
}

/* ================= GERENCIAR SERVIÇOS ================= */
function renderServices(){
  $('#services-list').innerHTML = State.services.length
    ? State.services.map(s => `
      <div class="row svc-row">
        <div class="row-main"><b>${esc(s.name)}</b><span>${(s.tasks || []).length} tarefa${(s.tasks || []).length === 1 ? '' : 's'} padrão</span></div>
        <input class="price-inline" inputmode="decimal" value="${priceText(s.price)}"
               data-svc-price="${s.id}" aria-label="Editar preço de ${esc(s.name)}" title="Toque para editar o preço">
        <button class="icon-btn" data-svc-edit="${s.id}" aria-label="Editar ${esc(s.name)}">${I.pencil(20)}</button>
        <button class="icon-btn danger" data-svc-del="${s.id}" aria-label="Excluir ${esc(s.name)}">${I.trash(20)}</button>
      </div>`).join('')
    : '<div class="pad empty">Nenhum serviço cadastrado.</div>';
}

function resetServiceForm(){
  State.editingService = null;
  $('#svc-name').value = '';
  $('#svc-price').value = '';
  $('#service-form-title').textContent = 'Novo serviço';
  $('#btn-save-service').textContent = 'Salvar Novo Serviço';
  $('#btn-cancel-service').hidden = true;
}

function editService(id){
  const s = State.services.find(x => x.id === id);
  if (!s) return;
  State.editingService = id;
  $('#svc-name').value = s.name;
  $('#svc-price').value = priceText(s.price);
  $('#service-form-title').textContent = 'Editar serviço';
  $('#btn-save-service').textContent = 'Salvar Alterações';
  $('#btn-cancel-service').hidden = false;
  $('#service-form-card').scrollIntoView({ behavior: 'smooth', block: 'end' });
  setTimeout(() => $('#svc-name').focus({ preventScroll: true }), 350);
}

function saveServiceForm(){
  const name = $('#svc-name').value.trim();
  const price = parsePrice($('#svc-price').value);
  if (!name)  { Toast.show('Informe o nome do serviço.', 'error'); $('#svc-name').focus(); return; }
  if (price <= 0) { Toast.show('Informe um preço válido em R$.', 'error'); $('#svc-price').focus(); return; }

  if (State.editingService) {
    DB.updateService(State.editingService, { name, price });
    Toast.show(`Serviço “${name}” atualizado.`);
  } else {
    DB.addService(name, price);
    Toast.show(`Serviço “${name}” adicionado — ele já é um módulo na Nova Ordem.`);
  }
  State.services = DB.getServices();
  resetServiceForm();
  renderServices();
}

function deleteService(id){
  const s = State.services.find(x => x.id === id);
  if (!s) return;
  Confirm.open({
    title: `Excluir “${s.name}”?`,
    message: 'O serviço deixa de aparecer nas novas ordens. Ordens antigas do histórico permanecem intactas.',
    yes: 'Excluir serviço',
    danger: true,
    onYes(){
      DB.removeService(id);
      State.services = DB.getServices();
      renderServices();
      Toast.show('Serviço excluído.');
    }
  });
}

function bindServices(){
  $('#btn-add-service').addEventListener('click', () => {
    resetServiceForm();
    $('#service-form-card').scrollIntoView({ behavior: 'smooth', block: 'end' });
    setTimeout(() => $('#svc-name').focus({ preventScroll: true }), 350);
  });
  $('#btn-save-service').addEventListener('click', saveServiceForm);
  $('#btn-cancel-service').addEventListener('click', () => { resetServiceForm(); renderServices(); });

  $('#svc-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#svc-price').focus(); });
  $('#svc-price').addEventListener('keydown', e => { if (e.key === 'Enter') saveServiceForm(); });

  const list = $('#services-list');
  list.addEventListener('click', e => {
    const ed = e.target.closest('[data-svc-edit]');
    if (ed) { editService(ed.dataset.svcEdit); return; }
    const del = e.target.closest('[data-svc-del]');
    if (del) deleteService(del.dataset.svcDel);
  });

  list.addEventListener('change', e => {
    const inp = e.target.closest('[data-svc-price]');
    if (!inp) return;
    const s = State.services.find(x => x.id === inp.dataset.svcPrice);
    if (!s) return;
    const v = parsePrice(inp.value);
    if (v > 0) {
      DB.updateService(s.id, { price: v });
      s.price = v;
      Toast.show(`Preço de “${s.name}” atualizado para ${fmtMoney(v)}.`);
    }
    inp.value = priceText(s.price);
  });
  list.addEventListener('keydown', e => {
    if (e.target.closest('[data-svc-price]') && e.key === 'Enter') e.target.blur();
  });
}

/* ================= NOVA ORDEM ================= */
function renderNew(){
  syncDraft();
  $('#os-client').value = State.draft.client;
  $('#os-date').value = State.draft.date;
  $('#os-modules').innerHTML = State.draft.modules.map((m, i) => moduleHTML(m, i)).join('');
  sizeSignature();
  updateTotal();
}

function moduleHTML(m, i){
  const on = m.included;
  const done = m.tasks.filter(t => t.done).length;

  const body = !on ? '' : `
    <div class="mod-body">
      <div class="tasks">
        ${m.tasks.map((t, ti) => `
          <button type="button" class="task ${t.done ? 'done' : ''}" data-act="task" data-mi="${i}" data-ti="${ti}">
            ${I.check(15)}<span>${esc(t.label)}</span>
          </button>`).join('')}
        <form class="task-add" data-mi="${i}">
          <input type="text" placeholder="Nova tarefa…" maxlength="80">
          <button type="submit" aria-label="Adicionar tarefa">${I.plus(18)}</button>
        </form>
      </div>
      <div class="photo-groups">
        ${photoGroup(m, i, 'before', 'Foto Antes')}
        ${photoGroup(m, i, 'after', 'Foto Depois')}
      </div>
    </div>`;

  return `
  <article class="card module ${on ? 'on' : ''}" id="mod-${m.serviceId}">
    <header class="mod-head">
      <label class="switch">
        <input type="checkbox" data-act="toggle" data-mi="${i}" ${on ? 'checked' : ''}>
        <span></span>
      </label>
      <div class="row-main">
        <b>${esc(m.name)}</b>
        <span>${on ? `${done} de ${m.tasks.length} tarefas concluídas` : 'Módulo do serviço'}</span>
      </div>
      ${on
        ? `<span class="mod-price">R$ <input inputmode="decimal" data-act="price" data-mi="${i}" value="${priceText(m.price)}"></span>`
        : `<span class="row-price off">${fmtMoney(m.price)}</span>`}
    </header>
    ${body}
  </article>`;
}

function photoGroup(m, i, side, label){
  const list = m.photos[side];
  return `
  <div class="photo-group">
    <span class="ph-label">${I.camera(16)} ${label}</span>
    <div class="thumbs">
      ${list.map((src, pi) => `
        <span class="thumb">
          <img src="${src}" alt="${label}" data-lightbox>
          <button type="button" data-act="delfoto" data-mi="${i}" data-side="${side}" data-pi="${pi}" aria-label="Remover foto">${I.x(12)}</button>
        </span>`).join('')}
      <label class="thumb add">
        ${I.camera(20)}
        <input type="file" accept="image/*" capture="environment" multiple hidden
               data-act="photo" data-mi="${i}" data-side="${side}">
      </label>
    </div>
  </div>`;
}

function refreshModule(mi){
  const m = State.draft.modules[mi];
  if (!m) return;
  const el = document.getElementById('mod-' + m.serviceId);
  if (el) el.outerHTML = moduleHTML(m, mi);
}

function updateTotal(){
  const total = State.draft.modules.filter(m => m.included).reduce((s, m) => s + (Number(m.price) || 0), 0);
  $('#finish-total').textContent = fmtMoney(total);
  return total;
}

/* fotos: compressão para caber no localStorage */
function compressImage(file, max = 900, q = 0.55){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', q));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

async function handlePhotos(files, mi, side){
  const m = State.draft.modules[mi];
  if (!m || !files || !files.length) return 0;
  let n = 0;
  for (const f of files) {
    try { m.photos[side].push(await compressImage(f)); n++; }
    catch (e) { Toast.show('Não foi possível ler uma das imagens.', 'error'); }
  }
  return n;
}

/* assinatura */
let sigCtx = null;

function bindSignature(){
  const cv = $('#sig-canvas');
  sigCtx = cv.getContext('2d');
  let drawing = false;
  const pos = e => {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  cv.addEventListener('pointerdown', e => {
    drawing = true;
    cv.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    sigCtx.beginPath(); sigCtx.moveTo(x, y); sigCtx.lineTo(x + 0.1, y + 0.1); sigCtx.stroke();
    $('#sig-hint').hidden = true;
  });
  cv.addEventListener('pointermove', e => {
    if (!drawing) return;
    const [x, y] = pos(e);
    sigCtx.lineTo(x, y); sigCtx.stroke();
  });
  const stop = () => {
    if (!drawing) return;
    drawing = false;
    if (State.draft) {
      State.draft.signature = cv.toDataURL('image/png');
      State.draft.sigRatio = cv.width / cv.height;
      persistDraft();
    }
  };
  cv.addEventListener('pointerup', stop);
  cv.addEventListener('pointercancel', stop);

  $('#sig-clear').addEventListener('click', () => {
    sigCtx.clearRect(0, 0, cv.width, cv.height);
    if (State.draft) { State.draft.signature = null; persistDraft(); }
    $('#sig-hint').hidden = false;
    Toast.show('Assinatura apagada.');
  });
}

function sizeSignature(){
  const cv = $('#sig-canvas');
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(cv.clientWidth, 100), h = 160;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  sigCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sigCtx.lineWidth = 2.4; sigCtx.lineCap = 'round'; sigCtx.lineJoin = 'round';
  sigCtx.strokeStyle = '#0C2D4D';
  sigCtx.clearRect(0, 0, w, h);
  if (State.draft && State.draft.signature) {
    const img = new Image();
    img.onload = () => sigCtx.drawImage(img, 0, 0, w, h);
    img.src = State.draft.signature;
    $('#sig-hint').hidden = true;
  } else {
    $('#sig-hint').hidden = false;
  }
}

/* interações da nova ordem */
function bindNew(){
  const wrap = $('#os-modules');

  wrap.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const mi = +el.dataset.mi;
    const m = State.draft.modules[mi];
    if (!m) return;

    if (el.dataset.act === 'task') {
      const t = m.tasks[+el.dataset.ti];
      t.done = !t.done;
      el.classList.toggle('done', t.done);
      const info = el.closest('.mod-body')?.previousElementSibling?.querySelector('.row-main span');
      const done = m.tasks.filter(x => x.done).length;
      if (info) info.textContent = `${done} de ${m.tasks.length} tarefas concluídas`;
      persistDraft();
    }
    if (el.dataset.act === 'delfoto') {
      m.photos[el.dataset.side].splice(+el.dataset.pi, 1);
      refreshModule(mi);
      persistDraft();
    }
  });

  wrap.addEventListener('change', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const mi = +el.dataset.mi;
    const m = State.draft.modules[mi];
    if (!m) return;

    if (el.dataset.act === 'toggle') {
      m.included = el.checked;
      refreshModule(mi);
      updateTotal();
      persistDraft();
    }
    if (el.dataset.act === 'photo') {
      handlePhotos(el.files, mi, el.dataset.side).then(n => {
        if (n) Toast.show(n === 1 ? 'Foto registrada no app.' : `${n} fotos registradas no app.`);
        refreshModule(mi);
        persistDraft();
      });
      el.value = '';
    }
  });

  wrap.addEventListener('input', e => {
    const el = e.target.closest('[data-act="price"]');
    if (!el) return;
    const m = State.draft.modules[+el.dataset.mi];
    m.price = parsePrice(el.value);
    updateTotal();
    persistDraft();
  });
  wrap.addEventListener('focusout', e => {
    const el = e.target.closest('[data-act="price"]');
    if (!el) return;
    el.value = priceText(State.draft.modules[+el.dataset.mi].price);
  });

  wrap.addEventListener('submit', e => {
    const form = e.target.closest('.task-add');
    if (!form) return;
    e.preventDefault();
    const mi = +form.dataset.mi;
    const input = form.querySelector('input');
    const label = input.value.trim();
    if (!label) return;
    State.draft.modules[mi].tasks.push({ label, done: false });
    input.value = '';
    input.focus();
    refreshModule(mi);
    persistDraft();
    Toast.show('Tarefa adicionada.');
  });

  $('#os-client').addEventListener('input', e => { State.draft.client = e.target.value; persistDraft(); });
  $('#os-client').addEventListener('keydown', e => { if (e.key === 'Enter') $('#os-date').focus(); });
  $('#os-date').addEventListener('change', e => { State.draft.date = e.target.value; persistDraft(); });
}

/* concluir ordem */
function bindFinish(){
  $('#btn-finish').addEventListener('click', openFinish);
  $('#finish-cancel').addEventListener('click', () => $('#finish-modal').classList.remove('open'));
  $('#finish-modal').addEventListener('click', e => { if (e.target.id === 'finish-modal') $('#finish-modal').classList.remove('open'); });
  $('#finish-confirm').addEventListener('click', concludeOrder);

  $('#success-new').addEventListener('click', () => { $('#success-modal').classList.remove('open'); go('new'); });
  $('#success-history').addEventListener('click', () => { $('#success-modal').classList.remove('open'); go('history'); });
}

function openFinish(){
  const d = State.draft;
  if (!d.client.trim()) {
    Toast.show('Informe o nome do cliente.', 'error');
    $('#os-client').focus();
    return;
  }
  const inc = d.modules.filter(m => m.included);
  if (!inc.length) { Toast.show('Ative pelo menos um módulo de serviço.', 'error'); return; }

  const tasksDone = inc.reduce((s, m) => s + m.tasks.filter(t => t.done).length, 0);
  const tasksAll  = inc.reduce((s, m) => s + m.tasks.length, 0);
  const photos    = inc.reduce((s, m) => s + m.photos.before.length + m.photos.after.length, 0);

  $('#finish-summary').innerHTML = `
    <div><dt>Cliente</dt><dd>${esc(d.client.trim())}</dd></div>
    <div><dt>Data</dt><dd>${fmtDate(d.date)}</dd></div>
    <div><dt>Serviços</dt><dd>${inc.length} módulo${inc.length === 1 ? '' : 's'}</dd></div>
    <div><dt>Tarefas</dt><dd>${tasksDone} de ${tasksAll} concluídas</dd></div>
    <div><dt>Fotos no app</dt><dd>${photos} registro${photos === 1 ? '' : 's'} Antes/Depois</dd></div>
    <div><dt>Total</dt><dd class="sum-total">${fmtMoney(updateTotal())}</dd></div>`;
  $('#finish-modal').classList.add('open');
}

function concludeOrder(){
  const d = State.draft;
  const inc = d.modules.filter(m => m.included);
  const photos = inc.reduce((s, m) => s + m.photos.before.length + m.photos.after.length, 0);

  const order = {
    id: uid(),
    number: DB.nextOrderNumber(),
    client: d.client.trim(),
    date: d.date || todayISO(),
    createdAt: new Date().toISOString(),
    total: inc.reduce((s, m) => s + (Number(m.price) || 0), 0),
    modules: inc.map(m => ({
      name: m.name, price: m.price, included: true,
      tasks: m.tasks.map(t => ({ ...t })),
      photos: { before: [...m.photos.before], after: [...m.photos.after] }
    })),
    photosCount: photos,
    photosDropped: false,
    signature: d.signature,
    sigRatio: d.sigRatio,
    pdf: null
  };

  $('#finish-modal').classList.remove('open');
  State.orders.unshift(order);

  try {
    DB.saveOrders(State.orders);
    DB.clearDraft();
    finishAfterSave(order);
  } catch (e) {
    State.orders.shift();
    Confirm.open({
      title: 'Armazenamento cheio',
      message: 'As fotos desta ordem não couberam no armazenamento local. Deseja concluir mantendo o PDF, os valores e a assinatura — apenas sem as fotos?',
      yes: 'Concluir sem as fotos',
      danger: true,
      onYes(){
        order.modules.forEach(m => { m.photos = { before: [], after: [] }; });
        order.photosCount = 0;
        order.photosDropped = true;
        State.orders.unshift(order);
        try { DB.saveOrders(State.orders); DB.clearDraft(); }
        catch (e2) { Toast.show('Não foi possível salvar no histórico.', 'error'); }
        finishAfterSave(order);
      }
    });
  }
}

async function finishAfterSave(order){
  buildDraft();
  renderNew();

  $('#success-title').textContent = `Ordem #${pad4(order.number)} concluída`;
  $('#success-status').textContent = 'Emitindo PDF leve (sem fotos)…';
  $('#success-modal').classList.add('open');

  const res = await Report.emit(order);
  if (res.ok) {
    $('#success-status').textContent = 'PDF gerado: ' + res.file;
    State.orders = DB.getOrders();
  } else {
    $('#success-status').textContent = 'Ordem salva no histórico, mas o PDF não foi emitido: ' + res.error;
  }
}

/* ================= HISTÓRICO ================= */
function renderHistory(){
  $('#orders-list').innerHTML = State.orders.length
    ? State.orders.map(orderDetail).join('')
    : '<div class="card pad empty">Sem ordens no histórico ainda.</div>';
}

function orderDetail(o){
  return `
  <article class="card order" id="order-${o.id}">
    <button class="order-head" data-toggle-order="${o.id}">
      <span class="order-num">#${pad4(o.number)}</span>
      <span class="order-main"><b>${esc(o.client)}</b><span>${fmtDate(o.date)} · ${(o.modules || []).length} serviço${(o.modules || []).length === 1 ? '' : 's'}</span></span>
      <span class="order-total">${fmtMoney(o.total)}</span>
      ${I.chevron(18)}
    </button>
    <div class="order-body" hidden>
      ${o.photosDropped ? '<p class="warn-note">Fotos não arquivadas nesta ordem por falta de espaço no armazenamento.</p>' : ''}
      ${(o.modules || []).map(m => {
        const hasPhotos = (m.photos?.before?.length || 0) + (m.photos?.after?.length || 0) > 0;
        const doneTasks = (m.tasks || []).filter(t => t.done).map(t => esc(t.label)).join(' · ');
        return `
        <div class="omod">
          <div class="omod-head"><b>${esc(m.name)}</b><span>${fmtMoney(m.price)}</span></div>
          ${doneTasks ? `<p class="omod-tasks">${doneTasks}</p>` : ''}
          ${hasPhotos ? `
            <div class="photo-groups">
              ${histPhotos(m.photos.before, 'Antes')}
              ${histPhotos(m.photos.after, 'Depois')}
            </div>` : ''}
        </div>`;
      }).join('')}
      ${o.signature ? `<p class="sig-note">${I.check(14)} Assinatura do cliente registrada no PDF.</p>` : ''}
      <div class="order-actions">
        <button class="btn btn-ghost btn-grow" data-pdf-order="${o.id}">${I.file(18)} Emitir PDF</button>
        <button class="btn btn-danger" data-del-order="${o.id}">${I.trash(18)} Excluir</button>
      </div>
    </div>
  </article>`;
}

function histPhotos(arr, label){
  if (!arr || !arr.length) return '';
  return `
  <div class="photo-group">
    <span class="ph-label">${label}</span>
    <div class="thumbs">
      ${arr.map(src => `<span class="thumb"><img src="${src}" alt="Registro ${label}" data-lightbox></span>`).join('')}
    </div>
  </div>`;
}

function bindHistory(){
  $('#orders-list').addEventListener('click', e => {
    if (e.target.closest('img[data-lightbox]')) return;

    const tog = e.target.closest('[data-toggle-order]');
    if (tog) {
      const body = tog.nextElementSibling;
      body.hidden = !body.hidden;
      tog.classList.toggle('open', !body.hidden);
      return;
    }
    const pdf = e.target.closest('[data-pdf-order]');
    if (pdf) {
      Toast.show('Emitindo PDF…');
      Report.reemit(pdf.dataset.pdfOrder).then(res => {
        Toast.show(res.ok ? 'PDF gerado com sucesso.' : 'Falha ao gerar o PDF: ' + res.error, res.ok ? 'ok' : 'error');
      });
      return;
    }
    const del = e.target.closest('[data-del-order]');
    if (del) {
      const id = del.dataset.delOrder;
      const o = State.orders.find(x => x.id === id);
      if (!o) return;
      Confirm.open({
        title: `Excluir ordem #${pad4(o.number)}?`,
        message: 'A ordem e suas fotos salvas no app serão apagadas definitivamente. O PDF já emitido não é afetado.',
        yes: 'Excluir ordem',
        danger: true,
        onYes(){
          State.orders = State.orders.filter(x => x.id !== id);
          try { DB.saveOrders(State.orders); } catch (err) { Toast.show('Falha ao salvar.', 'error'); }
          renderHistory();
          Toast.show('Ordem excluída do histórico.');
        }
      });
    }
  });
}

/* shell, lightbox e boot */
function bindShell(){
  $$('.tabbar button').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
  $('#btn-hero-new').addEventListener('click', () => go('new'));

  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) go(g.dataset.go);
  });

  $('#home-recent').addEventListener('click', e => {
    const row = e.target.closest('[data-open-order]');
    if (!row) return;
    go('history');
    requestAnimationFrame(() => {
      const art = document.getElementById('order-' + row.dataset.openOrder);
      if (art) {
        art.querySelector('.order-body').hidden = false;
        art.querySelector('.order-head').classList.add('open');
        setTimeout(() => art.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      }
    });
  });
}

function bindLightbox(){
  document.addEventListener('click', e => {
    const img = e.target.closest('img[data-lightbox]');
    if (img) { $('#lightbox img').src = img.src; $('#lightbox').classList.add('open'); return; }
    if (e.target.closest('#lightbox')) $('#lightbox').classList.remove('open');
  });
}

function boot(){
  DB.ensureSeed();
  State.services = DB.getServices();
  State.orders = DB.getOrders();

  const saved = DB.getDraft();
  State.draft = (saved && Array.isArray(saved.modules)) ? saved : null;
  if (!State.draft) buildDraft();
  syncDraft();

  const d = new Date();
  $('#top-date').textContent = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;

  bindShell();
  bindServices();
  bindNew();
  bindFinish();
  bindHistory();
  bindSignature();
  Confirm.bind();
  bindLightbox();

  go('home');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

document.addEventListener('DOMContentLoaded', boot);

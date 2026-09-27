/* NEGRET'S PRO MASTER — js/db.js — persistência em localStorage */
'use strict';

const DB = (() => {

  const KEYS = {
    services: 'npro.services.v1',
    orders:   'npro.orders.v1',
    seq:      'npro.seq.v1',
    draft:    'npro.draft.v1'
  };

  const read = (key, fallback) => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { console.warn('[DB] leitura falhou:', key, e); return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const SEED = [
    { name: 'Piscina',      price: 180, tasks: ['Aspirar o fundo', 'Peneirar a superfície', 'Medir e ajustar pH / cloro', 'Limpar bordas'] },
    { name: 'Rocada',       price: 90,  tasks: ['Roçar a área combinada', 'Aparar bordas e muretas', 'Recolher e ensacar resíduos'] },
    { name: 'Área Gourmet', price: 120, tasks: ['Limpar churrasqueira e bancadas', 'Lavar piso e azulejos', 'Organizar mobiliário'] },
    { name: 'Casa Sede',    price: 220, tasks: ['Varrer e aspirar os ambientes', 'Limpar vidros e janelas', 'Lavar banheiros', 'Passar pano nos pisos'] },
    { name: 'Jardinagem',   price: 130, tasks: ['Regar e adubar as plantas', 'Podas leves de manutenção', 'Limpeza de canteiros', 'Replantios e mudas'] }
  ];

  function ensureSeed(){
    if (!localStorage.getItem(KEYS.services)) {
      write(KEYS.services, SEED.map(s => ({ id: uid(), name: s.name, price: s.price, tasks: s.tasks })));
    }
  }

  const getServices  = () => read(KEYS.services, []);
  const saveServices = list => write(KEYS.services, list);

  function addService(name, price){
    const list = getServices();
    const svc = { id: uid(), name, price, tasks: [] };
    list.push(svc);
    saveServices(list);
    return svc;
  }

  function updateService(id, patch){
    const list = getServices();
    const i = list.findIndex(s => s.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...patch };
    saveServices(list);
    return list[i];
  }

  const removeService = id => saveServices(getServices().filter(s => s.id !== id));

  const getOrders  = () => read(KEYS.orders, []);
  const saveOrders = list => write(KEYS.orders, list);

  function nextOrderNumber(){
    const seq = read(KEYS.seq, 0) + 1;
    write(KEYS.seq, seq);
    return seq;
  }
  const peekNextOrderNumber = () => read(KEYS.seq, 0) + 1;

  const getDraft = () => read(KEYS.draft, null);
  const saveDraft  = d => write(KEYS.draft, d);
  const clearDraft = () => localStorage.removeItem(KEYS.draft);

  return {
    ensureSeed,
    getServices, saveServices, addService, updateService, removeService,
    getOrders, saveOrders, nextOrderNumber, peekNextOrderNumber,
    getDraft, saveDraft, clearDraft
  };
})();

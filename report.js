/* NEGRET'S PRO MASTER — js/report.js — emissão do PDF */
'use strict';

const Report = (() => {

  function logEmission(order, file){
    order.pdf = { emittedAt: new Date().toISOString(), file };
    try {
      const orders = DB.getOrders();
      const i = orders.findIndex(o => o.id === order.id);
      if (i > -1) { orders[i] = order; DB.saveOrders(orders); }
    } catch (e) { /* log secundário */ }
  }

  async function emit(order){
    try {
      await PDF.ensureLib();
      const file = PDF.generate(order);
      logEmission(order, file);
      return { ok: true, file };
    } catch (err) {
      console.error('[Report] falha ao emitir PDF:', err);
      return { ok: false, error: (err && err.message) || 'falha desconhecida' };
    }
  }

  const reemit = orderId => {
    const order = DB.getOrders().find(o => o.id === orderId);
    return order ? emit(order) : Promise.resolve({ ok: false, error: 'ordem não encontrada' });
  };

  return { emit, reemit };
})();

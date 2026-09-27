/* NEGRET'S PRO MASTER — js/pdf.js — PDF leve (sem fotos) */
'use strict';

const PDF = (() => {

  const LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  const NAVY = [12, 45, 77];
  const BG   = [238, 244, 250];
  const INK  = [19, 41, 61];
  const MUT  = [92, 115, 135];

  const money = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pad4  = n => String(n).padStart(4, '0');
  const brDate = iso => {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('-');
    return `${d}/${m}/${y}`;
  };

  function ensureLib(){
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB_URL;
      s.onload = () => (window.jspdf ? resolve() : reject(new Error('jsPDF indisponível')));
      s.onerror = () => reject(new Error('gerador de PDF indisponível (sem conexão e sem cache)'));
      document.head.appendChild(s);
    });
  }

  function drawHeader(doc, order, page){
    const W = 210;
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 34, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 9, 16, 16, 4, 4, 'F');
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('N', 22, 20.4, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text("NEGRET'S PRO MASTER", 36, 17.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(150, 184, 214);
    doc.text('ORDEM DE SERVIÇO · Nº ' + pad4(order.number), 36.2, 24.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(brDate(order.date), W - 14, 15.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(150, 184, 214);
    doc.text(page > 1 ? 'PÁGINA ' + page : 'REGISTRO OFICIAL', W - 14, 21.5, { align: 'right' });

    return 44;
  }

  function drawFooter(doc, order){
    const W = 210, H = 297;
    doc.setDrawColor(200, 214, 228);
    doc.setLineWidth(0.3);
    doc.line(14, H - 14, W - 14, H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...MUT);
    doc.text('Registros fotográficos Antes/Depois disponíveis no app · Ordem #' + pad4(order.number), 14, H - 9.5);
    doc.text("NEGRET'S PRO MASTER", W - 14, H - 9.5, { align: 'right' });
  }

  function generate(order){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const W = 210, M = 14;
    const LIMIT = 244;

    let page = 1;
    let y = drawHeader(doc, order, page);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...MUT);
    doc.text('CLIENTE', M, y);
    doc.text('DATA', 150, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK);
    doc.text(order.client || '—', M, y + 6.5, { maxWidth: 120 });
    doc.text(brDate(order.date), 150, y + 6.5);
    y += 17;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text('SERVIÇOS REALIZADOS', M, y);
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.5);
    doc.line(M, y + 2.5, W - M, y + 2.5);
    y += 10;

    const included = (order.modules || []).filter(m => m.included !== false);
    included.forEach((m, i) => {
      if (y > LIMIT) { doc.addPage(); page++; y = drawHeader(doc, order, page); }

      if (i % 2 === 0) {
        doc.setFillColor(...BG);
        doc.rect(M - 2, y - 4.5, W - 2 * M + 4, 12.5, 'F');
      }

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
      doc.text(m.name, M + 1, y);
      doc.text(money(m.price), W - M - 1, y, { align: 'right' });

      const done  = (m.tasks || []).filter(t => t.done).length;
      const total = (m.tasks || []).length;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUT);
      doc.text(total > 0 ? done + ' de ' + total + ' tarefas concluídas' : 'Serviço executado', M + 1, y + 5);

      doc.setDrawColor(216, 227, 239); doc.setLineWidth(0.2);
      doc.line(M, y + 8.6, W - M, y + 8.6);
      y += 13.5;
    });

    if (y > LIMIT - 20) { doc.addPage(); page++; y = drawHeader(doc, order, page); }
    doc.setFillColor(...NAVY);
    doc.roundedRect(M, y, W - 2 * M, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text('VALOR TOTAL', M + 6, y + 10);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(money(order.total), W - M - 6, y + 10.6, { align: 'right' });
    y += 30;

    const need = order.signature ? 46 : 34;
    if (y + need > 262) { doc.addPage(); page++; y = drawHeader(doc, order, page); }

    const cx = W / 2;
    if (order.signature) {
      const ratio = order.sigRatio || 3;
      const w = 60, h = Math.min(w / ratio, 24);
      try { doc.addImage(order.signature, 'PNG', cx - w / 2, y + 6, w, h); } catch (e) { /* segue com a linha */ }
    }
    const sy = y + (order.signature ? 32 : 22);
    doc.setDrawColor(120, 140, 160); doc.setLineWidth(0.3);
    doc.line(cx - 35, sy, cx + 35, sy);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUT);
    doc.text('Assinatura do cliente', cx, sy + 5, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK);
    doc.text(order.client || '', cx, sy + 11, { align: 'center' });

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) { doc.setPage(p); drawFooter(doc, order); }

    const filename = 'NEGRETS-PRO-MASTER-OS-' + pad4(order.number) + '.pdf';
    doc.save(filename);
    return filename;
  }

  return { ensureLib, generate };
})();

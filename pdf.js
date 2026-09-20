/*
 * Self-contained PDF exporter. No CDN, network requests, or print dialog.
 * Renders report pages at 2.4x resolution, then embeds them as JPEG images in
 * a standards-compliant PDF. System fonts preserve currency and Unicode text.
 * Reports are intentionally image-based; their text is not searchable.
 */
(() => {
  'use strict';
  const W = 595.28, H = 841.89, SCALE = 2.4, MARGIN = 40, BOTTOM = 779;
  const MAX_TRANSACTIONS_PER_PAGE = 20;
  const ink = '#1d1d1f', secondary = '#6e6e73';
  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: amount % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(amount / 100);
  const date = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const encoder = new TextEncoder();
  function pdfBlob(pages) {
    const chunks = [], offsets = [0]; let length = 0;
    const append = value => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
    const object = (id, content) => { offsets[id] = length; append(`${id} 0 obj\n`); append(content); append('\nendobj\n'); };
    const stream = (id, dictionary, bytes) => { offsets[id] = length; append(`${id} 0 obj\n<< ${dictionary} /Length ${bytes.length} >>\nstream\n`); append(bytes); append('\nendstream\nendobj\n'); };
    append('%PDF-1.4\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`);
    pages.forEach((page, i) => {
      const id = 3 + i * 3;
      object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
      stream(id + 1, `/Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, page.bytes);
      stream(id + 2, '', encoder.encode(`q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ`));
    });
    const xref = length, count = 3 + pages.length * 3;
    append(`xref\n0 ${count}\n0000000000 65535 f \n`);
    for (let i = 1; i < count; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    append(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  async function buildReport({ budget, expenses, range, sections }) {
    const pages = []; let canvas, ctx, y, rowsOnPage = 0;
    const spent = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
    const selectedSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const period = range.from ? `${date(range.from)} - ${date(range.to)}` : 'All dates';
    function text(value, x, top, size = 11, color = ink, weight = 400, align = 'left') {
      ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(String(value), x, top);
    }
    function wrap(value, maxWidth, size = 10, weight = 400) {
      ctx.font = `${weight} ${size}px ${font}`;
      const lines = [];
      for (const paragraph of String(value).split('\n')) {
        let current = '';
        for (const word of paragraph.split(/\s+/)) {
          const candidate = current ? `${current} ${word}` : word;
          if (ctx.measureText(candidate).width <= maxWidth) current = candidate;
          else {
            if (current) lines.push(current); current = '';
            for (const character of word) {
              if (ctx.measureText(current + character).width > maxWidth && current) { lines.push(current); current = character; }
              else current += character;
            }
          }
        }
        lines.push(current);
      }
      return lines;
    }
    function fitted(value, x, top, maxWidth, size = 11, color = ink, weight = 400, align = 'left') {
      const label = String(value); ctx.font = `${weight} ${size}px ${font}`;
      while (ctx.measureText(label).width > maxWidth && size > 7) { size -= .5; ctx.font = `${weight} ${size}px ${font}`; }
      text(label, x, top, size, color, weight, align);
    }
    function line(top, color = '#e6e8ee') { ctx.strokeStyle = color; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(MARGIN, top); ctx.lineTo(W - MARGIN, top); ctx.stroke(); }
    function newPage(continued = false) {
      canvas = document.createElement('canvas'); canvas.width = Math.round(W * SCALE); canvas.height = Math.round(H * SCALE);
      ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser could not create the report canvas.');
      ctx.scale(SCALE, SCALE); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); rowsOnPage = 0;
      y = 35;
      const nameSize = continued ? 15 : 22;
      wrap(budget.name, W - MARGIN * 2, nameSize, 650).forEach(value => { text(value, MARGIN, y, nameSize, ink, 650); y += nameSize + 6; });
      text(`${period} · ${expenses.length} transaction${expenses.length === 1 ? '' : 's'}`, MARGIN, y + 2, 9, secondary); y += 28;
    }
    async function finishPage() {
      text(String(pages.length + 1), W - MARGIN, 807, 9, secondary, 400, 'right');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94));
      if (!blob) throw new Error('The PDF page could not be generated. Try a smaller date range.');
      pages.push({ width: canvas.width, height: canvas.height, bytes: new Uint8Array(await blob.arrayBuffer()) });
      canvas.width = 0; canvas.height = 0;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    async function ensure(height) { if (y + height > BOTTOM) { await finishPage(); newPage(true); return true; } return false; }
    newPage();
    if (sections.summary) {
      const width = (W - MARGIN * 2) / 3;
      const labels = range.from ? ['Budget', 'Spent (all dates)', 'Remaining (all dates)'] : ['Budget', 'Spent', 'Remaining'];
      [budget.amount, spent, budget.amount - spent].forEach((amount, i) => {
        const x = MARGIN + i * width;
        text(labels[i], x, y, 9, secondary);
        fitted(money(amount), x, y + 18, width - 14, 19, i === 2 && amount < 0 ? '#c8323a' : ink, 650);
      });
      y += 54;
      if (range.from && !sections.history) { text(`Spent in selected period: ${money(selectedSpent)}`, MARGIN, y, 10, ink, 500); y += 23; }
      line(y); y += 23;
    }
    if (sections.history) {
      const DESCRIPTION_X = 124, DESCRIPTION_WIDTH = 219, CATEGORY_X = 358;
      function tableHeading() {
        text('Transactions', MARGIN, y, 13, ink, 650); y += 25;
        ctx.fillStyle = '#f3f4f6'; ctx.fillRect(MARGIN, y, W - MARGIN * 2, 23);
        text('Date', MARGIN + 6, y + 6, 9, secondary, 500);
        text('Description', DESCRIPTION_X, y + 6, 9, secondary, 500);
        text('Category', CATEGORY_X, y + 6, 9, secondary, 500);
        text('Amount', W - MARGIN - 6, y + 6, 9, secondary, 500, 'right');
        y += 26;
      }
      await ensure(85); tableHeading();
      if (!expenses.length) { text('No transactions in this period.', MARGIN + 6, y + 8, 10, secondary); y += 35; }
      for (const expense of expenses) {
        const description = wrap(expense.description, DESCRIPTION_WIDTH, 10);
        const height = Math.max(25, description.length * 13 + 12);
        // A hard count cap, independent of font size or the available page space.
        if (rowsOnPage >= MAX_TRANSACTIONS_PER_PAGE || y + height > BOTTOM) {
          await finishPage(); newPage(true); tableHeading();
        }
        text(date(expense.date), MARGIN + 6, y + 6, 8.5, secondary);
        description.forEach((value, index) => text(value, DESCRIPTION_X, y + 6 + index * 13, 10));
        text(expense.category, CATEGORY_X, y + 6, 9, secondary);
        fitted(money(expense.amount), W - MARGIN - 6, y + 6, 112, 10, ink, 500, 'right');
        y += height; line(y - 1, '#eff0f3'); rowsOnPage++;
      }
      await ensure(36); y += 12;
      text(range.from ? 'Period total' : 'Total', MARGIN + 6, y, 11, ink, 650);
      fitted(money(selectedSpent), W - MARGIN - 6, y, 220, 12, ink, 650, 'right'); y += 34;
    }
    if (sections.categories) {
      const categoryTotals = new Map(); expenses.forEach(e => categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount));
      const entries = [...categoryTotals].sort((a, b) => b[1] - a[1]);
      // Keep this small optional block together whenever it fits on a fresh page.
      await ensure(35 + Math.max(1, entries.length) * 23);
      text('By category', MARGIN, y, 13, ink, 650); y += 26;
      if (!entries.length) { text('No spending in this period.', MARGIN, y, 10, secondary); y += 23; }
      entries.forEach(([category, amount]) => {
        text(category, MARGIN, y, 10, secondary);
        fitted(money(amount), W - MARGIN, y, 220, 10, ink, 500, 'right'); y += 23;
      });
    }
    await finishPage();
    return pdfBlob(pages);
  }
  async function download(options) {
    const blob = await buildReport(options);
    const safeName = options.budget.name.normalize('NFKD').replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '-').slice(0, 65) || 'Budget';
    const suffix = options.range.from ? `${options.range.from}_to_${options.range.to}` : 'All-dates';
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `${safeName}-${suffix}.pdf`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  window.BudgetPDF = Object.freeze({ download, buildReport, MAX_TRANSACTIONS_PER_PAGE });
})();

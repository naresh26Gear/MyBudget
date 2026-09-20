/* Vanilla JavaScript. Amounts are stored as integer paise to avoid rounding drift. */
(() => {
  'use strict';
  const KEY = 'my-budget.data.v1';
  const CATEGORIES = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other'];
  const MAX_AMOUNT = 99999999900;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icons = {
    wallet: '<path d="M20 7H5a2 2 0 0 1 0-4l13-1v5M3 5v14a2 2 0 0 0 2 2h15V7M16 12h6v5h-6z"/><path d="M18.5 14.5h.01"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    history: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v5l3 2"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    pencil: '<path d="m14 5 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15z"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    bars: '<path d="M5 21V12M12 21V7M19 21V3" stroke-width="4"/>',
    sliders: '<path d="M4 6h5m4 0h7M4 12h10m4 0h2M4 18h2m4 0h10M9 3v6M14 9v6M6 15v6"/>',
    more: '<circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>',
    Food: '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M18 21V3c-4 2-4 9 0 9"/>',
    Travel: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 10h14M8 18v3M16 18v3M8 14h.01M16 14h.01"/>',
    Bills: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
    Shopping: '<path d="M5 7h14l1 14H4zM9 7V5a3 3 0 0 1 6 0v2"/>',
    Health: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    Entertainment: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18M7 5l3 5M14 5l3 5M10 13l5 2-5 3z"/>',
    Other: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.Other}</svg>`;
  function fillIcons(root = document) { $$('[data-icon]', root).forEach(el => { el.innerHTML = svg(el.dataset.icon); }); }
  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: value % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(value / 100);
  const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const today = () => iso(new Date());
  const dateObj = value => new Date(`${value}T12:00:00`);
  const shiftDate = (value, days) => { const d = dateObj(value); d.setDate(d.getDate() + days); return iso(d); };
  const dateLabel = value => dateObj(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const shortDate = value => dateObj(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' && value <= '2200-12-31' && !Number.isNaN(dateObj(value).valueOf()) && iso(dateObj(value)) === value;
  const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  function amountFromInput(input) {
    const value = input.trim();
    if (!/^\d[\d,]*(\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive amount with up to two decimal places.');
    const clean = value.replaceAll(',', '');
    const [whole, fraction = ''] = clean.split('.');
    const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) throw new Error('Enter an amount between ₹0.01 and ₹99,99,99,999.');
    return amount;
  }
  function assertState(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.budgets) || value.budgets.length > 100) throw new Error('This is not a valid My Budget backup.');
    const ids = new Set();
    for (const b of value.budgets) {
      if (!b || typeof b.id !== 'string' || !b.id || b.id.length > 100 || ids.has(b.id) || typeof b.name !== 'string' || !b.name.trim() || b.name.length > 60 || !Number.isSafeInteger(b.amount) || b.amount <= 0 || b.amount > MAX_AMOUNT || !Array.isArray(b.expenses) || b.expenses.length > 20000) throw new Error('The budget data is invalid.');
      ids.add(b.id);
      const expenseIds = new Set();
      for (const e of b.expenses) {
        if (!e || typeof e.id !== 'string' || !e.id || e.id.length > 100 || expenseIds.has(e.id) || typeof e.description !== 'string' || !e.description.trim() || e.description.length > 100 || !CATEGORIES.includes(e.category) || !validDate(e.date) || typeof e.note !== 'string' || e.note.length > 300 || !Number.isSafeInteger(e.amount) || e.amount <= 0 || e.amount > MAX_AMOUNT) throw new Error('The expense data is invalid.');
        expenseIds.add(e.id);
      }
      if (!Number.isSafeInteger(b.expenses.reduce((n, e) => n + e.amount, 0))) throw new Error('The expense total is too large.');
    }
    if (value.budgets.length && !ids.has(value.activeId)) throw new Error('The selected budget is missing.');
    return value;
  }
  let state = { version: 1, activeId: null, budgets: [] };
  let lastRaw = null;
  let storageOkay = true;
  let editingExpenseId = null;
  let editingBudgetId = null;
  let editingBudgetBase = null;
  let editingExpenseBase = null;
  let activeTab = 'dashboard';
  let visibleLimit = 80;
  const active = () => state.budgets.find(b => b.id === state.activeId) || null;
  const totalSpent = b => b ? b.expenses.reduce((n, e) => n + e.amount, 0) : 0;
  function storageWarning(message) { const el = $('#storage-warning'); el.hidden = !message; el.textContent = message; }
  try {
    lastRaw = localStorage.getItem(KEY);
    if (lastRaw) state = assertState(JSON.parse(lastRaw));
    const probe = `${KEY}.probe`; localStorage.setItem(probe, '1'); localStorage.removeItem(probe);
  } catch (error) {
    storageOkay = false;
    storageWarning(lastRaw ? 'Saved data could not be read. It has not been overwritten. Restore a valid backup in budget settings to recover.' : 'Browser storage is unavailable. Enable site storage or use a regular browser window before recording expenses.');
  }
  function persist(next, force = false) {
    assertState(next);
    if (!storageOkay && !force) throw new Error('Browser storage is unavailable. Check the message above your dashboard.');
    try {
      const current = localStorage.getItem(KEY);
      if (!force && current !== lastRaw) {
        state = current ? assertState(JSON.parse(current)) : { version: 1, activeId: null, budgets: [] };
        lastRaw = current; render();
        throw new Error('This budget changed in another tab. Reopen this form and try again.');
      }
      next.updatedAt = new Date().toISOString();
      const raw = JSON.stringify(next);
      localStorage.setItem(KEY, raw);
      lastRaw = raw; state = next; storageOkay = true; storageWarning('');
    } catch (error) {
      if (error.name === 'QuotaExceededError') throw new Error('Browser storage is full. Save a backup before freeing space, then try again.');
      if (error.name === 'SecurityError') throw new Error('Your browser blocked storage. Enable site storage to save.');
      throw error;
    }
  }
  function showError(selector, message = '') { const el = $(selector); el.textContent = message; el.hidden = !message; }
  let toastTimer;
  function toast(message) { clearTimeout(toastTimer); $('#toast-text').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500); }
  function openDialog(id) { const dialog = $(id); dialog.classList.remove('closing'); dialog.showModal(); document.body.style.overflow = 'hidden'; }
  function closeDialog(dialog) {
    if (!dialog.open || dialog.classList.contains('closing')) return;
    dialog.classList.add('closing');
    setTimeout(() => { dialog.close(); dialog.classList.remove('closing'); if (!$('dialog[open]')) document.body.style.overflow = ''; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 155);
  }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('cancel', e => { if (dialog.id === 'confirm-dialog') return; e.preventDefault(); closeDialog(dialog); });
    dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(dialog); } });
    dialog.addEventListener('close', () => { if (!$('dialog[open]')) document.body.style.overflow = ''; });
  });
  $$('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
  function confirmAction(title, message, action, danger = true) {
    return new Promise(resolve => {
      const dialog = $('#confirm-dialog');
      $('#confirm-title').textContent = title; $('#confirm-message').textContent = message;
      $('#confirm-ok').textContent = action; $('#confirm-ok').style.background = danger ? 'var(--red)' : 'var(--blue)';
      let accepted = false;
      $('#confirm-ok').onclick = () => { accepted = true; closeDialog(dialog); };
      $('#confirm-cancel').onclick = () => closeDialog(dialog);
      dialog.addEventListener('close', () => resolve(accepted), { once: true }); openDialog('#confirm-dialog');
      $('#confirm-cancel').focus();
    });
  }
  function setTab(tab, updateHash = true) {
    activeTab = tab === 'history' ? 'history' : 'dashboard';
    ['dashboard', 'history'].forEach(name => {
      const selected = activeTab === name; const button = $(`#${name}-tab`); const panel = $(`#${name}-panel`);
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected; panel.classList.toggle('entering', selected);
    });
    $('#export-open').hidden = activeTab !== 'history';
    $('.privacy-label').hidden = activeTab === 'history';
    if (updateHash && location.hash !== `#${activeTab}`) history.replaceState(null, '', `#${activeTab}`);
    if (activeTab === 'history') renderHistory();
  }
  $$('[data-tab]').forEach(button => {
    button.addEventListener('click', () => { setTab(button.dataset.tab); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); });
    button.addEventListener('keydown', e => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const tab = e.key === 'Home' ? 'dashboard' : e.key === 'End' ? 'history' : activeTab === 'history' ? 'dashboard' : 'history'; setTab(tab); $(`#${tab}-tab`).focus(); } });
  });
  window.addEventListener('hashchange', () => setTab(location.hash.slice(1), false));
  function render() {
    const b = active(), spent = totalSpent(b), remaining = (b?.amount || 0) - spent;
    const percent = b ? spent / b.amount * 100 : 0;
    $('#budget-name').textContent = b?.name || 'Set your starting budget';
    $('#spent-value').textContent = money(spent);
    $('#spent-value').style.fontSize = money(spent).length > 12 ? 'clamp(26px, 5vw, 36px)' : '';
    $('#budget-value-inline').textContent = money(b?.amount || 0); $('#budget-value').textContent = money(b?.amount || 0);
    $('#remaining-value').textContent = money(remaining); $('#remaining-value').classList.toggle('negative', remaining < 0);
    ['#budget-value', '#remaining-value'].forEach(id => { $(id).style.setProperty('--digits', Math.max(8, $(id).textContent.length)); });
    $('#remaining-inline').textContent = b ? remaining < 0 ? `${money(-remaining)} over budget` : `${money(remaining)} remaining` : 'Ready when you are';
    $('#remaining-inline').classList.toggle('negative', remaining < 0);
    $('#used-label').textContent = b ? `${percent < 100 && percent > 99.5 ? '99.9' : percent > 0 && percent < .5 ? '<1' : Math.round(percent)}% used` : 'Set your budget to begin';
    const progress = $('#budget-progress'); progress.setAttribute('aria-valuenow', String(Math.min(100, percent))); progress.setAttribute('aria-valuetext', `${money(spent)} spent out of ${money(b?.amount || 0)}`); progress.classList.toggle('over', remaining < 0); $('span', progress).style.width = `${Math.min(100, percent)}%`;
    $('#add-expense span:last-child').textContent = b ? 'Add expense' : 'Set your budget';
    $('#history-budget-name').textContent = b?.name || 'YOUR BUDGET';
    $('#export-open').disabled = !b;
    renderChart(); renderHistory();
  }
  function renderChart() {
    const b = active(); const end = today(); const range = $('#chart-range').value;
    const expenses = b?.expenses || [];
    const earliest = expenses.reduce((min, e) => e.date < min ? e.date : min, end);
    const start = range === 'all' ? earliest : shiftDate(end, -(Number(range) - 1));
    const rows = expenses.filter(e => e.date >= start && e.date <= end);
    const sum = rows.reduce((n, e) => n + e.amount, 0);
    $('#chart-total').textContent = money(sum); $('#chart-period').textContent = range === 'all' ? 'over all time' : `in the last ${range} days`;
    $('#chart-tooltip').hidden = true;
    const wrap = $('#chart-wrap'); wrap.replaceChildren();
    if (!rows.length) {
      $('#chart-subtitle').textContent = 'Daily spending';
      wrap.innerHTML = '<div class="chart-empty"><div class="chart-empty-art" aria-hidden="true"><span></span><span></span><span></span><span></span></div><h3>No spending yet</h3><p></p></div>';
      $('p', wrap).textContent = b ? 'Add an expense to see your spending take shape.' : 'Create a budget. Then make every expense count.';
      $('#chart-insight').textContent = b ? 'No expenses in this period.' : 'Your first step to a clearer picture.'; return;
    }
    const dayCount = Math.round((dateObj(end) - dateObj(start)) / 86400000) + 1;
    const bucketDays = dayCount <= 7 ? 1 : Math.ceil(dayCount / 7);
    $('#chart-subtitle').textContent = bucketDays === 1 ? 'Daily spending' : `Spending by ${bucketDays}-day period`;
    const buckets = [];
    for (let i = 0; i < dayCount; i += bucketDays) { const date = shiftDate(start, i); const to = shiftDate(start, Math.min(dayCount - 1, i + bucketDays - 1)); buckets.push({ date, to, amount: rows.filter(e => e.date >= date && e.date <= to).reduce((n, e) => n + e.amount, 0) }); }
    const width = Math.max(260, wrap.clientWidth || 430), height = matchMedia('(max-width:760px)').matches ? 192 : 215, left = 42, top = 20, chartHeight = height - 69, chartWidth = width - left - 9;
    const max = Math.max(...buckets.map(x => x.amount)) / 100;
    const magnitude = 10 ** Math.floor(Math.log10(max || 1));
    const upper = Math.ceil(max / magnitude / 2.5) * magnitude * 2.5 || 1;
    const step = chartWidth / buckets.length; const barWidth = Math.min(42, step * .64);
    const compact = value => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    let content = `<title>Spending from ${shortDate(start)} to ${shortDate(end)}. Total ${money(sum)}.</title>`;
    for (let i = 0; i <= 4; i++) { const y = top + chartHeight - chartHeight * i / 4; content += `<line class="chart-grid" x1="${left}" y1="${y}" x2="${width - 5}" y2="${y}"/><text class="chart-label" x="${left - 10}" y="${y + 4}" text-anchor="end">${compact(upper * i / 4)}</text>`; }
    buckets.forEach((item, i) => {
      const barHeight = item.amount / 100 / upper * chartHeight; const x = left + i * step + step / 2;
      const description = `${shortDate(item.date)}${item.to !== item.date ? ` – ${shortDate(item.to)}` : ''}: ${money(item.amount)}`;
      content += `<g class="chart-bar-hit" tabindex="0" role="img" aria-label="${description}" data-index="${i}"><rect class="hit" x="${x-step/2+2}" y="${top}" width="${step-4}" height="${chartHeight + 24}" fill="transparent" rx="4"/><rect class="chart-bar" x="${x-barWidth/2}" y="${top+chartHeight-Math.max(2,barHeight)}" width="${barWidth}" height="${Math.max(2,barHeight)}" rx="5" fill="${item.amount === Math.max(...buckets.map(v=>v.amount)) ? '#007aff' : '#86baff'}" style="animation-delay:${i*35}ms"/><text class="chart-label" x="${x}" y="${top+chartHeight+24}" text-anchor="middle">${dateObj(item.date).getDate()}</text></g>`;
    });
    content += `<text class="chart-label" x="${left}" y="${height-4}">${shortDate(start)} – ${shortDate(end)}</text><text class="chart-label" x="${width-5}" y="${height-4}" text-anchor="end">INR</text>`;
    wrap.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="Expense analytics. Focus a bar for its amount.">${content}</svg>`;
    const highest = buckets.reduce((a, v) => v.amount > a.amount ? v : a);
    $('#chart-insight').textContent = `Highest ${bucketDays === 1 ? 'day' : 'period'}: ${shortDate(highest.date)} · ${money(highest.amount)}`;
    $$('.chart-bar-hit', wrap).forEach(node => {
      const show = () => { $('#chart-tooltip').textContent = node.getAttribute('aria-label'); $('#chart-tooltip').hidden = false; };
      node.addEventListener('mouseenter', show); node.addEventListener('focus', show); node.addEventListener('click', show);
      node.addEventListener('mouseleave', () => { $('#chart-tooltip').hidden = true; }); node.addEventListener('blur', () => { $('#chart-tooltip').hidden = true; });
    });
  }
  function getDateRange(mode, from, to) {
    if (mode === 'custom') { if (!validDate(from) || !validDate(to)) throw new Error('Choose both a start date and an end date.'); if (from > to) throw new Error('The end date must be on or after the start date.'); return { from, to }; }
    if (mode === 'month') return { from: `${today().slice(0, 7)}-01`, to: today() };
    if (mode === '7') return { from: shiftDate(today(), -6), to: today() };
    return { from: null, to: null };
  }
  const filterRange = (expenses, range) => expenses.filter(e => (!range.from || e.date >= range.from) && (!range.to || e.date <= range.to));
  const sorted = rows => [...rows].sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || b.id).localeCompare(String(a.createdAt || a.id)));
  function renderHistory() {
    const b = active(); const query = $('#history-search').value.trim().toLocaleLowerCase();
    let rows = [];
    try { const range = getDateRange($('#history-range').value, $('#history-from').value, $('#history-to').value); rows = sorted(filterRange(b?.expenses || [], range)).filter(e => `${e.description} ${e.category} ${e.note}`.toLocaleLowerCase().includes(query)); showError('#history-error'); }
    catch (error) { showError('#history-error', error.message); }
    $('#history-count').textContent = `${rows.length} expense${rows.length === 1 ? '' : 's'}`;
    $('#history-total').textContent = money(rows.reduce((n, e) => n + e.amount, 0));
    const list = $('#history-list'); list.replaceChildren();
    if (!rows.length) {
      list.innerHTML = '<div class="history-empty"><div class="empty-icon"></div><h2></h2><p></p><button class="quiet-button"></button></div>';
      $('.empty-icon', list).innerHTML = svg('history');
      $('h2', list).textContent = b?.expenses.length ? 'No matching expenses' : 'A fresh start';
      $('p', list).textContent = b?.expenses.length ? 'Try another search or date range.' : 'Every expense you add will appear here, ready whenever you need it.';
      const button = $('button', list); button.textContent = b?.expenses.length ? 'Clear filters' : b ? 'Add your first expense' : 'Set your budget';
      button.onclick = () => { if (b?.expenses.length) { $('#history-search').value = ''; $('#history-range').value = 'all'; $('#history-dates').hidden = true; renderHistory(); } else openExpense(); }; return;
    }
    const fragment = document.createDocumentFragment();
    rows.slice(0, visibleLimit).forEach((e, index) => {
      const row = document.createElement('article'); row.className = 'transaction'; row.style.animationDelay = `${Math.min(index, 6) * 22}ms`;
      row.innerHTML = '<div class="category-icon" aria-hidden="true"></div><div class="transaction-info"><p class="transaction-title"></p><p class="transaction-meta"></p></div><span class="transaction-amount"></span><button class="transaction-actions"></button>';
      $('.category-icon', row).innerHTML = svg(e.category); $('.transaction-title', row).textContent = e.description;
      $('.transaction-meta', row).textContent = `${e.category} · ${dateLabel(e.date)}`; $('.transaction-amount', row).textContent = `−${money(e.amount)}`;
      const action = $('button', row); action.innerHTML = svg('more'); action.setAttribute('aria-label', `Edit or delete ${e.description}`); action.onclick = () => openExpense(e.id);
      fragment.append(row);
    });
    list.append(fragment);
    if (rows.length > visibleLimit) { const more = document.createElement('button'); more.className = 'quiet-button load-more'; more.textContent = `Show more (${rows.length - visibleLimit} remaining)`; more.onclick = () => { visibleLimit += 80; renderHistory(); }; list.append(more); }
  }
  function openBudget(newBudget = false) {
    const b = newBudget ? null : active(); editingBudgetId = b?.id || null; editingBudgetBase = b ? JSON.stringify(b) : null;
    $('#budget-dialog-title').textContent = b ? 'Your budget' : 'Create a budget';
    $('#budget-title-input').value = b?.name || `${new Date().toLocaleDateString('en-GB', { month: 'long' })} budget`;
    $('#budget-amount-input').value = b ? String(b.amount / 100) : '';
    $('#budget-save').textContent = b ? 'Save budget' : 'Create budget';
    $('#budget-picker-field').hidden = !state.budgets.length || newBudget;
    $('#new-budget').hidden = !b;
    $('#budget-picker').replaceChildren(...state.budgets.map(budget => { const option = document.createElement('option'); option.value = budget.id; option.textContent = budget.name; option.selected = budget.id === state.activeId; return option; }));
    showError('#budget-error'); if (!$('#budget-dialog').open) openDialog('#budget-dialog');
  }
  $$('[data-action="budget"]').forEach(button => button.addEventListener('click', () => openBudget()));
  $('#new-budget').addEventListener('click', () => openBudget(true));
  $('#budget-picker').addEventListener('change', () => { try { const next = clone(state); next.activeId = $('#budget-picker').value; persist(next); render(); openBudget(); toast('Budget switched'); } catch (error) { showError('#budget-error', error.message); } });
  $('#budget-form').addEventListener('submit', event => {
    event.preventDefault(); showError('#budget-error');
    try {
      const name = $('#budget-title-input').value.trim(); if (!name) throw new Error('Give your budget a name.');
      const amount = amountFromInput($('#budget-amount-input').value); const next = clone(state);
      if (editingBudgetId) { const b = next.budgets.find(item => item.id === editingBudgetId); if (!b || JSON.stringify(b) !== editingBudgetBase) throw new Error('This budget changed. Close and reopen the form to use the latest information.'); b.name = name; b.amount = amount; }
      else { if (next.budgets.length >= 100) throw new Error('You can save up to 100 budgets in this browser.'); const id = uid(); next.budgets.push({ id, name, amount, expenses: [], createdAt: new Date().toISOString() }); next.activeId = id; }
      persist(next); render(); closeDialog($('#budget-dialog')); toast(editingBudgetId ? 'Budget updated' : 'Your budget is ready');
    } catch (error) { showError('#budget-error', error.message); }
  });
  function openExpense(id = null) {
    const b = active(); if (!b) { openBudget(); return; }
    const expense = b.expenses.find(e => e.id === id); editingExpenseId = expense?.id || null; editingExpenseBase = JSON.stringify(b);
    $('#expense-dialog-title').textContent = expense ? 'Edit expense' : 'Add expense'; $('#expense-budget-label').textContent = b.name;
    $('#expense-save').textContent = expense ? 'Save changes' : 'Save expense'; $('#expense-delete').hidden = !expense;
    $('#expense-amount').value = expense ? String(expense.amount / 100) : ''; $('#expense-description').value = expense?.description || '';
    $('#expense-category').value = expense?.category || 'Food'; $('#expense-date').value = expense?.date || today(); $('#expense-date').max = today(); $('#expense-date').min = '1900-01-01'; $('#expense-note').value = expense?.note || '';
    showError('#expense-error'); openDialog('#expense-dialog');
  }
  $('#add-expense').onclick = () => openExpense(); $$('[data-action="expense"]').forEach(button => { button.onclick = () => openExpense(); });
  $('#expense-form').addEventListener('submit', event => {
    event.preventDefault(); showError('#expense-error');
    try {
      const amount = amountFromInput($('#expense-amount').value); const description = $('#expense-description').value.trim(); const date = $('#expense-date').value;
      if (!description) throw new Error('Add a short description for this expense.');
      if (!validDate(date) || date > today()) throw new Error('Choose a valid date that is today or earlier.');
      const next = clone(state); const b = next.budgets.find(item => item.id === state.activeId);
      if (!b || JSON.stringify(b) !== editingExpenseBase) throw new Error('This budget changed. Close and reopen the form before saving.');
      const expense = { id: editingExpenseId || uid(), amount, description, category: $('#expense-category').value, date, note: $('#expense-note').value.trim(), createdAt: new Date().toISOString() };
      if (editingExpenseId) { const index = b.expenses.findIndex(e => e.id === editingExpenseId); expense.createdAt = b.expenses[index].createdAt; b.expenses[index] = expense; }
      else { if (b.expenses.length >= 20000) throw new Error('This budget has reached 20,000 expenses. Start a new budget.'); b.expenses.push(expense); }
      persist(next); render(); closeDialog($('#expense-dialog')); toast(editingExpenseId ? 'Expense updated' : 'Expense added');
    } catch (error) { showError('#expense-error', error.message); }
  });
  $('#expense-delete').addEventListener('click', async () => {
    const expenseId = editingExpenseId; const b = active(); const expense = b?.expenses.find(e => e.id === expenseId); if (!expense) return;
    if (!await confirmAction('Delete expense?', `${expense.description} (${money(expense.amount)}) will be removed and your balance updated.`, 'Delete')) return;
    try { if (JSON.stringify(active()) !== editingExpenseBase) throw new Error('This budget changed. Close and reopen the expense.'); const next = clone(state); const budget = next.budgets.find(item => item.id === b.id); budget.expenses = budget.expenses.filter(e => e.id !== expenseId); persist(next); render(); closeDialog($('#expense-dialog')); toast('Expense deleted'); }
    catch (error) { showError('#expense-error', error.message); }
  });
  $('#chart-range').onchange = renderChart;
  $('#history-search').addEventListener('input', () => { visibleLimit = 80; renderHistory(); });
  $('#history-range').onchange = () => { $('#history-dates').hidden = $('#history-range').value !== 'custom'; if (!$('#history-from').value) $('#history-from').value = `${today().slice(0,7)}-01`; if (!$('#history-to').value) $('#history-to').value = today(); visibleLimit = 80; renderHistory(); };
  ['#history-from', '#history-to'].forEach(id => { $(id).onchange = () => { visibleLimit = 80; renderHistory(); }; });
  $('#export-open').onclick = () => {
    if (!active()) return; $('#export-budget-name').textContent = active().name;
    $('#export-range').value = 'all'; $('#export-dates').hidden = true; $('#export-from').value = `${today().slice(0,7)}-01`; $('#export-to').value = today();
    showError('#export-error'); updateExportNote(); openDialog('#export-dialog');
  };
  function updateExportNote() {
    try { const range = getDateRange($('#export-range').value, $('#export-from').value, $('#export-to').value); const count = filterRange(active()?.expenses || [], range).length; $('#export-note').textContent = `${count} expense${count === 1 ? '' : 's'} in this period. Exports this budget only.`; }
    catch { $('#export-note').textContent = 'Choose a valid date range. Exports this budget only.'; }
  }
  $('#export-range').onchange = () => { $('#export-dates').hidden = $('#export-range').value !== 'custom'; showError('#export-error'); updateExportNote(); };
  ['#export-from', '#export-to'].forEach(id => { $(id).onchange = updateExportNote; });
  $('#export-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = $('#pdf-download'); showError('#export-error');
    try {
      const b = active(); if (!b) throw new Error('Choose a budget first.');
      const range = getDateRange($('#export-range').value, $('#export-from').value, $('#export-to').value);
      const sections = { summary: $('#export-summary').checked, history: $('#export-history').checked, categories: $('#export-categories').checked };
      if (!Object.values(sections).some(Boolean)) throw new Error('Select at least one section to include.');
      button.disabled = true; $('span:last-child', button).textContent = 'Preparing PDF…';
      await new Promise(resolve => setTimeout(resolve, 60));
      await window.BudgetPDF.download({ budget: clone(b), expenses: sorted(filterRange(b.expenses, range)), range, sections });
      closeDialog($('#export-dialog')); toast('Your PDF is ready');
    } catch (error) { showError('#export-error', error.message || 'Could not create the PDF. Please try again.'); }
    finally { button.disabled = false; $('span:last-child', button).textContent = 'Download PDF'; }
  });
  function downloadFile(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
  $('#backup-download').onclick = () => {
    if (!state.budgets.length) { showError('#budget-error', 'Create a budget before saving a backup.'); return; }
    downloadFile(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), `My-Budget-Backup-${today()}.json`); toast('Backup downloaded');
  };
  $('#backup-restore').onclick = () => $('#backup-file').click();
  $('#backup-file').addEventListener('change', async () => {
    const file = $('#backup-file').files[0]; $('#backup-file').value = ''; if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a backup smaller than 10 MB.');
      let imported; try { imported = assertState(JSON.parse(await file.text())); } catch { throw new Error('This file is not a valid My Budget backup.'); }
      if (!await confirmAction('Restore this backup?', `This replaces the ${state.budgets.length} budget(s) saved in this browser with ${imported.budgets.length} from the backup. Save your current backup first if needed.`, 'Restore', false)) return;
      persist(clone(imported), true); render(); openBudget(); toast('Backup restored');
    } catch (error) { showError('#budget-error', error.message); }
  });
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    try { const raw = localStorage.getItem(KEY); state = raw ? assertState(JSON.parse(raw)) : { version: 1, activeId: null, budgets: [] }; lastRaw = raw; storageOkay = true; render(); toast('Updated from another tab'); }
    catch { storageWarning('Data changed in another tab but could not be read. Reload or restore a valid backup before continuing.'); storageOkay = false; }
  });
  fillIcons(); render(); setTab(location.hash.slice(1), false);
  let previousChartWidth = $('#chart-wrap').clientWidth;
  if ('ResizeObserver' in window) new ResizeObserver(entries => {
    const width = Math.round(entries[0].contentRect.width);
    if (width > 0 && width !== previousChartWidth) { previousChartWidth = width; renderChart(); }
  }).observe($('#chart-wrap'));
})();

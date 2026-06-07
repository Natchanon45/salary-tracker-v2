const APP_VERSION = '2.4';
const APP_Authorized = 'นายณัฐชนน ศรีเปล่ง';
const KEY = 'salary_tracker_v24';
const $ = id => document.getElementById(id);

const defaultData = { settings: { salary: 0, ssRate: 5, taxMode: 'percent', taxValue: 0 }, debts: [], payments: [] };

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || structuredClone(defaultData) } catch (e) { return structuredClone(defaultData) } }
function save(data) { localStorage.setItem(KEY, JSON.stringify(data)) }
function toNumber(value) { const cleaned = String(value ?? '').replace(/[^0-9.\-]/g, ''); const num = Number(cleaned); return Number.isFinite(num) ? num : 0 }
function fmt(num) { return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function formatMonth(month) { if (!month) return '-'; const [y, m] = month.split('-').map(Number); const names = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']; return `${names[(m || 1) - 1]} ${y}` }
function getDeductions(settings) { const salary = toNumber(settings.salary); const ss = Math.min(salary * (toNumber(settings.ssRate) / 100), 875); const tax = settings.taxMode === 'percent' ? salary * (toNumber(settings.taxValue) / 100) : toNumber(settings.taxValue); const net = Math.max(0, salary - ss - tax); return { salary, ss, tax, net } }

let toastTimer = null;
function showToast(message, type = 'success') { const toast = $('lineToast'); $('toastText').textContent = message; toast.classList.toggle('error', type === 'error'); toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200) }

function recalc() {
    const d = load();
    const debts = d.debts.map(x => ({ ...x, amount: toNumber(x.amount), remaining: toNumber(x.amount) })).sort((a, b) => a.month.localeCompare(b.month));
    const payments = [...d.payments].map(x => ({ ...x, amount: toNumber(x.amount) })).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (const p of payments) { let amount = p.amount; for (const debt of debts) { if (amount <= 0) break; const cut = Math.min(amount, debt.remaining); debt.remaining -= cut; amount -= cut } }
    return { data: d, debts, payments }
}

function render() {
    const d = load(); const calc = getDeductions(d.settings);
    $('salaryDisplay').textContent = fmt(calc.salary); $('ssDisplay').textContent = fmt(calc.ss); $('taxDisplay').textContent = fmt(calc.tax); $('netSalary').textContent = fmt(calc.net);
    $('salary').value = d.settings.salary ? fmt(d.settings.salary) : ''; $('ssRate').value = d.settings.ssRate ?? 5; $('taxMode').value = d.settings.taxMode || 'percent'; $('taxValue').value = d.settings.taxValue ? fmt(d.settings.taxValue) : '';
    const r = recalc(); let total = 0;
    $('debts').innerHTML = r.debts.length ? r.debts.map(debt => { total += debt.remaining; const paid = Math.max(0, debt.amount - debt.remaining); return `<div class="line-row"><div class="row-main"><div class="row-title">${formatMonth(debt.month)}</div><div class="row-sub">ยอดตั้งต้น ${fmt(debt.amount)} · ชำระแล้ว ${fmt(paid)}</div></div><div><div class="row-amount">${fmt(debt.remaining)}</div><button class="icon-danger mt-1" onclick="deleteDebt('${debt.month}')" title="ลบเดือน"><i class="bi bi-trash3"></i></button></div></div>` }).join('') : `<div class="line-empty">ยังไม่มีเดือนค้าง</div>`;
    $('totalOutstanding').textContent = fmt(total);
    $('payments').innerHTML = d.payments.length ? [...d.payments].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(p => `<div class="line-row"><div class="row-main"><div class="row-title">${fmt(p.amount)}</div><div class="row-sub">${p.date || '-'}</div></div><button class="icon-danger" onclick="deletePayment('${p.id}')" title="ลบรายการ"><i class="bi bi-trash3"></i></button></div>`).join('') : `<div class="line-empty">ยังไม่มีรายการจ่าย</div>`;
}

window.deleteDebt = function (month) { const d = load(); d.debts = d.debts.filter(x => x.month !== month); save(d); render(); showToast('ลบเดือนค้างแล้ว') };
window.deletePayment = function (id) { const d = load(); d.payments = d.payments.filter(x => x.id !== id); save(d); render(); showToast('ลบรายการจ่ายแล้ว') };

function bindInputs() {
    document.querySelectorAll('.number-input').forEach(input => {
        input.addEventListener('blur', () => { const n = toNumber(input.value); input.value = n ? fmt(n) : '' });
        input.addEventListener('focus', () => { input.value = String(toNumber(input.value) || ''); input.select() });
    });
}
function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active'); $(`tab-${btn.dataset.tab}`).classList.add('active');
    }));
}

$('saveSettings').onclick = () => { const d = load(); d.settings = { salary: toNumber($('salary').value), ssRate: toNumber($('ssRate').value), taxMode: $('taxMode').value, taxValue: toNumber($('taxValue').value) }; save(d); render(); showToast('บันทึกข้อมูลสำเร็จ') };
$('addDebt').onclick = () => { const d = load(); const month = $('debtMonth').value; if (!month) return showToast('กรุณาเลือกเดือนค้าง', 'error'); if (d.debts.some(x => x.month === month)) return showToast('เดือนนี้ถูกเพิ่มแล้ว', 'error'); const amount = getDeductions(d.settings).net; if (amount <= 0) return showToast('กรุณาตั้งค่าเงินเดือนก่อน', 'error'); d.debts.push({ month, amount }); save(d); render(); showToast('เพิ่มเดือนค้างสำเร็จ') };
$('addPayment').onclick = () => { const d = load(); const date = $('payDate').value; const amount = toNumber($('payAmount').value); if (!date) return showToast('กรุณาเลือกวันที่บริษัทจ่าย', 'error'); if (amount <= 0) return showToast('กรุณากรอกจำนวนเงิน', 'error'); d.payments.push({ id: String(Date.now()), date, amount }); $('payAmount').value = ''; save(d); render(); showToast('บันทึกการจ่ายสำเร็จ') };
$('clearPayments').onclick = () => { if (!confirm('ต้องการล้างรายการจ่ายทั้งหมดหรือไม่?')) return; const d = load(); d.payments = []; save(d); render(); showToast('ล้างรายการจ่ายทั้งหมดแล้ว') };
$('exportBtn').onclick = () => { const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `salary-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href); showToast('Export Backup แล้ว') };
$('importFile').onchange = e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(reader.result); if (!imported || !Array.isArray(imported.debts) || !Array.isArray(imported.payments)) throw new Error('bad'); save(imported); render(); showToast('Import Backup สำเร็จ') } catch (err) { showToast('ไฟล์ Backup ไม่ถูกต้อง', 'error') } }; reader.readAsText(file) };

const modes = ['light', 'dark', 'auto'];
function currentThemeMode() { return localStorage.getItem('themeMode') || 'auto' }
function applyTheme() { const mode = currentThemeMode(); let theme = mode; if (mode === 'auto') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; document.body.setAttribute('data-theme', theme); const icon = $('themeIcon'); icon.className = mode === 'light' ? 'bi bi-sun-fill' : mode === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-circle-half' }
$('themeBtn').onclick = () => { const idx = modes.indexOf(currentThemeMode()); const next = modes[(idx + 1) % modes.length]; localStorage.setItem('themeMode', next); applyTheme(); showToast(next === 'light' ? 'โหมดกลางวัน' : next === 'dark' ? 'โหมดกลางคืน' : 'โหมดอัตโนมัติ') };
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

let deferredPrompt = null;
function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true }
function setupInstallButton() {
    const btn = $('installBtn');
    if (isStandalone()) { btn.classList.add('d-none'); return }
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; btn.classList.remove('d-none') });
    btn.onclick = async () => {
        if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; btn.classList.add('d-none'); showToast('ดำเนินการติดตั้งแล้ว') }
        else showToast('บน iPhone ให้กด Share แล้วเลือก Add to Home Screen', 'error');
    };
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isiOS && !isStandalone()) btn.classList.remove('d-none');
}

let newWorker = null;
function setupUpdateButton() {
    const updateBtn = $('updateBtn');
    updateBtn.onclick = async () => {
        if (newWorker) { newWorker.postMessage({ type: 'SKIP_WAITING' }); }
        const regs = await navigator.serviceWorker?.getRegistrations?.();
        if (regs) await Promise.all(regs.map(r => r.update()));
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        showToast('กำลังอัปเดตแอพ');
        setTimeout(() => location.reload(), 500);
    };

    fetch(`version.json?ts=${Date.now()}`).then(r => r.json()).then(v => {
        if (v.version && v.version !== APP_VERSION) updateBtn.classList.remove('d-none');
    }).catch(() => { });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
        window.addEventListener('load', async () => {
            const reg = await navigator.serviceWorker.register('service-worker.js');
            if (reg.waiting) { newWorker = reg.waiting; updateBtn.classList.remove('d-none') }
            reg.addEventListener('updatefound', () => {
                const worker = reg.installing;
                worker?.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        newWorker = worker; updateBtn.classList.remove('d-none'); showToast('มีเวอร์ชันใหม่พร้อมอัปเดต');
                    }
                });
            });
        });
    }
}
function updateFooter() {
    const footer = $('appFooter');
    if (!footer) return;
    footer.innerHTML =
        `Version ${APP_VERSION} &bull; พัฒนาโดย ${APP_Authorized}`;
}
bindInputs(); bindTabs(); applyTheme(); setupInstallButton(); setupUpdateButton(); render(); updateFooter();
// --- State ---
let clickCount = 0, duration = 5, startedAt = null, ended = false, rafId = null;
// elements
const clickArea = document.getElementById('clickArea');
const displayMain = document.getElementById('displayMain');
const displaySub = document.getElementById('displaySub');
const timeRemainingDisplay = document.getElementById('time-remaining');
const clickCountDisplay = document.getElementById('click-count');
const cpsDisplay = document.getElementById('cps');
const restartButton = document.getElementById('restartButton');
const durationSelect = document.getElementById('duration');
const progressEl = document.getElementById('progress');
const copyButton = document.getElementById('copyButton');
const saveButton = document.getElementById('saveButton');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const modal = document.getElementById('modal');
const leadList = document.getElementById('leadList');
const closeModal = document.getElementById('closeModal');
const modalSave = document.getElementById('modalSave');
const playerName = document.getElementById('playerName');
const saveModal = document.getElementById('saveModal');
const saveCps = document.getElementById('saveCps');
const saveClicks = document.getElementById('saveClicks');
const saveName = document.getElementById('saveName');
const saveConfirm = document.getElementById('saveConfirm');
const saveCancel = document.getElementById('saveCancel');
const closeSaveModal = document.getElementById('closeSaveModal');
const settingsFab = document.getElementById('settingsFab');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const soundToggle = document.getElementById('soundToggle');
const autosaveToggle = document.getElementById('autosaveToggle');
const showBestToggle = document.getElementById('showBestToggle');
const deleteAllModal = document.getElementById('deleteAllModal');
const confirmModal = document.getElementById('confirmModal');
const confirmDeleteAll = document.getElementById('confirmDeleteAll');
const cancelDeleteAll = document.getElementById('cancelDeleteAll');
const toast = document.getElementById('toast');

// audio
const audioCtx = (typeof AudioContext !== 'undefined') ? new AudioContext() : null;
function beep(durationMs = 40, frequency = 700, type = 'sine') {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = frequency;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.001);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    o.stop(now + durationMs / 1000 + 0.02);
}

// storage
const LS_KEY = 'cps_leaderboard_v1';
function loadLeaderboard() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}
function saveLeaderboard(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
}
function getBest() {
    const list = loadLeaderboard();
    if (!list.length) return null;
    list.sort((a, b) => b.cps - a.cps);
    return list[0];
}
function renderBest() {
    const bestBox = document.getElementById('bestBox');
    if (!showBestToggle.checked) {
        bestBox.textContent = 'Disattivato';
        return;
    }
    const b = getBest();
    if (!b) {
        bestBox.textContent = 'Nessun record ancora';
        return;
    }
    const d = new Date(b.date).toLocaleString();
    bestBox.innerHTML = `<strong>${escapeHtml(b.name)}</strong> — ${b.cps.toFixed(2)} CPS (${b.clicks} click) <div style="font-size:0.85rem;color:var(--muted)">${d}</div>`;
}
function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// logic
durationSelect.addEventListener('change', e => {
    duration = Number(e.target.value);
    reset();
});
function handleClick() {
    if (ended) return;
    if (!startedAt) {
        startedAt = performance.now();
        rafId = requestAnimationFrame(tick);
        displayMain.textContent = '';
        displaySub.textContent = 'Vai!';
        clickArea.setAttribute('aria-pressed', 'true');
    }
    clickCount++;
    clickCountDisplay.textContent = clickCount;
    if (soundToggle.checked) beep();
}
function calculateCPS(elapsedSec) {
    if (elapsedSec <= 0) return 0;
    return clickCount / elapsedSec;
}
function tick(now) {
    const elapsedMs = now - startedAt;
    const elapsedSec = elapsedMs / 1000;
    const remaining = Math.max(0, duration - elapsedSec);
    timeRemainingDisplay.textContent = remaining.toFixed(2) + 's';
    const cps = calculateCPS(Math.max(0.001, elapsedSec));
    cpsDisplay.textContent = cps.toFixed(2);
    const percent = Math.min(100, (elapsedSec / duration) * 100);
    progressEl.style.width = percent + '%';
    progressEl.setAttribute('aria-valuenow', percent.toFixed(0));
    if (remaining <= 0) {
        endTest();
        return;
    }
    rafId = requestAnimationFrame(tick);
}
function endTest() {
    ended = true;
    clickArea.classList.add('disabled');
    clickArea.setAttribute('aria-pressed', 'false');
    displayMain.textContent = 'Fine';
    displaySub.textContent = `CPS: ${cpsDisplay.textContent}`;
    timeRemainingDisplay.textContent = '0.00s';
    const totalSec = Math.max(0.001, (performance.now() - startedAt) / 1000);
    cpsDisplay.textContent = (clickCount / totalSec).toFixed(2);
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    const finalCps = Number(cpsDisplay.textContent);
    if (autosaveToggle.checked) {
        addScore({ name: 'You', cps: finalCps, clicks: clickCount, duration, date: Date.now() });
        renderBest();
        showToast('Risultato salvato automaticamente');
    }
}
function reset() {
    clickCount = 0;
    startedAt = null;
    ended = false;
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    clickCountDisplay.textContent = '0';
    cpsDisplay.textContent = '0.00';
    timeRemainingDisplay.textContent = duration.toFixed(2) + 's';
    progressEl.style.width = '0%';
    progressEl.setAttribute('aria-valuenow', '0');
    clickArea.classList.remove('disabled');
    clickArea.setAttribute('aria-pressed', 'false');
    displayMain.textContent = 'Premi per iniziare';
    displaySub.textContent = 'Click veloce — tocca lo schermo o premi Space';
}

// leaderboard + undo
let lastDeleted = null;
function addScore(record) {
    const list = loadLeaderboard();
    list.unshift(record);
    list.sort((a, b) => b.cps - a.cps);
    saveLeaderboard(list.slice(0, 50));
}
function openLeaderboard() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    trapFocus(modal);
    renderLeaderboard();
}
function renderLeaderboard() {
    const list = loadLeaderboard();
    leadList.innerHTML = '';
    if (!list.length) {
        leadList.innerHTML = '<div class="sub">Nessun risultato salvato</div>';
        return;
    }
    list.forEach((r, idx) => {
        const el = document.createElement('div');
        el.className = 'leadItem';
        el.setAttribute('role', 'listitem');
        el.innerHTML = `<div style="font-weight:700">${idx + 1}. ${escapeHtml(r.name)}</div><div style="text-align:right"><div>${r.cps.toFixed(2)} CPS</div><div style="font-size:0.85rem;color:var(--muted)">${r.clicks} click — ${new Date(r.date).toLocaleString()}</div><div style="margin-top:6px"><button data-idx="${idx}" class="btn small ghost deleteEntryBtn" type="button">Elimina</button></div></div>`;
        leadList.appendChild(el);
    });
    document.querySelectorAll('.deleteEntryBtn').forEach(btn => {
        btn.addEventListener('click', e => {
            const idx = Number(e.target.getAttribute('data-idx'));
            deleteEntryAt(idx);
        });
    });
}
function deleteEntryAt(idx) {
    const list = loadLeaderboard();
    if (!list.length || idx < 0 || idx >= list.length) return;
    lastDeleted = { item: list[idx], index: idx };
    list.splice(idx, 1);
    saveLeaderboard(list);
    renderLeaderboard();
    renderBest();
    showToast('Voce eliminata', { action: 'Annulla', onAction: restoreLastDeleted });
}
function restoreLastDeleted() {
    if (!lastDeleted) return;
    const list = loadLeaderboard();
    if (lastDeleted.all) {
        saveLeaderboard(lastDeleted.item);
        lastDeleted = null;
        renderLeaderboard();
        renderBest();
        showToast('Ripristinato');
        return;
    }
    list.splice(lastDeleted.index, 0, lastDeleted.item);
    saveLeaderboard(list);
    renderLeaderboard();
    renderBest();
    showToast('Eliminazione annullata');
    lastDeleted = null;
}
function deleteLast() {
    const list = loadLeaderboard();
    if (!list.length) {
        showToast('Nessun risultato da eliminare');
        return;
    }
    lastDeleted = { item: list[0], index: 0 };
    list.shift();
    saveLeaderboard(list);
    renderLeaderboard();
    renderBest();
    showToast('Ultimo risultato eliminato', { action: 'Annulla', onAction: restoreLastDeleted });
}
function clearAllConfirmed() {
    const list = loadLeaderboard();
    if (!list.length) {
        showToast('Leaderboard già vuota');
        return;
    }
    lastDeleted = { item: list.slice(), index: 0, all: true };
    saveLeaderboard([]);
    renderLeaderboard();
    renderBest();
    showToast('Leaderboard svuotata', { action: 'Annulla', onAction: restoreAll });
}
function restoreAll() {
    if (!lastDeleted || !lastDeleted.all) return;
    saveLeaderboard(lastDeleted.item);
    renderLeaderboard();
    renderBest();
    showToast('Ripristinato');
    lastDeleted = null;
}

// modal handlers
leaderboardBtn.addEventListener('click', () => {
    playerName.value = '';
    modalSave.textContent = 'Salva';
    openLeaderboard();
});
closeModal.addEventListener('click', () => { closeModalFn(); });
modal.addEventListener('click', e => { if (e.target === modal) closeModalFn(); });
function closeModalFn() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    releaseFocusTrap();
}
modalSave.addEventListener('click', () => {
    const name = (playerName.value || 'Anonimo').slice(0, 12);
    const finalCps = Number(cpsDisplay.textContent) || 0;
    if (!finalCps) {
        showToast('Nessun risultato da salvare');
        return;
    }
    addScore({ name, cps: finalCps, clicks: clickCount, duration, date: Date.now() });
    playerName.value = '';
    renderLeaderboard();
    renderBest();
    showToast('Risultato salvato');
});

// save modal handlers
saveButton.addEventListener('click', () => {
    const finalCps = Number(cpsDisplay.textContent) || 0;
    if (!finalCps) {
        showToast('Nessun risultato da salvare');
        return;
    }
    saveCps.textContent = finalCps.toFixed(2);
    saveClicks.textContent = clickCount;
    saveName.value = '';
    openSaveModal();
});
function openSaveModal() {
    saveModal.classList.add('open');
    saveModal.setAttribute('aria-hidden', 'false');
    trapFocus(saveModal);
    saveName.focus();
}
function closeSaveModalFn() {
    saveModal.classList.remove('open');
    saveModal.setAttribute('aria-hidden', 'true');
    releaseFocusTrap();
}
closeSaveModal.addEventListener('click', closeSaveModalFn);
saveCancel.addEventListener('click', closeSaveModalFn);
saveConfirm.addEventListener('click', () => {
    const name = (saveName.value || 'You').slice(0, 12);
    const finalCps = Number(saveCps.textContent) || 0;
    addScore({ name, cps: finalCps, clicks: Number(saveClicks.textContent), duration, date: Date.now() });
    renderBest();
    closeSaveModalFn();
    showToast('Risultato salvato');
});

// copy
copyButton.addEventListener('click', async () => {
    const text = `CPS: ${cpsDisplay.textContent} — Click: ${clickCount} — Durata: ${duration}s`;
    try {
        await navigator.clipboard.writeText(text);
        copyButton.textContent = 'Copiato!';
        setTimeout(() => copyButton.textContent = 'Copia risultato', 1200);
        showToast('Copiato negli appunti');
    } catch (e) {
        copyButton.textContent = 'N/D';
        setTimeout(() => copyButton.textContent = 'Copia risultato', 1200);
        showToast('Impossibile copiare');
    }
});

// keyboard + click area
clickArea.addEventListener('click', handleClick);
window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleClick();
    }
    if (e.key && e.key.toLowerCase() === 'r') {
        reset();
    }
    if (e.key === 'Escape') {
        if (settingsPanel.classList.contains('open')) closeSettingsFn();
        if (modal.classList.contains('open')) closeModalFn();
        if (saveModal.classList.contains('open')) closeSaveModalFn();
        if (confirmModal.classList.contains('open')) closeConfirmFn();
    }
});
restartButton.addEventListener('click', reset);

// settings toggles
soundToggle.addEventListener('change', () => {
    if (soundToggle.checked && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
});
showBestToggle.addEventListener('change', renderBest);

// settings panel
settingsFab.addEventListener('click', () => {
    const open = settingsPanel.classList.toggle('open');
    settingsPanel.setAttribute('aria-hidden', (!open).toString());
    if (open) {
        trapFocus(settingsPanel);
        const focusable = settingsPanel.querySelector('input, button');
        if (focusable) focusable.focus();
    } else {
        releaseFocusTrap();
        settingsFab.focus();
    }
});
closeSettings.addEventListener('click', () => { closeSettingsFn(); });
function closeSettingsFn() {
    settingsPanel.classList.remove('open');
    settingsPanel.setAttribute('aria-hidden', 'true');
    releaseFocusTrap();
    settingsFab.focus();
}

// delete all flow: open confirm modal instead of browser confirm
deleteAllModal.addEventListener('click', () => { openConfirmModal(); });
function openConfirmModal() {
    confirmModal.classList.add('open');
    confirmModal.setAttribute('aria-hidden', 'false');
    trapFocus(confirmModal);
}
function closeConfirmFn() {
    confirmModal.classList.remove('open');
    confirmModal.setAttribute('aria-hidden', 'true');
    releaseFocusTrap();
}
cancelDeleteAll.addEventListener('click', closeConfirmFn);
confirmDeleteAll.addEventListener('click', () => {
    closeConfirmFn();
    clearAllConfirmed();
});

// ripple
document.addEventListener('pointerdown', function (e) {
    const b = e.target.closest('.btn');
    if (!b) return;
    const rect = b.getBoundingClientRect();
    const circle = document.createElement('span');
    circle.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    circle.style.width = circle.style.height = size + 'px';
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    circle.style.left = x + 'px';
    circle.style.top = y + 'px';
    b.appendChild(circle);
    setTimeout(() => { circle.remove(); }, 700);
});

// toast + undo
let toastTimer = null;
function showToast(msg, opts = {}) {
    const { action, onAction, duration = 2400 } = opts;
    toast.innerHTML = '';
    const text = document.createElement('div');
    text.textContent = msg;
    text.style.flex = '1';
    toast.appendChild(text);
    if (action && typeof onAction === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = action;
        btn.addEventListener('click', () => { onAction(); hideToast(); });
        toast.appendChild(btn);
    }
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { hideToast(); }, duration);
}
function hideToast() {
    toast.classList.remove('show');
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }
}

// focus trap (simple)
let lastFocused = null, trapRoot = null;
function trapFocus(container) {
    releaseFocusTrap();
    trapRoot = container;
    lastFocused = document.activeElement;
    const focusable = trapRoot.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) focusable[0].focus();
    document.addEventListener('focus', enforceFocus, true);
    document.addEventListener('keydown', trapTab);
}
function releaseFocusTrap() {
    if (!trapRoot) return;
    document.removeEventListener('focus', enforceFocus, true);
    document.removeEventListener('keydown', trapTab);
    if (lastFocused) lastFocused.focus();
    trapRoot = null;
    lastFocused = null;
}
function enforceFocus(e) {
    if (!trapRoot) return;
    if (trapRoot.contains(e.target)) return;
    e.stopPropagation();
    trapRoot.querySelector('button, input, [tabindex]')?.focus();
}
function trapTab(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(trapRoot.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
        if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
    } else {
        if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
}

// init
(function init() {
    duration = Number(durationSelect.value);
    reset();
    renderBest();
})();
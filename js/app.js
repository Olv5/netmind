// ============================================================
// APPLICATION ENTRY POINT & ROUTER
// ============================================================
import { loadFromDB, syncOfflineQueue, updateStatusIndicator } from './services/storage.js';
import { renderSidebar, toggleTopic, toggleSidebar, closeSidebar } from './ui/sidebar.js';
import { renderDashboard } from './ui/dashboard.js';
import { showItemList, renderItemList, toggleItemCard } from './ui/items.js';
import {
  startReview,
  showReviewCard,
  revealAnswer,
  skipCard,
  goBackCard,
  gradeCard,
  finishReview
} from './ui/review.js';
import { renderStats } from './ui/stats.js';
import {
  closeModal,
  closeModalOutside,
  openAddItemModal,
  openEditItemModal,
  deleteItem,
  openAddTopicModal,
  deleteTopic,
  openDailyLimitModal,
  resetAllStats,
  openBulkImportModal
} from './ui/modals.js';

export function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('nav-' + name)?.classList.add('active');
  closeSidebar();

  const titleEl = document.getElementById('topbarTitle');
  const pathEl = document.getElementById('topbarPath');

  if (name === 'dashboard') {
    renderDashboard();
    if (titleEl) titleEl.textContent = 'Dashboard';
    if (pathEl) pathEl.innerHTML = '';
  } else if (name === 'stats') {
    renderStats();
    if (titleEl) titleEl.textContent = 'Stats';
    if (pathEl) pathEl.innerHTML = '';
  } else if (name === 'help') {
    if (titleEl) titleEl.textContent = 'How to Use';
    if (pathEl) pathEl.innerHTML = '';
  } else if (name === 'review') {
    if (titleEl) titleEl.textContent = 'Review Session';
    if (pathEl) pathEl.innerHTML = '';
  }
}

export function showLoading(visible) {
  let el = document.getElementById('loadingScreen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingScreen';
    el.style.cssText =
      'position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;font-family:var(--mono);color:var(--text3);font-size:13px;gap:12px;';
    el.innerHTML = `<div style="font-family:var(--sans);font-size:22px;font-weight:800;color:var(--text)">Net<span style="color:var(--accent)">Mind</span></div><div id="loadingMsg">Loading your knowledge base...</div>`;
    document.body.appendChild(el);
  }
  el.style.display = visible ? 'flex' : 'none';
}

export function showError(msg) {
  const el = document.getElementById('loadingMsg');
  if (el) {
    el.textContent = msg;
    el.style.color = 'var(--weak)';
  }
  showLoading(true);
}

// Expose public API on window for inline handlers & templates
const NetMindActions = {
  showView,
  toggleSidebar,
  closeSidebar,
  toggleTopic,
  showItemList,
  renderItemList,
  toggleItemCard,
  openAddItemModal,
  openEditItemModal,
  deleteItem,
  openAddTopicModal,
  deleteTopic,
  openDailyLimitModal,
  resetAllStats,
  openBulkImportModal,
  closeModal,
  closeModalOutside,
  startReview,
  revealAnswer,
  skipCard,
  goBackCard,
  gradeCard,
  finishReview
};

window.NetMind = NetMindActions;

// Also map directly to window so any direct onclick="functionName()" works seamlessly
Object.assign(window, NetMindActions);

// Connection event listeners for automatic offline sync
window.addEventListener('online', async () => {
  console.log('[NetMind] Back online. Syncing pending data...');
  updateStatusIndicator();
  await syncOfflineQueue();
});

window.addEventListener('offline', () => {
  console.log('[NetMind] Offline mode active.');
  updateStatusIndicator();
});

// Bootstrap application
async function init() {
  showLoading(true);
  try {
    await loadFromDB();
    renderSidebar();
    renderDashboard();
  } catch (err) {
    console.error('Initialization error:', err);
    renderSidebar();
    renderDashboard();
  } finally {
    showLoading(false);
  }
}

// Start
init();

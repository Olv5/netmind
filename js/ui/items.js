// ============================================================
// ITEM LIST VIEW COMPONENT
// ============================================================
import { TYPE_LABELS, TYPES } from '../config.js';
import { data, getTopic, getTopicItems, isDue, uiState } from '../state/store.js';
import { closeSidebar } from './sidebar.js';

export function showItemList(topicId, type) {
  uiState.currentTopicId = topicId;
  uiState.currentType = type;

  const topic = getTopic(topicId);
  window.NetMind.showView('items');

  document.getElementById('topbarTitle').textContent = topic?.name || '';
  document.getElementById('topbarPath').innerHTML = TYPE_LABELS[type] || '';
  document.getElementById('itemListTitle').textContent = topic?.name || '';

  const badge = document.getElementById('itemListBadge');
  if (badge) {
    badge.textContent = TYPE_LABELS[type] || '';
    badge.className = `type-badge ${type}`;
  }

  // Mark active folder
  document.querySelectorAll('.folder-row').forEach(r => r.classList.remove('active'));
  const folders = document.querySelectorAll(`#folders-${topicId} .folder-row`);
  const typeIdx = TYPES.indexOf(type);
  if (folders[typeIdx]) folders[typeIdx].classList.add('active');

  renderItemList();
  closeSidebar();
}

export function renderItemList() {
  const items = getTopicItems(uiState.currentTopicId, uiState.currentType);
  const container = document.getElementById('itemListContainer');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">✦</div>
      No items here yet. Click <strong>+ Add</strong> above to create your first one.
    </div>`;
    return;
  }

  container.innerHTML = items
    .map(item => {
      const due = isDue(item);
      const sessions = item.review?.sessions || 0;
      const nrs = item.review?.nextReviewSession;
      const away = nrs ? Math.max(0, nrs - data.sessionCount) : null;
      const dueLabel =
        sessions === 0
          ? 'new'
          : due
          ? 'due now'
          : away !== null
          ? `in ${away}s`
          : '';
      const dueCls = sessions === 0 ? 'new-tag' : due ? 'due-now' : '';
      const tagHtml = (item.tags || []).length
        ? item.tags.map(t => `<span class="item-tag-label">${escapeHtml(t)}</span>`).join('')
        : '';

      return `<div class="item-card" id="icard-${item.id}">
      <div class="item-card-header" onclick="window.NetMind.toggleItemCard('${item.id}')">
        <div class="item-card-question">${escapeHtml(item.question)}</div>
        <div class="item-card-actions">
          <button class="item-action-btn" onclick="event.stopPropagation();window.NetMind.openEditItemModal('${item.id}')">Edit</button>
          <button class="item-action-btn del" onclick="event.stopPropagation();window.NetMind.deleteItem('${item.id}')">×</button>
        </div>
      </div>
      <div class="item-card-meta">
        ${dueLabel ? `<span class="due-tag ${dueCls}">${dueLabel}</span>` : ''}
        <span>${sessions} review${sessions !== 1 ? 's' : ''}</span>
        ${tagHtml}
      </div>
      <div class="item-card-answer">${escapeHtml(item.answer) || '<em style="color:var(--text3)">No answer yet — edit to add one.</em>'}</div>
    </div>`;
    })
    .join('');
}

export function toggleItemCard(id) {
  document.getElementById('icard-' + id)?.classList.toggle('open');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

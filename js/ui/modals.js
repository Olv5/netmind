// ============================================================
// MODALS CONTROLLER COMPONENT
// ============================================================
import { TYPE_LABELS, TYPES } from '../config.js';
import { data, getItem, getTopic, uid, tuid, uiState } from '../state/store.js';
import {
  saveItem,
  saveItemsBatch,
  saveTopic,
  saveMeta,
  deleteItemFromDB,
  deleteTopicFromDB,
  resetAllStatsInDB
} from '../services/storage.js';
import { parseBulkCards, BULK_TEMPLATE_EXAMPLE } from '../services/importer.js';
import { renderSidebar, closeSidebar } from './sidebar.js';
import { renderItemList } from './items.js';
import { renderDashboard } from './dashboard.js';

export function closeModal() {
  document.getElementById('modalOverlay')?.classList.remove('open');
  document.querySelector('.modal')?.classList.remove('modal-large');
}

export function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) {
    closeModal();
  }
}

export function openAddItemModal() {
  const currentType = uiState.currentType;
  const currentTopicId = uiState.currentTopicId;

  document.getElementById('modalTitle').textContent = `Add ${TYPE_LABELS[currentType] || 'Item'}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="field"><label>Question</label>
      <textarea id="f-q" placeholder="Enter your question or prompt..." style="min-height:80px;"></textarea></div>
    <div class="field"><label>Answer / Reference</label>
      <textarea id="f-a" placeholder="The reference answer..." style="min-height:120px;"></textarea></div>
    <div class="field"><label>Tag (optional concept label)</label>
      <input id="f-tag" type="text" placeholder="e.g. ARP, Ethernet Switching..."></div>`;

  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';

  saveBtn.onclick = async () => {
    const question = document.getElementById('f-q').value.trim();
    if (!question) return;
    const answer = document.getElementById('f-a').value.trim();
    const tag = document.getElementById('f-tag').value.trim();

    const item = {
      id: uid(),
      topic_id: currentTopicId,
      type: currentType,
      question,
      answer,
      tags: tag ? [tag] : [],
      review: {
        sessions: 0,
        lastSession: -1,
        easeScore: 2.5,
        interval: 1,
        nextReviewSession: 0
      }
    };

    data.items.push(item);
    await saveItem(item);
    closeModal();
    renderSidebar();
    renderItemList();
  };

  document.getElementById('modalOverlay')?.classList.add('open');
}

export function openEditItemModal(itemId) {
  const item = getItem(itemId);
  if (!item) return;

  document.getElementById('modalTitle').textContent = `Edit ${TYPE_LABELS[item.type] || 'Item'}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="field"><label>Question</label>
      <textarea id="f-q" style="min-height:80px;">${escapeHtml(item.question)}</textarea></div>
    <div class="field"><label>Answer / Reference</label>
      <textarea id="f-a" style="min-height:120px;">${escapeHtml(item.answer)}</textarea></div>
    <div class="field"><label>Tag (optional)</label>
      <input id="f-tag" type="text" value="${escapeHtml((item.tags || [])[0] || '')}"></div>`;

  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';

  saveBtn.onclick = async () => {
    item.question = document.getElementById('f-q').value.trim() || item.question;
    item.answer = document.getElementById('f-a').value.trim();
    const tag = document.getElementById('f-tag').value.trim();
    item.tags = tag ? [tag] : [];

    await saveItem(item);
    closeModal();
    renderItemList();
  };

  document.getElementById('modalOverlay')?.classList.add('open');
}

export async function deleteItem(itemId) {
  const item = getItem(itemId);
  if (!item) return;
  if (!confirm(`Delete this ${TYPE_LABELS[item.type] || 'item'}?`)) return;

  data.items = data.items.filter(i => i.id !== itemId);
  await deleteItemFromDB(itemId);
  renderSidebar();
  renderItemList();
}

export function openAddTopicModal() {
  document.getElementById('modalTitle').textContent = 'Add Topic';
  document.getElementById('modalBody').innerHTML = `
    <div class="field"><label>Topic Name</label>
      <input id="f-tname" type="text" placeholder="e.g. Networking, TCP/IP, Cryptography..."></div>`;

  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';

  saveBtn.onclick = async () => {
    const name = document.getElementById('f-tname').value.trim();
    if (!name) return;
    const topic = { id: tuid(), name };

    data.topics.push(topic);
    await saveTopic(topic);
    closeModal();
    renderSidebar();
  };

  document.getElementById('modalOverlay')?.classList.add('open');
}

export async function deleteTopic(topicId) {
  const topic = getTopic(topicId);
  if (!topic) return;

  const toDelete = data.items.filter(i => i.topic_id === topicId);
  if (
    !confirm(
      `Delete topic "${topic.name}" and all ${toDelete.length} items inside it?`
    )
  ) {
    return;
  }

  const toDeleteIds = toDelete.map(i => i.id);
  data.items = data.items.filter(i => i.topic_id !== topicId);
  data.topics = data.topics.filter(t => t.id !== topicId);

  await deleteTopicFromDB(topicId, toDeleteIds);

  renderSidebar();
  renderDashboard();
  window.NetMind.showView('dashboard');
}

export function openDailyLimitModal() {
  document.getElementById('modalTitle').textContent = 'Daily New Card Limit';
  document.getElementById('modalBody').innerHTML = `
    <div class="field">
      <label>New cards per day</label>
      <input id="f-limit" type="number" min="1" max="200" value="${data.dailyNewLimit}">
    </div>
    <div class="hint">Cards you've never seen before. Already-reviewed cards always appear when due, regardless of this limit.</div>`;

  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';

  saveBtn.onclick = async () => {
    const val = parseInt(document.getElementById('f-limit').value);
    if (!val || val < 1) return;
    data.dailyNewLimit = val;
    await saveMeta();
    const lbl = document.getElementById('dailyLimitLabel');
    if (lbl) lbl.textContent = val;
    closeModal();
    renderDashboard();
  };

  document.getElementById('modalOverlay')?.classList.add('open');
}

export async function resetAllStats() {
  const confirmed = confirm(
    "Reset all review stats?\n\nThis zeroes every item's session count, ease score and interval. Your topics and items stay intact. This cannot be undone."
  );
  if (!confirmed) return;

  await resetAllStatsInDB();

  closeSidebar();
  renderSidebar();
  renderDashboard();
  alert('Done. All stats reset — every item is due again.');
}

/**
 * Bulk Import Modal
 */
export function openBulkImportModal(presetTopicId = null) {
  const modalEl = document.querySelector('.modal');
  modalEl?.classList.add('modal-large');

  const defaultTopicId =
    presetTopicId || uiState.currentTopicId || (data.topics[0]?.id ?? '__new__');

  const topicOptions = data.topics
    .map(
      t =>
        `<option value="${t.id}" ${t.id === defaultTopicId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`
    )
    .join('');

  document.getElementById('modalTitle').textContent = '📥 Bulk Import Cards';
  document.getElementById('modalBody').innerHTML = `
    <div class="field">
      <label>Target Topic</label>
      <select id="f-import-topic">
        ${topicOptions}
        <option value="__new__" ${data.topics.length === 0 ? 'selected' : ''}>+ Create New Topic...</option>
      </select>
    </div>
    <div class="field" id="new-topic-field" style="display:${data.topics.length === 0 || defaultTopicId === '__new__' ? 'block' : 'none'};">
      <label>New Topic Name</label>
      <input id="f-import-new-topic" type="text" placeholder="e.g. Computer Networks">
    </div>

    <div class="import-template-bar">
      <span>Syntax: <strong>Q:</strong> Question &nbsp;|&nbsp; <strong>A:</strong> Answer &nbsp;|&nbsp; <strong>type:</strong> atomic, process, problem, reconstruction &nbsp;|&nbsp; <strong>---</strong></span>
      <button type="button" class="btn-template-insert" id="btnInsertTemplate">Insert Example</button>
    </div>

    <div class="field" style="margin-bottom:8px;">
      <textarea id="f-bulk-text" placeholder="Q: What is a MAC address?\nA: 48-bit hardware identifier\ntype: atomic\ntags: layer2\n---\nQ: Describe the 3-way handshake..." style="min-height:160px;font-family:var(--mono);font-size:11px;line-height:1.6;"></textarea>
    </div>

    <div class="import-summary-bar" id="importSummaryBar">
      <span class="import-badge empty" id="importBadge">0 cards detected</span>
      <button type="button" class="btn-toggle-preview" id="btnTogglePreview" style="display:none;">View Preview ▾</button>
    </div>

    <div class="import-preview-list" id="importPreviewList" style="display:none;"></div>
  `;

  const topicSelect = document.getElementById('f-import-topic');
  const newTopicField = document.getElementById('new-topic-field');
  topicSelect.onchange = () => {
    newTopicField.style.display = topicSelect.value === '__new__' ? 'block' : 'none';
    validateAndRender();
  };

  const textarea = document.getElementById('f-bulk-text');
  const btnTemplate = document.getElementById('btnInsertTemplate');
  btnTemplate.onclick = () => {
    textarea.value = BULK_TEMPLATE_EXAMPLE;
    validateAndRender();
  };

  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Import Cards';

  let parsedCards = [];
  let isPreviewOpen = false;

  const btnTogglePreview = document.getElementById('btnTogglePreview');
  btnTogglePreview.onclick = () => {
    isPreviewOpen = !isPreviewOpen;
    document.getElementById('importPreviewList').style.display = isPreviewOpen ? 'flex' : 'none';
    btnTogglePreview.textContent = isPreviewOpen ? 'Hide Preview ▴' : 'View Preview ▾';
  };

  function validateAndRender() {
    parsedCards = parseBulkCards(textarea.value);
    const validCount = parsedCards.filter(c => c.isValid).length;
    const invalidCount = parsedCards.length - validCount;

    const badge = document.getElementById('importBadge');
    if (!badge) return;

    if (parsedCards.length === 0) {
      badge.className = 'import-badge empty';
      badge.textContent = '0 cards detected';
      btnTogglePreview.style.display = 'none';
      saveBtn.disabled = true;
      saveBtn.textContent = 'Import Cards';
    } else if (invalidCount > 0) {
      badge.className = 'import-badge warn';
      badge.textContent = `${validCount} valid · ${invalidCount} incomplete`;
      btnTogglePreview.style.display = 'inline';
      saveBtn.disabled = validCount === 0;
      saveBtn.textContent = `Import ${validCount} Card${validCount !== 1 ? 's' : ''}`;
    } else {
      badge.className = 'import-badge valid';
      badge.textContent = `✓ ${validCount} valid card${validCount !== 1 ? 's' : ''}`;
      btnTogglePreview.style.display = 'inline';
      saveBtn.disabled = validCount === 0;
      saveBtn.textContent = `Import ${validCount} Card${validCount !== 1 ? 's' : ''}`;
    }

    // Render preview cards
    const previewList = document.getElementById('importPreviewList');
    if (previewList) {
      previewList.innerHTML = parsedCards
        .map(
          c => `
        <div class="import-preview-card ${c.isValid ? '' : 'invalid'}">
          <div class="import-preview-card-header">
            <div class="import-preview-q">${c.question ? escapeHtml(c.question) : '<em style="color:var(--weak)">[Missing Question]</em>'}</div>
            <span class="type-badge ${c.type}">${c.type}</span>
          </div>
          <div class="import-preview-a">${c.answer ? escapeHtml(c.answer) : '<em style="color:var(--weak)">[Missing Answer]</em>'}</div>
          ${
            c.tags.length
              ? `<div style="margin-top:4px;display:flex;gap:4px;">${c.tags.map(t => `<span class="item-tag-label">${escapeHtml(t)}</span>`).join('')}</div>`
              : ''
          }
        </div>
      `
        )
        .join('');
    }
  }

  textarea.oninput = validateAndRender;

  saveBtn.onclick = async () => {
    const validCards = parsedCards.filter(c => c.isValid);
    if (!validCards.length) return;

    let targetTopicId = topicSelect.value;
    if (targetTopicId === '__new__') {
      const newName = document.getElementById('f-import-new-topic')?.value.trim();
      if (!newName) {
        alert('Please enter a name for the new topic.');
        return;
      }
      const newTopic = { id: tuid(), name: newName };
      data.topics.push(newTopic);
      await saveTopic(newTopic);
      targetTopicId = newTopic.id;
    }

    // Map to NetMind items
    const newItems = validCards.map(card => ({
      id: uid(),
      topic_id: targetTopicId,
      type: card.type,
      question: card.question,
      answer: card.answer,
      tags: card.tags,
      review: {
        sessions: 0,
        lastSession: -1,
        easeScore: 2.5,
        interval: 1,
        nextReviewSession: 0
      }
    }));

    data.items.push(...newItems);
    await saveItemsBatch(newItems);

    closeModal();
    modalEl?.classList.remove('modal-large');
    renderSidebar();
    renderDashboard();

    if (uiState.currentView === 'items' && uiState.currentTopicId === targetTopicId) {
      renderItemList();
    }
  };

  document.getElementById('modalOverlay')?.classList.add('open');
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

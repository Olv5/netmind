// ============================================================
// STATS VIEW COMPONENT
// ============================================================
import { TYPES, TYPE_LABELS } from '../config.js';
import { data, getTopic, typeColor, isDue } from '../state/store.js';
import { computePriority } from '../services/srs.js';

export function renderStats() {
  const container = document.getElementById('statsContent');
  if (!container) return;

  if (!data.items.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◎</div>No items yet. Add topics and start filling them in.</div>`;
    return;
  }

  // Most reviewed
  const mostReviewed = [...data.items]
    .filter(i => (i.review?.sessions || 0) > 0)
    .sort((a, b) => (b.review?.sessions || 0) - (a.review?.sessions || 0))
    .slice(0, 5);

  const reviewedIds = new Set(mostReviewed.map(i => i.id));

  // Most neglected
  const neglected = [...data.items]
    .filter(i => !reviewedIds.has(i.id))
    .sort((a, b) => {
      if ((a.review?.sessions || 0) !== (b.review?.sessions || 0)) {
        return (a.review?.sessions || 0) - (b.review?.sessions || 0);
      }
      return computePriority(b) - computePriority(a);
    })
    .slice(0, 5);

  const highlightHTML = `
    <div class="stats-highlight-grid">
      <div class="stats-highlight-box">
        <div class="stats-highlight-box-header">● Most Reviewed</div>
        ${
          mostReviewed.length
            ? mostReviewed
                .map(i => {
                  const topic = getTopic(i.topic_id);
                  return `<div class="stats-highlight-item" onclick="window.NetMind.showItemList('${i.topic_id}', '${i.type}')">
            <div><div class="shi-name">${escapeHtml(i.question.slice(0, 60))}${i.question.length > 60 ? '...' : ''}</div>
            <div class="shi-topic">${escapeHtml(topic?.name || '')} · ${TYPE_LABELS[i.type]}</div></div>
            <div class="shi-count">${i.review?.sessions || 0}</div>
          </div>`;
                })
                .join('')
            : '<div style="padding:16px;font-size:12px;color:var(--text3);">Nothing reviewed yet.</div>'
        }
      </div>
      <div class="stats-highlight-box">
        <div class="stats-highlight-box-header" style="color:var(--weak);">● Most Neglected</div>
        ${
          neglected.length
            ? neglected
                .map(i => {
                  const topic = getTopic(i.topic_id);
                  return `<div class="stats-highlight-item" onclick="window.NetMind.showItemList('${i.topic_id}', '${i.type}')">
            <div><div class="shi-name">${escapeHtml(i.question.slice(0, 60))}${i.question.length > 60 ? '...' : ''}</div>
            <div class="shi-topic">${escapeHtml(topic?.name || '')} · ${TYPE_LABELS[i.type]}</div></div>
            <div class="shi-count neglected">${i.review?.sessions || 0}</div>
          </div>`;
                })
                .join('')
            : '<div style="padding:16px;font-size:12px;color:var(--text3);">Nothing neglected.</div>'
        }
      </div>
    </div>`;

  const topicBlocksHTML = data.topics
    .map(topic => {
      const topicItems = data.items.filter(i => i.topic_id === topic.id);
      if (!topicItems.length) return '';
      const totalReviews = topicItems.reduce((s, i) => s + (i.review?.sessions || 0), 0);
      const totalDueInTopic = topicItems.filter(isDue).length;

      const typeRows = TYPES.map(type => {
        const items = topicItems.filter(i => i.type === type);
        if (!items.length) return '';
        const reviews = items.reduce((s, i) => s + (i.review?.sessions || 0), 0);
        const due = items.filter(isDue).length;

        return `<div class="type-stat-row">
        <div class="type-stat-label">
          <div style="width:7px;height:7px;border-radius:50%;background:${typeColor(type)};flex-shrink:0;"></div>
          ${TYPE_LABELS[type]}
          <span class="type-tag ${type}" style="margin-left:4px;">${items.length}</span>
        </div>
        <div class="type-stat-nums">
          <span><strong>${reviews}</strong>reviews</span>
          <span><strong style="color:${due > 0 ? 'var(--weak)' : 'var(--ok)'}">${due}</strong>due</span>
        </div>
      </div>`;
      }).join('');

      return `<div class="topic-stat-block" id="tsb-${topic.id}">
      <div class="topic-stat-header" onclick="this.parentElement.classList.toggle('open')">
        <div>
          <div class="topic-stat-name">${escapeHtml(topic.name)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div class="topic-stat-summary">
            <span>${topicItems.length} items</span>
            <span>${totalReviews} reviews</span>
            <span style="color:${totalDueInTopic > 0 ? 'var(--weak)' : 'var(--ok)'};">${totalDueInTopic} due</span>
          </div>
          <span class="topic-stat-chevron">▶</span>
        </div>
      </div>
      <div class="topic-stat-body">${typeRows}</div>
    </div>`;
    })
    .join('');

  container.innerHTML = `
    ${highlightHTML}
    <div class="section-title" style="margin-top:4px;">By Topic</div>
    ${topicBlocksHTML || '<div class="empty-state">No topics yet.</div>'}`;
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

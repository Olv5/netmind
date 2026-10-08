// ============================================================
// DASHBOARD UI COMPONENT
// ============================================================
import { TYPE_LABELS } from '../config.js';
import { data, totalDue, getTopic } from '../state/store.js';
import { buildReviewQueue } from '../services/srs.js';

export function renderDashboard() {
  const total = data.items.length;
  const due = totalDue();

  // Keep daily limit label in sidebar in sync
  const limitLabel = document.getElementById('dailyLimitLabel');
  if (limitLabel) limitLabel.textContent = data.dailyNewLimit;

  const statsGrid = document.getElementById('statsGrid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div class="stat-card"><div class="stat-label">Total Items</div><div class="stat-value accent">${total}</div></div>
      <div class="stat-card"><div class="stat-label">Due Now</div><div class="stat-value ${due > 0 ? 'weak' : 'ok'}">${due}</div></div>
      <div class="stat-card"><div class="stat-label">Sessions</div><div class="stat-value ok">${data.sessionCount}</div></div>
      <div class="stat-card">
        <div class="stat-label">Streak</div>
        <div class="stat-value ${data.streak >= 2 ? 'accent' : 'ok'}">${data.streak >= 2 ? '🔥' : '○'} ${data.streak}d</div>
        ${data.streak === 1 ? '<div style="font-size:10px;color:var(--text3);margin-top:2px;">keep it going</div>' : ''}
      </div>`;
  }

  const queue = buildReviewQueue();
  const badge = document.getElementById('queueBadge');
  if (badge) {
    if (queue.length > 0) {
      badge.textContent = `${queue.length} due`;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  }

  const dashQueue = document.getElementById('dashQueue');
  if (!dashQueue) return;

  if (!queue.length) {
    const next = [...data.items]
      .filter(i => i.review?.nextReviewSession)
      .sort((a, b) => a.review.nextReviewSession - b.review.nextReviewSession)[0];
    const away = next ? Math.max(0, next.review.nextReviewSession - data.sessionCount) : null;
    const nextMsg =
      away !== null
        ? `Next item due in <strong>${away} session${away !== 1 ? 's' : ''}</strong>`
        : data.items.length === 0
        ? 'Add some items to get started.'
        : 'No upcoming reviews scheduled.';

    dashQueue.innerHTML = `<div class="section-title">Review Queue</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:28px;text-align:center;">
        <div style="font-size:24px;margin-bottom:10px;">✓</div>
        <div style="font-family:var(--sans);font-size:15px;font-weight:700;margin-bottom:6px;">All caught up!</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:${data.items.length ? '20px' : '0'};">${nextMsg}</div>
        ${data.items.length ? `<button class="btn-review" onclick="window.NetMind.startReview(null,null,true)" style="font-size:11px;">Review Anyway</button>` : ''}
      </div>`;
    return;
  }

  const top = queue.slice(0, 10);
  const maxP = queue[0].priority || 1;

  dashQueue.innerHTML = `
    <div class="section-title">Review Queue <span style="font-size:11px;color:var(--text3);font-weight:400;">top ${top.length} by priority</span></div>
    <div class="queue-list">${top
      .map(item => {
        const pct = Math.min(100, (item.priority / maxP) * 100);
        const fillCls = pct > 66 ? 'hi' : pct > 33 ? 'mid' : '';
        const topic = getTopic(item.topic_id);
        return `<div class="queue-item" onclick="window.NetMind.showItemList('${item.topic_id}','${item.type}')">
        <div class="queue-item-left">
          <div class="queue-item-name">${escapeHtml(item.question)}</div>
          <div class="queue-item-sub">${escapeHtml(topic?.name || '')} · ${item.review?.sessions || 0} reviews</div>
        </div>
        <div class="queue-item-right">
          <div class="priority-bar"><div class="priority-fill ${fillCls}" style="width:${pct}%"></div></div>
          <span class="type-tag ${item.type}">${TYPE_LABELS[item.type]}</span>
        </div>
      </div>`;
      })
      .join('')}</div>`;
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

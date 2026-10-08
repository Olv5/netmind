// ============================================================
// SIDEBAR UI COMPONENT
// ============================================================
import { TYPES, TYPE_LABELS } from '../config.js';
import { data, dueCount, getTopicItems, typeColor } from '../state/store.js';

export function renderSidebar() {
  const el = document.getElementById('topicsList');
  if (!el) return;

  el.innerHTML = '<div class="section-label">Topics</div>';

  data.topics.forEach(topic => {
    const hasItems = data.items.some(i => i.topic_id === topic.id);
    const div = document.createElement('div');
    div.className = 'topic-item';
    div.id = 'titem-' + topic.id;

    const folders = TYPES.map(type => {
      const count = getTopicItems(topic.id, type).length;
      const due = dueCount(topic.id, type);
      return `<div class="folder-row" onclick="window.NetMind.showItemList('${topic.id}','${type}')">
        <div class="folder-dot" style="background:${typeColor(type)}"></div>
        <span>${TYPE_LABELS[type]}</span>
        <span class="folder-count ${due > 0 ? 'has-due' : ''}">${due > 0 ? due + ' due' : count}</span>
      </div>`;
    }).join('');

    div.innerHTML = `
      <div class="topic-header" onclick="window.NetMind.toggleTopic('${topic.id}')">
        <div class="topic-dot ${hasItems ? 'has-items' : ''}"></div>
        <span style="flex:1">${topic.name}</span>
        <button class="topic-review-btn" onclick="event.stopPropagation();window.NetMind.startReview('${topic.id}')" title="Review this topic">⟳</button>
        <button class="del-btn" onclick="event.stopPropagation();window.NetMind.deleteTopic('${topic.id}')">×</button>
        <span class="topic-chevron">▶</span>
      </div>
      <div class="topic-folders" id="folders-${topic.id}">${folders}</div>`;

    el.appendChild(div);
  });
}

export function toggleTopic(id) {
  document.getElementById('titem-' + id)?.classList.toggle('open');
}

export function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarBackdrop')?.classList.toggle('visible');
}

export function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarBackdrop')?.classList.remove('visible');
}

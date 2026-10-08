// ============================================================
// STORAGE & PERSISTENCE SERVICE (SUPABASE + OFFLINE FALLBACK)
// ============================================================
import { SB } from '../api/supabase.js';
import { STORAGE_KEYS, DEFAULT_DAILY_LIMIT } from '../config.js';
import { data, uiState, notifyStateChange } from '../state/store.js';

// Save snapshot to local storage
export function saveLocalBackup() {
  try {
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

// Load snapshot from local storage
export function loadLocalBackup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DATA);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    data.sessionCount = parsed.sessionCount || 0;
    data.lastSessionDate = parsed.lastSessionDate || '';
    data.streak = parsed.streak || 0;
    data.dailyNewLimit = parsed.dailyNewLimit ?? DEFAULT_DAILY_LIMIT;
    data.dailyNewSeen = parsed.dailyNewSeen || 0;
    data.dailyNewDate = parsed.dailyNewDate || '';
    data.topics = Array.isArray(parsed.topics) ? parsed.topics : [];
    data.items = Array.isArray(parsed.items) ? parsed.items : [];
    return true;
  } catch (e) {
    console.warn('LocalStorage load failed:', e);
    return false;
  }
}

// Offline queue management
function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to save offline queue:', e);
  }
}

export function queueOfflineOp(op) {
  const queue = getOfflineQueue();
  queue.push({ ...op, timestamp: Date.now() });
  saveOfflineQueue(queue);
  uiState.isOfflineMode = true;
  updateStatusIndicator();
}

// Replays queued offline changes to Supabase when reconnected
export async function syncOfflineQueue() {
  if (!navigator.onLine) return;
  const queue = getOfflineQueue();
  if (!queue.length) {
    uiState.isOfflineMode = false;
    updateStatusIndicator();
    return;
  }

  console.log(`[NetMind] Replaying ${queue.length} offline operations...`);
  const remaining = [];

  for (const op of queue) {
    try {
      if (op.type === 'saveMeta') {
        await SB.upsert('topics', {
          id: '__meta__',
          name: JSON.stringify(op.payload)
        });
      } else if (op.type === 'saveTopic') {
        await SB.upsert('topics', { id: op.payload.id, name: op.payload.name });
      } else if (op.type === 'saveItem') {
        await SB.upsert('items', op.payload);
      } else if (op.type === 'deleteItem') {
        await SB.delete('items', op.id);
      } else if (op.type === 'deleteTopic') {
        await SB.delete('topics', op.id);
      }
    } catch (e) {
      console.warn('[NetMind] Offline replay error for op:', op, e);
      remaining.push(op);
    }
  }

  saveOfflineQueue(remaining);
  uiState.isOfflineMode = remaining.length > 0;
  updateStatusIndicator();
}

export function updateStatusIndicator() {
  const el = document.getElementById('connectionStatus');
  if (!el) return;
  if (!navigator.onLine || uiState.isOfflineMode) {
    el.className = 'connection-status offline';
    const queue = getOfflineQueue();
    el.innerHTML = `<span class="connection-dot"></span> Offline${queue.length ? ` (${queue.length} pending)` : ''}`;
  } else {
    el.className = 'connection-status';
    el.innerHTML = `<span class="connection-dot"></span> Synced`;
  }
}

// Persistence operations
export async function saveMeta() {
  saveLocalBackup();
  const payload = {
    sessionCount: data.sessionCount,
    lastSessionDate: data.lastSessionDate,
    streak: data.streak,
    dailyNewLimit: data.dailyNewLimit,
    dailyNewSeen: data.dailyNewSeen,
    dailyNewDate: data.dailyNewDate
  };

  try {
    await SB.upsert('topics', {
      id: '__meta__',
      name: JSON.stringify(payload)
    });
    uiState.isOfflineMode = false;
  } catch (err) {
    console.warn('[NetMind] saveMeta failed to reach Supabase. Queuing offline:', err);
    queueOfflineOp({ type: 'saveMeta', payload });
  }
  updateStatusIndicator();
}

export async function saveTopic(topic) {
  saveLocalBackup();
  try {
    await SB.upsert('topics', { id: topic.id, name: topic.name });
    uiState.isOfflineMode = false;
  } catch (err) {
    console.warn('[NetMind] saveTopic failed to reach Supabase. Queuing offline:', err);
    queueOfflineOp({ type: 'saveTopic', payload: topic });
  }
  updateStatusIndicator();
}

export async function saveItem(item) {
  saveLocalBackup();
  const payload = {
    id: item.id,
    topic_id: item.topic_id,
    type: item.type,
    question: item.question,
    answer: item.answer || '',
    tags: item.tags || [],
    review: item.review
  };

  try {
    await SB.upsert('items', payload);
    uiState.isOfflineMode = false;
  } catch (err) {
    console.warn('[NetMind] saveItem failed to reach Supabase. Queuing offline:', err);
    queueOfflineOp({ type: 'saveItem', payload });
  }
  updateStatusIndicator();
}

export async function saveItemsBatch(items) {
  if (!items || !items.length) return;
  saveLocalBackup();

  const payloads = items.map(item => ({
    id: item.id,
    topic_id: item.topic_id,
    type: item.type,
    question: item.question,
    answer: item.answer || '',
    tags: item.tags || [],
    review: item.review
  }));

  try {
    await Promise.all(payloads.map(payload => SB.upsert('items', payload)));
    uiState.isOfflineMode = false;
  } catch (err) {
    console.warn('[NetMind] Batch save failed to reach Supabase. Queuing offline:', err);
    for (const payload of payloads) {
      queueOfflineOp({ type: 'saveItem', payload });
    }
  }
  updateStatusIndicator();
}

export async function deleteItemFromDB(itemId) {
  saveLocalBackup();
  try {
    await SB.delete('items', itemId);
  } catch (err) {
    console.warn('[NetMind] deleteItem failed. Queuing offline:', err);
    queueOfflineOp({ type: 'deleteItem', id: itemId });
  }
  updateStatusIndicator();
}

export async function deleteTopicFromDB(topicId, itemIds) {
  saveLocalBackup();
  try {
    for (const itemId of itemIds) {
      await SB.delete('items', itemId);
    }
    await SB.delete('topics', topicId);
  } catch (err) {
    console.warn('[NetMind] deleteTopic failed. Queuing offline:', err);
    queueOfflineOp({ type: 'deleteTopic', id: topicId });
  }
  updateStatusIndicator();
}

export async function bumpSession() {
  const today = new Date().toISOString().split('T')[0];
  if (data.lastSessionDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  data.streak =
    data.lastSessionDate === yesterday
      ? data.streak + 1
      : data.lastSessionDate === ''
      ? 1
      : 1;
  data.sessionCount++;
  data.lastSessionDate = today;
  await saveMeta();
}

export async function resetAllStatsInDB() {
  const blank = {
    sessions: 0,
    lastSession: -1,
    easeScore: 2.5,
    interval: 1,
    nextReviewSession: 0
  };

  // Reset in memory & local storage first
  for (const item of data.items) {
    item.review = { ...blank };
  }
  data.sessionCount = 0;
  data.lastSessionDate = '';
  data.streak = 0;
  data.dailyNewSeen = 0;
  data.dailyNewDate = '';
  saveLocalBackup();

  try {
    // Reset all items in Supabase in ONE request
    await SB.patch('items', 'id=neq.__none__', { review: blank });
  } catch (err) {
    console.warn('[NetMind] Remote reset failed (offline):', err);
    queueOfflineOp({ type: 'saveMeta', payload: { ...data } });
  }

  await saveMeta();
}

// Initial DB load with seamless offline fallback
export async function loadFromDB() {
  let loadedFromSupabase = false;

  try {
    const [topicRows, itemRows] = await Promise.all([
      SB.get('topics', 'order=created_at.asc'),
      SB.get('items', 'order=created_at.asc')
    ]);

    const metaRow = topicRows.find(t => t.id === '__meta__');
    if (metaRow) {
      try {
        const m = JSON.parse(metaRow.name);
        data.sessionCount = m.sessionCount || 0;
        data.lastSessionDate = m.lastSessionDate || '';
        data.streak = m.streak || 0;
        data.dailyNewLimit = m.dailyNewLimit ?? DEFAULT_DAILY_LIMIT;
        data.dailyNewSeen = m.dailyNewSeen || 0;
        data.dailyNewDate = m.dailyNewDate || '';
      } catch (e) {
        console.warn('Meta row parse error:', e);
      }
    }

    data.topics = topicRows
      .filter(t => t.id !== '__meta__')
      .map(t => ({ id: t.id, name: t.name }));

    data.items = itemRows.map(i => ({
      id: i.id,
      topic_id: i.topic_id,
      type: i.type,
      question: i.question || '',
      answer: i.answer || '',
      tags: i.tags || [],
      review: i.review || {
        sessions: 0,
        lastSession: -1,
        easeScore: 2.5,
        interval: 1,
        nextReviewSession: 0
      }
    }));

    loadedFromSupabase = true;
    uiState.isOfflineMode = false;
    saveLocalBackup(); // sync cache
  } catch (e) {
    console.warn('[NetMind] Could not connect to Supabase. Checking local cache...', e);
    const hasLocal = loadLocalBackup();
    if (hasLocal) {
      console.log('[NetMind] Loaded successfully from offline localStorage backup.');
      uiState.isOfflineMode = true;
    } else {
      // If no local data exists yet, keep initial empty data structure
      uiState.isOfflineMode = true;
    }
  }

  updateStatusIndicator();
  notifyStateChange();
  return loadedFromSupabase;
}

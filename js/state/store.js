// ============================================================
// CENTRAL APPLICATION STATE STORE
// ============================================================
import { DEFAULT_DAILY_LIMIT, TYPE_LABELS, TYPES } from '../config.js';

export const data = {
  sessionCount: 0,
  lastSessionDate: '',
  streak: 0,
  dailyNewLimit: DEFAULT_DAILY_LIMIT,
  dailyNewSeen: 0,
  dailyNewDate: '',
  topics: [],
  items: []
};

export const uiState = {
  currentView: 'dashboard',
  currentTopicId: null,
  currentType: null,
  isOnline: navigator.onLine,
  isOfflineMode: false
};

const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyStateChange() {
  for (const listener of listeners) {
    try {
      listener(data);
    } catch (e) {
      console.error('Listener error in store:', e);
    }
  }
}

// Helpers
export function uid() {
  return 'i' + Date.now() + Math.random().toString(36).slice(2, 5);
}

export function tuid() {
  return 't' + Date.now();
}

export function getTopic(topicId) {
  return data.topics.find(t => t.id === topicId);
}

export function getItem(itemId) {
  return data.items.find(i => i.id === itemId);
}

export function getTopicItems(topicId, type) {
  return data.items.filter(i => i.topic_id === topicId && i.type === type);
}

export function isNewCard(item) {
  return !item.review || item.review.sessions === 0;
}

export function isDue(item) {
  if (isNewCard(item)) return true;
  return !item.review.nextReviewSession || data.sessionCount >= item.review.nextReviewSession;
}

export function resetDailyNewIfNeeded() {
  const today = new Date().toISOString().split('T')[0];
  if (data.dailyNewDate !== today) {
    data.dailyNewSeen = 0;
    data.dailyNewDate = today;
  }
}

export function dueCount(topicId, type) {
  resetDailyNewIfNeeded();
  const items = getTopicItems(topicId, type);
  const reviewDue = items.filter(i => !isNewCard(i) && isDue(i)).length;
  const newAllowed = Math.max(0, data.dailyNewLimit - data.dailyNewSeen);
  const newDue = Math.min(items.filter(isNewCard).length, newAllowed);
  return reviewDue + newDue;
}

export function totalDue() {
  resetDailyNewIfNeeded();
  const reviewDue = data.items.filter(i => !isNewCard(i) && isDue(i)).length;
  const newAllowed = Math.max(0, data.dailyNewLimit - data.dailyNewSeen);
  const newDue = Math.min(data.items.filter(isNewCard).length, newAllowed);
  return reviewDue + newDue;
}

export function typeColor(type) {
  return (
    {
      atomic: 'var(--accent)',
      process: 'var(--warn)',
      problem: 'var(--weak)',
      reconstruction: 'var(--accent2)'
    }[type] || 'var(--text3)'
  );
}

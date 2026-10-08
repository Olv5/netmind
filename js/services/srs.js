// ============================================================
// SM-2 SPACED REPETITION ENGINE & QUEUE SCHEDULER
// ============================================================
import { data, isNewCard, isDue, resetDailyNewIfNeeded } from '../state/store.js';

/**
 * Calculates next interval in sessions based on SM-2 grade:
 * 0: Again -> 1 session
 * 1: Hard  -> interval * 1.2
 * 2: Good  -> interval * ease
 * 3: Easy  -> interval * ease * 1.3
 */
export function nextInterval(currentInterval, ease, grade) {
  if (grade === 0) return 1;
  if (grade === 1) return Math.max(1, Math.floor(currentInterval * 1.2));
  if (grade === 2) return Math.max(1, Math.floor(currentInterval * ease));
  return Math.max(1, Math.floor(currentInterval * ease * 1.3));
}

/**
 * Previews interval labels for grade buttons before user grades.
 */
export function previewIntervals(item) {
  const ease = item?.review?.easeScore ?? 2.5;
  const ci = item?.review?.interval ?? 1;
  const fmt = n => (n === 1 ? '1 session' : `${n} sessions`);
  return [0, 1, 2, 3].map(g => fmt(nextInterval(ci, ease, g)));
}

/**
 * Updates an item's review record with new grade
 */
export function updateItemReview(item, grade) {
  if (!item.review) {
    item.review = {
      sessions: 0,
      lastSession: -1,
      easeScore: 2.5,
      interval: 1,
      nextReviewSession: 0
    };
  }
  item.review.sessions++;
  item.review.lastSession = data.sessionCount;

  // Grade deltas: Again (-0.4), Hard (-0.15), Good (0), Easy (+0.2)
  const delta = [-0.4, -0.15, 0, 0.2][grade];
  item.review.easeScore = Math.max(1.2, Math.min(4.0, item.review.easeScore + delta));

  const ci = item.review.interval || 1;
  item.review.interval = nextInterval(ci, item.review.easeScore, grade);
  item.review.nextReviewSession = data.sessionCount + item.review.interval;
}

/**
 * Computes priority score for an item in the queue.
 * Items with higher priority are shown first.
 */
export function computePriority(item) {
  const gap = data.sessionCount - (item.review?.lastSession ?? -1);
  const effectiveGap = !item.review || item.review.sessions === 0 ? 3 : gap;
  return (effectiveGap * 1.5) / (item.review?.easeScore ?? 2.5);
}

/**
 * Builds the prioritized review queue based on topic, type, and daily limit
 */
export function buildReviewQueue(topicId = null, type = null, includeAll = false) {
  resetDailyNewIfNeeded();
  let pool = data.items;
  if (topicId) pool = pool.filter(i => i.topic_id === topicId);
  if (type) pool = pool.filter(i => i.type === type);

  if (includeAll) {
    return [...pool]
      .map(i => ({ ...i, priority: computePriority(i) }))
      .sort((a, b) => b.priority - a.priority);
  }

  const reviewDue = pool.filter(i => !isNewCard(i) && isDue(i));
  const newCards = pool.filter(isNewCard);
  const newAllowed = Math.max(0, data.dailyNewLimit - data.dailyNewSeen);
  const newToShow = newCards.slice(0, newAllowed);

  return [...reviewDue, ...newToShow]
    .map(i => ({ ...i, priority: computePriority(i) }))
    .sort((a, b) => b.priority - a.priority);
}

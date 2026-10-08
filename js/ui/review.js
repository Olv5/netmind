// ============================================================
// REVIEW SESSION UI COMPONENT
// ============================================================
import { data, getItem, getTopic, isNewCard } from '../state/store.js';
import { buildReviewQueue, previewIntervals, updateItemReview } from '../services/srs.js';
import { bumpSession, saveItem, saveMeta } from '../services/storage.js';
import { renderSidebar } from './sidebar.js';
import { renderDashboard } from './dashboard.js';

let reviewQueue = [];
let reviewIndex = 0;
let reviewResults = { graded: 0, skipped: 0, again: 0 };
let sessionBumped = false;
let reviewHistory = [];

export function startReview(topicId = null, type = null, includeAll = false) {
  reviewQueue = buildReviewQueue(topicId, type, includeAll);
  if (!reviewQueue.length) {
    alert('Nothing to review right now.');
    return;
  }

  reviewIndex = 0;
  reviewResults = { graded: 0, skipped: 0, again: 0 };
  sessionBumped = false;
  reviewHistory = [];

  const topic = topicId ? getTopic(topicId) : null;
  window.NetMind.showView('review');

  document.getElementById('topbarTitle').textContent = topic
    ? `Review: ${topic.name}`
    : 'Review Session';
  document.getElementById('reviewDone')?.classList.remove('visible');
  const reviewCard = document.getElementById('reviewCard');
  if (reviewCard) reviewCard.style.display = '';

  showReviewCard();
}

export function showReviewCard() {
  if (reviewIndex >= reviewQueue.length) {
    finishReview();
    return;
  }

  const totalOriginal = reviewQueue.filter(i => !i._requeued).length;
  const currentPos = reviewQueue.slice(0, reviewIndex + 1).filter(i => !i._requeued).length;
  const againCount = reviewQueue.slice(reviewIndex).filter(i => i._requeued).length;

  document.getElementById('progressFill').style.width = `${(reviewIndex / reviewQueue.length) * 100}%`;
  document.getElementById('progressText').textContent =
    againCount > 0
      ? `${currentPos} / ${totalOriginal} · ${againCount} again`
      : `${currentPos} / ${totalOriginal}`;

  document.getElementById('reviewTextarea').value = '';
  document.getElementById('gradeSection').classList.remove('visible');
  document.getElementById('btnBack').style.display = reviewIndex > 0 ? 'inline-block' : 'none';

  const item = reviewQueue[reviewIndex];
  const topic = getTopic(item.topic_id);

  const typePrompts = {
    atomic: 'Answer:',
    process: 'Trace:',
    problem: 'Solve:',
    reconstruction: 'Reconstruct from scratch:'
  };

  const typeBadge = document.getElementById('reviewType');
  typeBadge.className = `review-type t-${item.type}`;
  typeBadge.textContent = item._requeued
    ? `${item.type.toUpperCase()} · AGAIN`
    : item.type.toUpperCase();

  document.getElementById('reviewPrompt').textContent = item.question;
  document.getElementById('reviewContext').textContent = `${topic?.name || ''} · ${typePrompts[item.type] || 'Prompt:'}`;
}

export function revealAnswer() {
  const item = reviewQueue[reviewIndex];
  const sec = document.getElementById('gradeSection');
  const ans = document.getElementById('referenceAnswer');
  ans.textContent = item.answer || '(No reference answer set for this item)';

  const [ci0, ci1, ci2, ci3] = previewIntervals(item);
  document.getElementById('gd-0').textContent = ci0;
  document.getElementById('gd-1').textContent = ci1;
  document.getElementById('gd-2').textContent = ci2;
  document.getElementById('gd-3').textContent = ci3;

  sec.classList.add('visible');
  sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function skipCard() {
  const item = reviewQueue[reviewIndex];
  reviewHistory.push({ type: 'skip', itemId: item.id });
  reviewResults.skipped++;
  reviewQueue.push(item);
  reviewIndex++;
  showReviewCard();
}

export async function goBackCard() {
  if (reviewIndex <= 0 || !reviewHistory.length) return;
  const lastAction = reviewHistory.pop();

  if (lastAction.type === 'skip') {
    reviewQueue.pop();
    reviewIndex--;
    showReviewCard();
    return;
  }

  const live = getItem(lastAction.itemId);
  if (live && lastAction.prevReview) {
    live.review = { ...lastAction.prevReview };
    if (lastAction.wasNew) {
      data.dailyNewSeen = Math.max(0, data.dailyNewSeen - 1);
      await saveMeta();
    }
    await saveItem(live);
  }

  if (lastAction.grade === 0) {
    reviewResults.again = Math.max(0, reviewResults.again - 1);
    const reqIdx = reviewQueue.findIndex(
      (i, idx) => idx > reviewIndex && i.id === lastAction.itemId && i._requeued
    );
    if (reqIdx !== -1) reviewQueue.splice(reqIdx, 1);
  }

  reviewResults.graded = Math.max(0, reviewResults.graded - 1);
  reviewIndex--;
  document.getElementById('gradeSection').classList.remove('visible');
  renderSidebar();
  showReviewCard();
}

export async function gradeCard(grade) {
  if (!sessionBumped) {
    await bumpSession();
    sessionBumped = true;
  }

  const item = reviewQueue[reviewIndex];
  const live = getItem(item.id);

  if (live) {
    const wasNew = isNewCard(live);
    reviewHistory.push({
      itemId: live.id,
      grade,
      prevReview: { ...live.review },
      wasNew
    });

    updateItemReview(live, grade);

    if (wasNew) {
      data.dailyNewSeen++;
      await saveMeta();
    }
    await saveItem(live);
  }

  await saveMeta();

  if (grade === 0) {
    reviewResults.again++;
    if (!item._requeued) {
      const insertAt = Math.min(reviewIndex + 1 + 10, reviewQueue.length);
      reviewQueue.splice(insertAt, 0, { ...item, _requeued: true });
    }
  }

  reviewResults.graded++;
  reviewIndex++;
  document.getElementById('gradeSection').classList.remove('visible');
  renderSidebar();
  showReviewCard();
}

export function finishReview() {
  document.getElementById('reviewCard').style.display = 'none';
  document.getElementById('reviewDone').classList.add('visible');
  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('progressText').textContent = 'Done';

  const streakMsg =
    data.streak >= 2
      ? `\n\n🔥 ${data.streak} day streak — keep it going!`
      : `\n\nDay 1 — come back tomorrow to start a streak.`;

  document.getElementById('doneSub').textContent =
    `${reviewResults.graded} reviewed · ${reviewResults.skipped} skipped · ${reviewResults.again} marked Again${streakMsg}`;

  renderDashboard();
}

// ============================================================
// BULK IMPORT PARSER SERVICE
// ============================================================
import { TYPES } from '../config.js';

export const BULK_TEMPLATE_EXAMPLE = `Q: What is a MAC address?
A: Media Access Control address — a 48-bit physical hardware identifier on the link layer.
type: atomic
tags: layer2, hardware

---

Q: Describe the ARP resolution process.
A: 1. Host checks local ARP cache.
2. If absent, sends broadcast frame: "Who has IP X? Tell IP Y".
3. Target host replies with unicast frame containing its MAC.
4. Sender caches the MAC in its ARP table.
type: process
tags: arp, ethernet

---

Q: Host A cannot ping Host B on the same subnet. How to isolate?
A: Check IP/mask on both hosts, verify link state on switch ports, inspect ARP cache on Host A for Host B's MAC.
type: problem`;

/**
 * Parses raw text into structured flashcards using Format A:
 * Q: <question>
 * A: <answer>
 * type: atomic | process | problem | reconstruction
 * tags: tag1, tag2
 * --- (card divider)
 */
export function parseBulkCards(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const cards = [];
  const lines = rawText.split(/\r?\n/);

  let currentCard = null;
  let currentField = null; // 'q' | 'a'

  function commitCard() {
    if (!currentCard) return;

    const q = (currentCard.question || '').trim();
    const a = (currentCard.answer || '').trim();

    // If card has some content
    if (q || a) {
      let type = (currentCard.type || '').toLowerCase().trim();
      if (!TYPES.includes(type)) {
        type = 'atomic';
      }

      const tags = Array.from(new Set(currentCard.tags.map(t => t.trim()).filter(Boolean)));

      cards.push({
        question: q,
        answer: a,
        type,
        tags,
        isValid: Boolean(q && a),
        error: !q ? 'Missing question' : !a ? 'Missing answer' : null
      });
    }

    currentCard = null;
    currentField = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Divider line: --- or === or ***
    if (/^[-=*_]{3,}$/.test(trimmed)) {
      commitCard();
      continue;
    }

    // Question start: Q: or Question:
    const qMatch = line.match(/^(\s*(?:Q|Question)\s*:\s*)(.*)$/i);
    if (qMatch) {
      if (currentCard && (currentCard.question || currentCard.answer)) {
        commitCard();
      }
      currentCard = { question: qMatch[2], answer: '', type: '', tags: [] };
      currentField = 'q';
      continue;
    }

    // Answer start: A: or Answer:
    const aMatch = line.match(/^(\s*(?:A|Answer)\s*:\s*)(.*)$/i);
    if (aMatch) {
      if (!currentCard) {
        currentCard = { question: '', answer: '', type: '', tags: [] };
      }
      currentCard.answer = aMatch[2];
      currentField = 'a';
      continue;
    }

    // Type specifier: type: or Type:
    const tMatch = line.match(/^(\s*type\s*:\s*)(.*)$/i);
    if (tMatch) {
      if (!currentCard) {
        currentCard = { question: '', answer: '', type: '', tags: [] };
      }
      currentCard.type = tMatch[2].trim().toLowerCase();
      currentField = null;
      continue;
    }

    // Tags specifier: tag: or tags:
    const tagMatch = line.match(/^(\s*tags?\s*:\s*)(.*)$/i);
    if (tagMatch) {
      if (!currentCard) {
        currentCard = { question: '', answer: '', type: '', tags: [] };
      }
      const rawTags = tagMatch[2].split(',').map(t => t.trim()).filter(Boolean);
      currentCard.tags.push(...rawTags);
      currentField = null;
      continue;
    }

    // Continuation of multi-line question or answer
    if (currentCard && currentField === 'q') {
      currentCard.question += (currentCard.question ? '\n' : '') + line;
    } else if (currentCard && currentField === 'a') {
      currentCard.answer += (currentCard.answer ? '\n' : '') + line;
    }
  }

  commitCard();
  return cards;
}

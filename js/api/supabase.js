// ============================================================
// SUPABASE REST CLIENT
// ============================================================
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

export const SB = {
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  },

  async get(table, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${params ? `?${params}` : ''}`;
    const r = await fetch(url, { headers: this.headers });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Supabase GET error (${r.status}): ${err}`);
    }
    return r.json();
  },

  async upsert(table, row) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(row)
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Supabase UPSERT error (${r.status}): ${err}`);
    }
  },

  async patch(table, params, body) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { ...this.headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Supabase PATCH error (${r.status}): ${err}`);
    }
  },

  async delete(table, id) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    const r = await fetch(url, {
      method: 'DELETE',
      headers: this.headers
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Supabase DELETE error (${r.status}): ${err}`);
    }
  }
};

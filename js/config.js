// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================

export const SUPABASE_URL = 'https://rmcghljmwtzbykyqeoim.supabase.co/';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtY2dobGptd3R6YnlreXFlb2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NzQ3OTEsImV4cCI6MjA4NzM1MDc5MX0.2r1loObmpbrDSpzBaUK-H-djQmODyK0WbfxarJPn6gc';

export const TYPE_LABELS = {
  atomic: 'Atomic',
  process: 'Process',
  problem: 'Problem',
  reconstruction: 'Reconstruction'
};

export const TYPES = ['atomic', 'process', 'problem', 'reconstruction'];

export const STORAGE_KEYS = {
  DATA: 'netmind_data_v1',
  QUEUE: 'netmind_offline_sync_queue_v1'
};

export const DEFAULT_DAILY_LIMIT = 20;

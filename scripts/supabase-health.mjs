// Check PostgREST's database-backed schema endpoint without reading private tables.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
const endpoint = new URL('/rest/v1/', url);
if (endpoint.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
const response = await fetch(endpoint, {
  headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) },
  signal: AbortSignal.timeout(20000),
});
if (!response.ok) throw new Error(`Supabase database health check failed: HTTP ${response.status}`);
await response.json();
console.log('Supabase database is reachable.');

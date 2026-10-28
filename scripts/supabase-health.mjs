// Exercise the database API without granting anonymous access to private tables.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
const endpoint = new URL('/rest/v1/courses?select=id&limit=0', url);
if (endpoint.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
const response = await fetch(endpoint, {
  headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) },
  signal: AbortSignal.timeout(20000),
});
const body = await response.json();
// PostgreSQL permission denial also proves the request reached the database.
// Reject invalid keys, unavailable projects, and all other failures.
if (!response.ok && !(response.status === 401 && body.code === '42501')) {
  throw new Error(`Supabase database health check failed: HTTP ${response.status}`);
}
console.log('Supabase database is reachable.');

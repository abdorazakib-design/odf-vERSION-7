import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
    if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

// Supabase JS client doesn't allow executing arbitrary SQL statements directly through the normal REST API.
// But we can check if we can run it or if we have another way, or we can use postgres package.
// Since we don't have postgres package, we can run SQL via REST API if we have the postgres endpoint,
// but wait! We can just write a script that connects to the database via postgres if we have the connection string.
// Let's check if the connection string is in .env or if we can use the supabase REST API (we cannot run arbitrary SQL unless we use RPC).
// Let's check what is in .env.
console.log("Supabase URL:", url);

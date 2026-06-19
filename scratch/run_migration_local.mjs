import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    });
    
    await client.connect();
    
    const sql = fs.readFileSync('supabase/migrations/master_migration.sql', 'utf-8');
    
    console.log("Running migration on local postgres...");
    try {
        await client.query(sql);
        console.log("SUCCESS! Migration completed with no errors.");
    } catch (err) {
        console.error("ERROR running migration:", err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

main();

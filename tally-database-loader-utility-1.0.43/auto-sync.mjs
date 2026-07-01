import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run sync every 3 minutes
const SYNC_INTERVAL = 3 * 60 * 1000; 

function runSync() {
    console.log(`\n======================================================`);
    console.log(`[${new Date().toLocaleString()}] Starting Tally Sync...`);
    
    // We use child_process so it handles memory and exits properly
    const child = spawn('node', ['./dist/index.mjs'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    child.on('close', (code) => {
        console.log(`[${new Date().toLocaleString()}] Sync finished (code ${code}). Next sync in ${SYNC_INTERVAL / 1000}s.`);
        setTimeout(runSync, SYNC_INTERVAL);
    });

    child.on('error', (err) => {
        console.error(`[${new Date().toLocaleString()}] Error starting sync process:`, err);
        setTimeout(runSync, SYNC_INTERVAL);
    });
}

// Start the first sync immediately
runSync();

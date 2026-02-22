/**
 * Worker Server — Standalone process that runs all BullMQ workers
 * 
 * Run with: npm run workers  (or: npx tsx lib/queue/worker-server.ts)
 */

import { createPRDWorker } from './workers/prd-worker';
import { createBuildWorker } from './workers/build-worker';

console.log('══════════════════════════════════════════════');
console.log('  ProductHive V2 — Worker Server              ');
console.log('══════════════════════════════════════════════');
console.log(`  Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log('  Workers: PRD Generation, Build Pipeline');
console.log('══════════════════════════════════════════════');

const prdWorker = createPRDWorker();
const buildWorker = createBuildWorker();

console.log('[Worker Server] PRD worker started');
console.log('[Worker Server] Build worker started');

// Graceful shutdown
async function shutdown() {
    console.log('\n[Worker Server] Shutting down gracefully...');

    await Promise.all([
        prdWorker.close(),
        buildWorker.close(),
    ]);

    console.log('[Worker Server] All workers stopped. Goodbye!');
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

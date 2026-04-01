/**
 * File: packages/db/prisma/seed.ts
 *
 * E2E Seed Script for Soft Analytics Gateway
 * -------------------------------------------
 * This script populates the PostgreSQL database with a known-good
 * dataset that enables end-to-end integration testing without
 * requiring manual API calls.
 *
 * Run:  npm run seed               (from packages/db)
 *       npm run db:push:seed       (from packages/db — migrate + seed in one step)
 *
 * WARNING: This script uses `createHash` to pre-compute test hashes
 * so that the Redis cache values for the Data Plane validator are
 * predictable and documented. Do NOT use test keys in production.
 */

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateKey(): {
  secretKey: string;
  prefix: string;
  hash: string;
} {
  const token = randomBytes(32).toString('hex');
  const secretKey = `sk_live_${token}`;
  const prefix = secretKey.substring(0, 15);
  const hash = createHash('sha256').update(secretKey).digest('hex');
  return { secretKey, prefix, hash };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ── 1. Users ────────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@soft-analytics.dev' },
    update: {},
    create: { email: 'admin@soft-analytics.dev' },
  });

  const devUser = await prisma.user.upsert({
    where: { email: 'dev@soft-analytics.dev' },
    update: {},
    create: { email: 'dev@soft-analytics.dev' },
  });

  console.log(`✅ Users seeded:`);
  console.log(`   admin: ${adminUser.id}`);
  console.log(`   dev:   ${devUser.id}\n`);

  // ── 2. Endpoints ────────────────────────────────────────────────────────────
  const endpointDefs = [
    {
      name: 'HTTPBin GET Test',
      path: '/test/get',
      targetUrl: 'https://httpbin.org/get',
      method: 'GET',
      rateLimitRpm: 100,
    },
    {
      name: 'HTTPBin POST Test',
      path: '/test/post',
      targetUrl: 'https://httpbin.org/post',
      method: 'POST',
      rateLimitRpm: 60,
    },
    {
      name: 'JSONPlaceholder Users',
      path: '/test/users',
      targetUrl: 'https://jsonplaceholder.typicode.com/users',
      method: 'GET',
      rateLimitRpm: 200,
    },
  ];

  const createdEndpoints = [];
  for (const def of endpointDefs) {
    const endpoint = await prisma.endpoint.upsert({
      where: {
        path_method: { path: def.path, method: def.method },
      },
      update: {},
      create: {
        name: def.name,
        path: def.path,
        targetUrl: def.targetUrl,
        method: def.method,
        rules: {
          create: {
            rateLimitRpm: def.rateLimitRpm,
            retryCount: 2,
            backoffMultiplier: 1.5,
          },
        },
      },
      include: { rules: true },
    });
    createdEndpoints.push(endpoint);
    console.log(`✅ Endpoint: ${endpoint.method} ${endpoint.path} → ${endpoint.id}`);
  }

  // ── 3. API Keys ─────────────────────────────────────────────────────────────
  const adminKey = generateKey();
  const devKey = generateKey();

  const keyDefs = [
    {
      name: 'Admin Integration Test Key',
      ...adminKey,
      scopes: ['read', 'write', 'admin'],
      createdBy: adminUser.id,
    },
    {
      name: 'Dev Read-Only Test Key',
      ...devKey,
      scopes: ['read'],
      createdBy: devUser.id,
    },
  ];

  console.log('\n⚠️  PLAINTEXT KEYS (save these — they will not be shown again):\n');
  console.log('─'.repeat(80));

  for (const keyDef of keyDefs) {
    await prisma.key.upsert({
      where: { hash: keyDef.hash },
      update: {},
      create: {
        name: keyDef.name,
        prefix: keyDef.prefix,
        hash: keyDef.hash,
        scopes: keyDef.scopes,
        createdBy: keyDef.createdBy,
      },
    });

    console.log(`\n  Name   : ${keyDef.name}`);
    console.log(`  Key    : ${keyDef.secretKey}`);
    console.log(`  Prefix : ${keyDef.prefix}`);
    console.log(`  Scopes : ${keyDef.scopes.join(', ')}`);
    console.log('\n  Redis HSET command (run manually if needed):');
    console.log(
      `  HSET key_prefix:${keyDef.prefix} hash ${keyDef.hash} scopes ${keyDef.scopes.join(',')} status active`,
    );
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n✅ Seed complete.\n');
  console.log('📋 Next Steps:');
  console.log('   1. Start Redis, then start the Control Plane (npm run start:dev)');
  console.log('   2. POST /api/keys with the credentials above to auto-sync Redis cache');
  console.log('   3. OR run the HSET commands above manually against your Redis instance');
  console.log('   4. Start the Data Plane: cd apps/data-plane && go run main.go');
  console.log('   5. Open http://localhost:3001 and navigate to any Endpoint Detail page\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

#!/usr/bin/env node
/**
 * Phase 0 infrastructure verification script.
 * Confirms: docker services healthy; Redis noeviction; Postgres reachable.
 */
import { execSync } from 'node:child_process';

function fail(msg) {
  console.error('VERIFY FAIL:', msg);
  process.exit(1);
}

// Check Docker services
try {
  const compose = execSync('docker compose ps --format "{{.Service}}:{{.Status}}"', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
  console.log('Compose status:', compose);
} catch (e) {
  fail('docker compose not healthy');
}

// Check Redis maxmemory-policy
try {
  const policy = execSync('docker compose exec -T redis redis-cli CONFIG GET maxmemory-policy', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
  const lines = policy.split('\n');
  if (!lines.some(l => l.includes('noeviction'))) {
    fail('Redis maxmemory-policy is NOT noeviction: ' + policy);
  }
  console.log('Redis policy OK:', policy);
} catch (e) {
  fail('Redis policy check failed: ' + e.message);
}

// Check Postgres reachable
try {
  execSync('docker compose exec -T postgres pg_isready -U chronos -d chronos', { stdio: 'inherit' });
  console.log('Postgres OK');
} catch (e) {
  fail('Postgres not reachable');
}

console.log('Phase 0 infra verification passed.');

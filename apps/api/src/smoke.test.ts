import { test, expect } from 'vitest';

test('app module exports AppModule', async () => {
  const mod = await import('./app.module.js');
  expect(mod.AppModule).toBeDefined();
});

test('auth guard exists', async () => {
  const guard = await import('./auth/auth.guard.js');
  expect(guard.AuthGuard).toBeDefined();
});

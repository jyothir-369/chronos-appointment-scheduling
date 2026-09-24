import { defineConfig } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default defineConfig([
  {
    ignores: ['**/dist/', '**/.next/', '**/node_modules/', '**/*.js', 'scripts/'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname || '.',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Phase 0: ban raw Date math everywhere except clock adapter
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      'no-restricted-globals': ['error',
        { 'name': 'Date', 'message': 'Use Clock / Temporal instead of Date' },
        { 'names': ['moment', 'dayjs'], 'message': 'Use Temporal / Clock / ESM imports only' },
      ],
      'no-restricted-syntax': ['error',
        { 'selector': 'NewExpression[callee.name="Date"]', 'message': 'Use Clock / Temporal, not new Date()' },
        { 'selector': 'CallExpression[callee.object.name="Date"][callee.property.name="now"]', 'message': 'Use Clock / Temporal, not Date.now()' },
      ],
      // Ban cron / schedule outside adapter
      'no-restricted-imports': ['error',
        { 'paths': ['node-cron', '@nestjs/schedule', 'moment', 'dayjs', 'date-fns-tz'] },
      ],
      'no-restricted-globals': ['error',
        { 'name': 'require', 'message': 'Use Temporal / Clock / ESM imports only' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
    },
  },
]);

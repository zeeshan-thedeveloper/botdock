import base from './base.js';

export default [
  ...base,
  {
    ignores: ['next-env.d.ts'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];

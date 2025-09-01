// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tailwind from 'eslint-plugin-tailwindcss';

export default [
    // foldere ignorate
    { ignores: ['dist', 'build', '.next', 'coverage', 'node_modules'] },

    // Config de bază pentru TS cu type-check
    ...tseslint.configs.recommendedTypeChecked, // include parser & rules
    // Dacă nu vrei type-check (mai rapid), folosește: ...tseslint.configs.recommended

    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            // Dacă ai tsconfig la rădăcină, parser-ul îl detectează cu projectService
            parserOptions: {
                projectService: true, // alternativ: project: ['./tsconfig.json']
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooks,
            'jsx-a11y': jsxA11y,
            tailwindcss: tailwind,
        },
        settings: {
            react: { version: 'detect' },
            tailwindcss: { callees: ['cn'] }, // dacă ai helper de cls
        },
        rules: {
            ...js.configs.recommended.rules,

            // React
            'react/jsx-uses-react': 'off',
            'react/react-in-jsx-scope': 'off',
            ...reactHooks.configs.recommended.rules,

            // Tailwind (opțional)
            'tailwindcss/classnames-order': 'warn',
            'tailwindcss/no-custom-classname': 'off',

            // TypeScript
            '@typescript-eslint/no-explicit-any': 'warn', // sau 'off' dacă vrei
            '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
            '@typescript-eslint/consistent-type-imports': 'warn',
        },
    },

    // Excepții locale (ex: per fișier) – utile pt. API client legacy
    {
        files: [
            'src/lib/apiClient.ts',
            'src/**/__tests__/**/*',
        ],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
];

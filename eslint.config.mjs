// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tailwind from 'eslint-plugin-tailwindcss'
import nextPlugin from '@next/eslint-plugin-next'

export default [
    // foldere ignorate
    { ignores: ['dist', 'build', '.next', 'coverage', 'node_modules'] },

    // Config de bază pentru TS cu type-check
    ...tseslint.configs.recommendedTypeChecked,

    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        languageOptions: {
            parserOptions: {
                // projectService e recomandat cu TS-ESLint pe ESLint v9+
                projectService: true,
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
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
            // important: pluginul next este @next/next
            '@next/next': nextPlugin,
        },
        settings: {
            react: { version: 'detect' },
            tailwindcss: { callees: ['cn'] },
        },
        rules: {
            // JS recommended
            ...js.configs.recommended.rules,

            // React
            'react/jsx-uses-react': 'off',
            'react/react-in-jsx-scope': 'off',
            ...reactHooks.configs.recommended.rules,

            // A11y
            // (jsx-a11y nu are preset oficial “recommended” exportat în flat; adaugă reguli specifice dacă dorești)

            // Tailwind
            'tailwindcss/classnames-order': 'warn',
            'tailwindcss/no-custom-classname': 'off',

            // TypeScript
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
            '@typescript-eslint/consistent-type-imports': 'warn',

            // Next.js “core-web-vitals”
            // folosim presetul pluginului Next și îi aplicăm regulile
            ...(nextPlugin.configs['core-web-vitals']?.rules ?? {}),
        },
    },

    // Excepții locale (ex: per fișier)
    {
        files: [
            'src/lib/apiClient.ts',
            'src/**/__tests__/**/*',
        ],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
]

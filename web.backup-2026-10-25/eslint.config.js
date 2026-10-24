import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const platformNames = [
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource',
  'localStorage', 'sessionStorage', 'indexedDB', 'open', 'confirm',
  'showDirectoryPicker', 'showOpenFilePicker', 'showSaveFilePicker',
]
const adapterImports = '(^|/)(adapters?(/|$)|__mocks__(/|$)|__fixtures__(/|$)|mocks?([-./]|$)|fixtures?([-./]|$))|^(@tauri-apps/|electron(/|$)|@capacitor/|node:|fs(/|$)|child_process(/|$))'
const interfaceMessage = 'Use an injected interface; platform access and fixtures belong in adapters.'
const globalNavigator = 'MemberExpression[object.type="MemberExpression"][object.object.name=/^(window|self|globalThis)$/]:matches([object.property.name="navigator"],[object.property.value="navigator"])'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/components/beui/**', 'src/lib/beui/**'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // beUI source provenance and adaptations: scripts/beui-catalog.json.
    // TypeScript checks every catalog module; product rules above remain unchanged.
    files: ['src/components/beui/**/*.{ts,tsx}', 'src/lib/beui/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser, globals: globals.browser },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-unexpected-multiline': 'off',
      'no-useless-assignment': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/adapters/**', 'src/main.tsx', 'src/bootstrap*.{ts,tsx}', 'src/bootstrap/**', 'src/components/beui/**', 'src/lib/beui/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ regex: adapterImports, message: interfaceMessage }],
      }],
      'no-restricted-globals': ['error', {
        globals: platformNames.map(name => ({ name, message: interfaceMessage })),
        checkGlobalObject: true,
      }],
      'no-restricted-properties': ['error',
        { object: 'navigator', property: 'clipboard', message: interfaceMessage },
        { object: 'navigator', property: 'storage', message: interfaceMessage },
      ],
      'no-restricted-syntax': ['error',
        { selector: `ImportExpression[source.value=/${adapterImports.replaceAll('/', '\\u002F')}/]`, message: interfaceMessage },
        { selector: `VariableDeclarator[init.name=/^(window|self|globalThis)$/] > ObjectPattern > Property:matches([key.name=/^(${platformNames.join('|')})$/],[key.value=/^(${platformNames.join('|')})$/])`, message: interfaceMessage },
        { selector: `${globalNavigator}:matches([property.name=/^(clipboard|storage)$/],[property.value=/^(clipboard|storage)$/])`, message: interfaceMessage },
      ],
    },
  },
])

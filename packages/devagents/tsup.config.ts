import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    mcp: 'src/mcp.ts',
    acp: 'src/acp.ts',
  },
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
})

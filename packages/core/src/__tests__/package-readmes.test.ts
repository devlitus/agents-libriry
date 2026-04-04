import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Package READMEs', () => {
  describe('core/README.md', () => {
    const path = join(process.cwd(), 'packages/core/README.md')

    it('exists', () => {
      expect(existsSync(path)).toBe(true)
    })

    it('contains Orchestrator', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('Orchestrator')
    })

    it('contains agents', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('agents')
    })

    it('contains indexer', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('indexer')
    })

    it('contains memory', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('memory')
    })

    it('contains LLM', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('LLM')
    })
  })

  describe('acp/README.md', () => {
    const path = join(process.cwd(), 'packages/acp/README.md')

    it('exists', () => {
      expect(existsSync(path)).toBe(true)
    })

    it('contains ACP', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('ACP')
    })

    it('contains Zed', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('Zed')
    })

    it('contains JetBrains', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('JetBrains')
    })

    it('contains VS Code', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('VS Code')
    })

    it('contains transport', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('transport')
    })
  })

  describe('mcp/README.md', () => {
    const path = join(process.cwd(), 'packages/mcp/README.md')

    it('exists', () => {
      expect(existsSync(path)).toBe(true)
    })

    it('contains MCP', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('MCP')
    })

    it('contains Claude Code', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('Claude Code')
    })

    it('contains Cursor', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('Cursor')
    })

    it('contains Copilot', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('Copilot')
    })

    it('contains transport', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('transport')
    })
  })

  describe('cli/README.md', () => {
    const path = join(process.cwd(), 'packages/cli/README.md')

    it('exists', () => {
      expect(existsSync(path)).toBe(true)
    })

    it('contains setup', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('setup')
    })

    it('contains check', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('check')
    })

    it('contains init-ide', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('init-ide')
    })

    it('contains commands', () => {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('commands')
    })
  })
})

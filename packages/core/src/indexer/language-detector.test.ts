import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectLanguage, findConfigFiles } from './language-detector.js';

// Fake filesystem for fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('findConfigFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no config files exist', async () => {
    // Arrange
    const { stat } = await import('fs/promises');
    vi.mocked(stat).mockRejectedValue(new Error('ENOENT'));

    // Act
    const result = await findConfigFiles('/fake/project');

    // Assert
    expect(result).toEqual([]);
  });

  it('returns only existing config files', async () => {
    // Arrange
    const { stat } = await import('fs/promises');
    // Mock: only package.json exists; all others throw ENOENT
    vi.mocked(stat).mockImplementation(async (path: string | Buffer | URL) => {
      const p = path.toString();
      if (p.includes('package.json')) return { isFile: () => true } as any;
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    // Act
    const result = await findConfigFiles('/fake/project');

    // Assert
    expect(result).toContain('package.json');
    expect(result).not.toContain('.gitignore');
  });

  it('returns multiple config files when all exist', async () => {
    // Arrange
    const { stat } = await import('fs/promises');
    vi.mocked(stat).mockResolvedValue({} as any);

    // Act
    const result = await findConfigFiles('/fake/project');

    // Assert
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('package.json');
    expect(result).toContain('tsconfig.json');
    expect(result).toContain('Cargo.toml');
  });
});

describe('detectLanguage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns generic language when no config files provided', async () => {
    // Act
    const result = await detectLanguage('/fake/project', []);

    // Assert
    expect(result.language).toBe('generic');
    expect(result.framework).toBeNull();
    expect(result.configFiles).toEqual([]);
  });

  it('detects TypeScript from package.json with typescript dependency', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      dependencies: { express: '^4.18.0' },
      devDependencies: { typescript: '^5.0.0' },
    }));

    // Act
    const result = await detectLanguage('/fake/project', ['package.json']);

    // Assert
    expect(result.language).toBe('typescript');
    expect(result.configFiles).toContain('package.json');
  });

  it('detects JavaScript from package.json without typescript', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      dependencies: { express: '^4.18.0' },
    }));

    // Act
    const result = await detectLanguage('/fake/project', ['package.json']);

    // Assert
    expect(result.language).toBe('javascript');
  });

  it('detects React framework from package.json', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      dependencies: { 'react-scripts': '5.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    }));

    // Act
    const result = await detectLanguage('/fake/project', ['package.json']);

    // Assert
    expect(result.framework).toBe('react');
  });

  it('detects Express framework from package.json', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      dependencies: { express: '^4.18.0' },
      devDependencies: { typescript: '^5.0.0' },
    }));

    // Act
    const result = await detectLanguage('/fake/project', ['package.json']);

    // Assert
    expect(result.framework).toBe('express');
  });

  it('detects NestJS framework from package.json', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      dependencies: { '@nestjs/core': '^10.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    }));

    // Act
    const result = await detectLanguage('/fake/project', ['package.json']);

    // Assert
    expect(result.framework).toBe('nestjs');
  });

  it('detects Python language from pyproject.toml', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('');

    // Act
    const result = await detectLanguage('/fake/project', ['pyproject.toml']);

    // Assert
    expect(result.language).toBe('python');
  });

  it('detects FastAPI framework from pyproject.toml', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('fastapi>=0.100.0\nother-dep');

    // Act
    const result = await detectLanguage('/fake/project', ['pyproject.toml']);

    // Assert
    expect(result.framework).toBe('fastapi');
  });

  it('detects Django framework from requirements.txt', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('django>=4.0.0\ndjangorestframework');

    // Act
    const result = await detectLanguage('/fake/project', ['requirements.txt']);

    // Assert
    expect(result.framework).toBe('django');
  });

  it('detects Rust language from Cargo.toml', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('');

    // Act
    const result = await detectLanguage('/fake/project', ['Cargo.toml']);

    // Assert
    expect(result.language).toBe('rust');
  });

  it('detects Axum framework from Cargo.toml', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('axum = "0.7.0"');

    // Act
    const result = await detectLanguage('/fake/project', ['Cargo.toml']);

    // Assert
    expect(result.framework).toBe('axum');
  });

  it('detects Actix framework from Cargo.toml', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue("actix-web = '4.0'");

    // Act
    const result = await detectLanguage('/fake/project', ['Cargo.toml']);

    // Assert
    expect(result.framework).toBe('actix');
  });

  it('detects Go language from go.mod', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('module myproject\n\ngo 1.21');

    // Act
    const result = await detectLanguage('/fake/project', ['go.mod']);

    // Assert
    expect(result.language).toBe('go');
  });

  it('detects Gin framework from go.mod', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('module myproject\n\nrequire github.com/gin-gonic/gin v1.9.0');

    // Act
    const result = await detectLanguage('/fake/project', ['go.mod']);

    // Assert
    expect(result.framework).toBe('gin');
  });

  it('detects Echo framework from go.mod', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('module myproject\n\nrequire github.com/labstack/echo v4.0.0');

    // Act
    const result = await detectLanguage('/fake/project', ['go.mod']);

    // Assert
    expect(result.framework).toBe('echo');
  });

  it('detects Java language from pom.xml', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('<?xml version="1.0"?>\n<project></project>');

    // Act
    const result = await detectLanguage('/fake/project', ['pom.xml']);

    // Assert
    expect(result.language).toBe('java');
  });

  it('detects Spring framework from pom.xml', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('<?xml version="1.0"?>\n<project>\n<dependency>\n<groupId>org.springframework.boot</groupId>\n</dependency>\n</project>');

    // Act
    const result = await detectLanguage('/fake/project', ['pom.xml']);

    // Assert
    expect(result.framework).toBe('spring');
  });

  it('detects Kotlin language from build.gradle', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('');

    // Act
    const result = await detectLanguage('/fake/project', ['build.gradle']);

    // Assert
    expect(result.language).toBe('kotlin');
  });

  it('detects Spring framework from build.gradle', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('dependencies {\n  implementation "org.springframework.boot:spring-boot-starter"\n}');

    // Act
    const result = await detectLanguage('/fake/project', ['build.gradle']);

    // Assert
    expect(result.framework).toBe('spring');
  });

  it('detects PHP language from composer.json', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      require: { php: '^8.1' },
    }));

    // Act
    const result = await detectLanguage('/fake/project', ['composer.json']);

    // Assert
    expect(result.language).toBe('php');
  });

  it('detects Laravel framework from composer.json', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      require: {
        php: '^8.1',
        'laravel/framework': '^10.0',
      },
    }));

    // Act
    const result = await detectLanguage('/fake/project', ['composer.json']);

    // Assert
    expect(result.framework).toBe('laravel');
  });

  it('skips config files that cannot be read', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

    // Act
    const result = await detectLanguage('/fake/project', ['package.json']);

    // Assert
    expect(result.language).toBe('generic');
    expect(result.configFiles).not.toContain('package.json');
  });

  it('returns multiple config files in result', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile)
      .mockResolvedValueOnce(JSON.stringify({ dependencies: {} }))
      .mockResolvedValueOnce('');

    // Act
    const result = await detectLanguage('/fake/project', ['package.json', 'Cargo.toml']);

    // Assert
    expect(result.configFiles).toContain('package.json');
    expect(result.configFiles).toContain('Cargo.toml');
  });

  it('uses @types/node to detect TypeScript', async () => {
    // Arrange
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      dependencies: { express: '^4.18.0' },
      devDependencies: { '@types/node': '^20.0.0' },
    }));

    // Act
    const result = await detectLanguage('/fake/project', ['package.json']);

    // Assert
    expect(result.language).toBe('typescript');
  });
});

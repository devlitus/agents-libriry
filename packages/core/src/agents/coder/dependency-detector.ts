export function detectDependencies(code: string, packageJsonContent?: string): string[] {
  const deps = new Set<string>();
  
  // A simple regex to detect ES imports and requires
  const importRegex = /import\s+(?:(?:\*\s+as\s+\w+|[\w\s{},*]+)\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    if (!match[1].startsWith('.')) {
      // Get the package name (handle scoped packages)
      const parts = match[1].split('/');
      const pkgName = match[1].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
      deps.add(pkgName);
    }
  }

  while ((match = requireRegex.exec(code)) !== null) {
    if (!match[1].startsWith('.')) {
      const parts = match[1].split('/');
      const pkgName = match[1].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
      deps.add(pkgName);
    }
  }

  // Built-in Node.js modules
  const nodeBuiltins = new Set([
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
    'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
    'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
    'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring',
    'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls',
    'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads',
    'zlib'
  ]);

  const existingDeps = new Set<string>();
  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      if (pkg.dependencies) Object.keys(pkg.dependencies).forEach(d => existingDeps.add(d));
      if (pkg.devDependencies) Object.keys(pkg.devDependencies).forEach(d => existingDeps.add(d));
      if (pkg.peerDependencies) Object.keys(pkg.peerDependencies).forEach(d => existingDeps.add(d));
    } catch {
      // Invalid package.json, ignore
    }
  }

  const result = Array.from(deps).filter(dep => {
    // Filter out built-ins
    if (nodeBuiltins.has(dep) || dep.startsWith('node:')) return false;
    // Filter out already installed
    if (existingDeps.has(dep)) return false;
    return true;
  });

  return result;
}
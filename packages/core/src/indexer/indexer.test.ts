import { describe, it, expect, beforeEach } from "vitest";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import { Indexer } from "./indexer.js";

describe("indexer/indexer", () => {
  let tempDir: string;
  let indexer: Indexer;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Create package.json
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        dependencies: { express: "^4.0.0" },
        devDependencies: {
          vitest: "^1.0.0",
          typescript: "^5.0.0",
          "@types/node": "^20.0.0",
        },
      })
    );

    // Create tsconfig.json
    await writeFile(join(tempDir, "tsconfig.json"), "{}");

    // Create src directory with a file
    await mkdir(join(tempDir, "src"), { recursive: true });
    await writeFile(join(tempDir, "src/index.ts"), "export const x = 1;");

    indexer = new Indexer({
      rootDir: tempDir,
      ignore: [],
      alwaysRead: [],
    });
  });

  it("detects typescript language", async () => {
    const project = await indexer.index();
    expect(project.language).toBe("typescript");
  });

  it("detects express framework", async () => {
    const project = await indexer.index();
    expect(project.framework).toBe("express");
  });

  it("detects vitest test framework", async () => {
    const project = await indexer.index();
    expect(project.testFramework).toBe("vitest");
  });

  it("returns file tree", async () => {
    const project = await indexer.index();
    expect(project.fileTree.length).toBeGreaterThan(0);
  });

  it("returns cached project after indexing", async () => {
    await indexer.index();
    const cached = indexer.getCachedProject();
    expect(cached).not.toBeNull();
  });
});

describe("indexer/file-scanner", () => {
  it("ignores node_modules by default", async () => {
    const { scanDirectory } = await import("./file-scanner.js");
    const tempDir = join(tmpdir(), `test-scanner-${Date.now()}`);
    
    // Create all directories and files
    await mkdir(tempDir, { recursive: true });
    await mkdir(join(tempDir, "node_modules/pkg"), { recursive: true });
    await mkdir(join(tempDir, "src"), { recursive: true });
    
    await writeFile(join(tempDir, "node_modules/pkg/index.js"), "x=1");
    await writeFile(join(tempDir, "src/index.ts"), "export const x = 1;");

    const tree = await scanDirectory({ rootDir: tempDir });

    // node_modules should not be in the tree
    const nodeModules = tree.find(
      (n) => n.type === "directory" && n.path === "node_modules"
    );
    expect(nodeModules).toBeUndefined();
  });
});

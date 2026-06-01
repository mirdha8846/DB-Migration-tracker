import simpleGit, { SimpleGit } from "simple-git";
import fs from "fs";
import path from "path";

const REPO_BASE = path.join(__dirname, "..", "..", "data", "repos");

export interface GitRepo {
  id: string;
  url: string;
  name: string;
  language: string;
  localPath: string;
}

export async function cloneRepo(repo: { id: string; url: string; name: string; language: string }): Promise<GitRepo> {
  const localPath = path.join(REPO_BASE, repo.id);
  fs.mkdirSync(localPath, { recursive: true });

  const repoDir = path.join(localPath, repo.name);

  // Handle local file:// repos (for testing)
  if (repo.url.startsWith("file://")) {
    const sourcePath = repo.url.replace("file://", "");
    if (fs.existsSync(sourcePath)) {
      console.log(`📁 Using local repo: ${sourcePath}`);
      return {
        ...repo,
        localPath: sourcePath,
      };
    }
  }

  const git: SimpleGit = simpleGit();

  try {
    if (fs.existsSync(path.join(repoDir, ".git"))) {
      console.log(`📦 Pulling ${repo.name}...`);
      await simpleGit(repoDir).pull();
    } else {
      console.log(`📦 Cloning ${repo.name} from ${repo.url}...`);
      await git.clone(repo.url, repoDir, ["--depth", "1"]);
    }
  } catch (err: any) {
    console.error(`❌ Clone failed for ${repo.name}:`, err.message);
  }

  return { ...repo, localPath: repoDir };
}

export function listFiles(repoPath: string, extensions: string[]): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "__pycache__" && entry.name !== ".git") {
          walk(full);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            results.push(full);
          }
        }
      }
    } catch {
      /* skip unreadable dirs */
    }
  }

  walk(repoPath);
  return results;
}

export function readCodeFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function cleanupRepo(repoPath: string): void {
  try {
    fs.rmSync(repoPath, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

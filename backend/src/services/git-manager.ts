import simpleGit, { SimpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import os from "os";

const CLONE_BASE = path.join(os.tmpdir(), "sg-repos");

export interface GitRepo {
  id: string;
  url: string;
  name: string;
  language: string;
  localPath: string;
  cloned: boolean;
}

export async function cloneRepo(repo: {
  id: string; url: string; name: string; language: string;
}): Promise<GitRepo> {
  const projectDir = path.join(CLONE_BASE, repo.id);
  fs.mkdirSync(projectDir, { recursive: true });

  const repoDir = path.join(projectDir, sanitizeName(repo.name));

  // Already cloned? Pull instead
  if (fs.existsSync(path.join(repoDir, ".git"))) {
    try {
      console.log(`📦 Pulling ${repo.name}...`);
      const git: SimpleGit = simpleGit(repoDir);
      await git.pull(["origin", "main"]).catch(() => git.pull(["origin", "master"]));
      return { ...repo, localPath: repoDir, cloned: true };
    } catch {
      console.log(`⚠️ Pull failed, re-cloning ${repo.name}...`);
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  }

  // Clone fresh
  try {
    console.log(`📦 Cloning ${repo.name} from ${repo.url}...`);
    const token = process.env.GITHUB_TOKEN;

    let cloneUrl = repo.url;
    if (token && cloneUrl.includes("github.com")) {
      cloneUrl = cloneUrl.replace("https://", `https://${token}@`);
    }

    const git: SimpleGit = simpleGit();
    await git.clone(cloneUrl, repoDir, ["--depth", "1", "--single-branch"]);
    return { ...repo, localPath: repoDir, cloned: true };
  } catch (err: any) {
    console.error(`❌ Clone failed for ${repo.name}: ${err.message}`);
    return { ...repo, localPath: repoDir, cloned: false };
  }
}

export function cleanupRepo(repoPath: string): void {
  try {
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
      console.log(`🧹 Cleaned: ${repoPath}`);
    }
  } catch {
    /* ignore */
  }
}

export function cleanupProject(projectId: string): void {
  const projectDir = path.join(CLONE_BASE, projectId);
  cleanupRepo(projectDir);
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "-").substring(0, 50);
}

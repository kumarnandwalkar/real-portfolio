import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';

export async function ensureRepoUpToDate(project) {
  const { workdir, repo } = project;
  const parent = path.dirname(workdir);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  if (!fs.existsSync(workdir)) {
    fs.mkdirSync(workdir, { recursive: true });
  }
  const isGitRepo = fs.existsSync(path.join(workdir, '.git'));
  if (!isGitRepo) {
    // Use global git client to clone when repo doesn't exist yet
    await simpleGit().clone(repo, workdir);
  }
  const git = simpleGit({ baseDir: workdir, maxConcurrentProcesses: 1 });
  await git.fetch();
  await git.reset(['--hard', 'origin/main']).catch(async () => {
    // fall back to master if main not found
    await git.reset(['--hard', 'origin/master']);
  });
  await git.pull();
}



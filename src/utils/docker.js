import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function runCmd(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    // Use direct exec (no shell) for better Windows compatibility
    const child = spawn(cmd, args, { stdio: 'pipe', shell: false, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Command failed: ${cmd} ${args.join(' ')}`));
    });
  });
}

export async function composeUpBuild(project) {
  const composePath = path.isAbsolute(project.composeFile)
    ? project.composeFile
    : path.join(project.workdir, project.composeFile);
  const env = { ...process.env, ...(project.env || {}) };
  const args = ['compose', '-f', composePath, 'up', '-d', '--build'];
  await runCmd('docker', args, { env, cwd: project.workdir });
}

export async function composeDown(project, options = {}) {
  const composePath = path.isAbsolute(project.composeFile)
    ? project.composeFile
    : path.join(project.workdir, project.composeFile);
  const env = { ...process.env, ...(project.env || {}) };
  const args = ['compose', '-f', composePath, 'down'];
  if (options.removeImages) {
    args.push('--rmi', 'local');
  }
  if (options.removeVolumes) {
    args.push('--volumes');
  }
  if (!fs.existsSync(composePath)) return; // nothing to stop yet
  await runCmd('docker', args, { env, cwd: project.workdir });
}

export async function getProjectStatus(project) {
  try {
    // Consider running if any service is up from this compose file
    const composePath = path.isAbsolute(project.composeFile)
      ? project.composeFile
      : path.join(project.workdir, project.composeFile);
    if (!fs.existsSync(composePath)) {
      if (!fs.existsSync(project.workdir)) {
        return { state: 'idle', message: 'Not cloned yet. Click Start to clone and run.' };
      }
      return { state: 'idle', message: 'Compose file not found yet. Click Start to build.' };
    }
    const { stdout } = await runCmd('docker', ['compose', '-f', composePath, 'ps', '--format', 'json'], { cwd: project.workdir });
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const services = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    const running = services.some(s => (s.State || '').toLowerCase() === 'running');
    return { state: running ? 'running' : (services.length ? 'stopped' : 'idle'), services };
  } catch (e) {
    return { state: 'unknown', error: e.message };
  }
}

export async function stopAllExcept(projectId, projects) {
  const others = projects.filter(p => p.id !== projectId);
  for (const p of others) {
    try { await composeDown(p); } catch { /* ignore */ }
  }
}



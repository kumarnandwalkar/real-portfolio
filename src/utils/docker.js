// server/utils/docker.js

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import Docker from 'dockerode';
import stream from 'stream';
import { addLog } from './logger.js';

const docker = new Docker();

function runCmd(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
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

// --- THIS IS THE CORRECT, MERGED FUNCTION ---
export async function composeUpBuild(project) {
    addLog('orchestrator', `Starting project: ${project.name}`);
    
    // Logic from your original function to run compose
    const composePath = path.isAbsolute(project.composeFile)
      ? project.composeFile
      : path.join(project.workdir, project.composeFile);
    const env = { ...process.env, ...(project.env || {}) };
    const args = ['compose', '-f', composePath, 'up', '-d', '--build'];
    await runCmd('docker', args, { env, cwd: project.workdir });

    // Logic to find and attach logs after the command succeeds
    try {
        const containers = await docker.listContainers({
            filters: { label: [`com.docker.compose.project=${project.id}`] },
        });

        if (containers.length > 0) {
            addLog('orchestrator', `Found ${containers.length} containers for ${project.name}. Attaching logs...`);
            containers.forEach(containerInfo => {
                const container = docker.getContainer(containerInfo.Id);
                const serviceName = containerInfo.Labels['com.docker.compose.service'];
                attachToContainerLogs(container, `${project.id}-${serviceName}`);
            });
        }
    } catch (e) {
        addLog('orchestrator-error', `Could not attach logs for compose project ${project.name}: ${e.message}`);
    }
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
  if (!fs.existsSync(composePath)) return;
  await runCmd('docker', args, { env, cwd: project.workdir });
}

export async function getProjectStatus(project) {
  try {
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

function attachToContainerLogs(container, logSourceName) {
    container.logs({
        follow: true,
        stdout: true,
        stderr: true,
    }, (err, logStream) => {
        if (err) {
            return addLog('orchestrator-error', `Error attaching to ${logSourceName} logs: ${err.message}`);
        }
        logStream.on('data', chunk => {
            const logMessage = chunk.toString('utf8').replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
            if (logMessage) {
                addLog(logSourceName, logMessage);
            }
        });
        logStream.on('end', () => {
            addLog('orchestrator', `${logSourceName} log stream ended.`);
        });
    });
}

export async function stopAllExcept(projectId, projects) {
  const others = projects.filter(p => p.id !== projectId);
  for (const p of others) {
    try { await composeDown(p); } catch { /* ignore */ }
  }
}
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import projects from './config/projects.js';
import { ensureRepoUpToDate } from './utils/git.js';
import { composeUpBuild, composeDown, getProjectStatus, stopAllExcept } from './utils/docker.js';
import { checkHealth } from './utils/health.js';
import { addLog, getLogs } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

function sanitizeProjectId(projectId) {
    return projects.find(p => p.id === projectId) ? projectId : null;
}

app.get('/api/projects', async (req, res) => {
    const statuses = await Promise.all(
        projects.map(async (p) => {
            const status = await getProjectStatus(p);
            const health = await checkHealth(p.openUrl).catch(() => ({ healthy: false }));
            return { id: p.id, name: p.name, openUrl: p.openUrl, status, health };
        })
    );
    res.json({ projects: statuses });
});

app.get('/api/logs', (req, res) => {
    res.json(getLogs());
});

app.get('/api/projects/:id/status', async (req, res) => {
    const id = sanitizeProjectId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Project not found' });
    const project = projects.find(p => p.id === id);
    const status = await getProjectStatus(project);
    const health = await checkHealth(project.openUrl).catch(() => ({ healthy: false }));
    res.json({ status, health });
});

app.post('/api/projects/:id/start', async (req, res) => {
    const id = sanitizeProjectId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Project not found' });
    const project = projects.find(p => p.id === id);
    try {
        await stopAllExcept(project.id, projects);
        await ensureRepoUpToDate(project);
        await composeUpBuild(project);
        const status = await getProjectStatus(project);
        res.json({ message: 'Started', status });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

app.post('/api/projects/:id/stop', async (req, res) => {
    const id = sanitizeProjectId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Project not found' });
    const project = projects.find(p => p.id === id);
    try {
        await composeDown(project);
        const status = await getProjectStatus(project);
        res.json({ message: 'Stopped', status });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

// --- THIS ENDPOINT IS UPDATED ---
app.post('/api/projects/stop-all', async (req, res) => {
    try {
        // Use Promise.all to run all stop commands in parallel for better performance
        await Promise.all(projects.map(p => composeDown(p)));
        res.json({ message: 'All projects stopped' });
    } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});

const PORT = process.env.PORT || 8088;
app.listen(PORT, () => {
    addLog('orchestrator', `Server listening on http://localhost:${PORT}`);
});
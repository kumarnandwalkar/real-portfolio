On-Demand Portfolio Orchestrator
================================

Runs your containerized projects on-demand on a small EC2 (t2.micro). Visitors see a single page with three projects. Clicking Start clones/updates the repo and brings up containers; only one project runs at a time.

Projects
--------

- YouTube Clone (MERN + Docker) — [`kumarnandwalkar/Working-YT-Clone`](https://github.com/kumarnandwalkar/Working-YT-Clone)
- MERN Chat & Video Calling — [`kumarnandwalkar/MERN-Chat-Calling-Application`](https://github.com/kumarnandwalkar/MERN-Chat-Calling-Application)
- Meeting Summarizer — [`kumarnandwalkar/meeting-summarizer`](https://github.com/kumarnandwalkar/meeting-summarizer)

Prerequisites
-------------

- Docker Engine + Docker Compose V2 installed
- Node.js 18+

Quick start (local)
-------------------

Option A: Run with Node

1. `cd "real portfolio"`
2. Install deps: `npm install`
3. Start: `npm run start`
4. Open: `http://localhost:8088`

Option B: Run in Docker

1. `cd "real portfolio"`
2. Build: `docker build -t portfolio-orchestrator .`
3. Run:  
   Windows (PowerShell):
   - `docker run -d --name portfolio-orchestrator -p 8088:8088 -e JWT_SECRET=change_me_strong -v ${PWD}/projects:/app/projects -v //var/run/docker.sock:/var/run/docker.sock portfolio-orchestrator`
   Linux/Mac:
   - `docker run -d --name portfolio-orchestrator -p 8088:8088 -e JWT_SECRET=change_me_strong -v $(pwd)/projects:/app/projects -v /var/run/docker.sock:/var/run/docker.sock portfolio-orchestrator`
4. Open: `http://localhost:8088`

EC2 deployment (Ubuntu)
-----------------------

1. Install Docker
   - `curl -fsSL https://get.docker.com | sh`
   - `sudo usermod -aG docker ubuntu && newgrp docker`
2. Install Node.js 18+ (e.g., via nvm)
3. Clone this orchestrator repo to `/opt/portfolio-orchestrator` (or your chosen path)
4. `cd /opt/portfolio-orchestrator && npm ci`
5. Set environment (optional)
   - `export PORT=8088`
   - `export JWT_SECRET=change_me_strong`
6. Create a systemd service `/etc/systemd/system/portfolio.service`:

```
[Unit]
Description=On-Demand Portfolio Orchestrator
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/portfolio-orchestrator
Environment=PORT=8088
Environment=JWT_SECRET=change_me_strong
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

7. `sudo systemctl daemon-reload && sudo systemctl enable --now portfolio`
8. Open security group inbound ports needed to access the orchestrator (e.g. 80/443 via reverse proxy) and project ports (4000, 8080, 5173) or proxy them.

Run orchestrator in a container on EC2
--------------------------------------

1. Install Docker (above)
2. Place this folder at `/opt/portfolio-orchestrator/real portfolio`
3. `cd "/opt/portfolio-orchestrator/real portfolio"`
4. `export JWT_SECRET=change_me_strong`
5. `docker compose up -d --build`
6. Visit `http://<EC2_PUBLIC_IP>:8088`

Note: The container mounts `/var/run/docker.sock` to control Docker on the host and uses `/opt/portfolio-orchestrator/real portfolio/projects` to store cloned repos.

Optional: Nginx reverse proxy
-----------------------------

- Point your domain to EC2 and proxy `/` to `http://127.0.0.1:8088`
- Optionally expose only the orchestrator and let users click Open to access running services. Prefer proxying per-project paths or subdomains if you don’t want to open raw ports.

How it works
------------

- API: `/api/projects` lists state; `/api/projects/:id/start|stop|status`
- Start: Stops others, clones or updates repo, then `docker compose up -d --build`
- Stop: `docker compose down`
- Single-active enforced by stopping all others before starting the selected project

Configuration
-------------

- Edit `src/config/projects.js` to change ports, env, repo URLs, or compose files.
- Default working directory for clones: `projects/` under this folder.

Notes
-----

- First start per project will take time to clone/build images.
- Ensure enough disk space for images. Clean up with `docker system prune -a` if needed.
- You may secure the orchestrator with a simple HTTP basic auth or IP allowlist (not included by default).

References
----------

- YouTube Clone repo: [`https://github.com/kumarnandwalkar/Working-YT-Clone`](https://github.com/kumarnandwalkar/Working-YT-Clone)
- Chat & Calling repo: [`https://github.com/kumarnandwalkar/MERN-Chat-Calling-Application`](https://github.com/kumarnandwalkar/MERN-Chat-Calling-Application)
- Meeting Summarizer repo: [`https://github.com/kumarnandwalkar/meeting-summarizer`](https://github.com/kumarnandwalkar/meeting-summarizer)



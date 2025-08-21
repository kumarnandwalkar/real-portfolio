import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '../../projects');

/**
 * Each project must define:
 * - id: stable slug
 * - name: display name
 * - repo: git URL
 * - workdir: absolute folder where the repo will be cloned
 * - composeFile: relative or absolute docker-compose file path
 * - openUrl: URL to open after start
 * - env: optional environment variables for compose
 */
const projects = [
  {
    id: 'ytclone',
    name: 'YouTube Clone (MERN + Docker)',
    repo: 'https://github.com/kumarnandwalkar/Working-YT-Clone.git',
    workdir: path.join(baseDir, 'Working-YT-Clone'),
    composeFile: 'docker-compose.yml',
    openUrl: 'http://localhost:4000',
    env: {
      JWT_SECRET: process.env.JWT_SECRET || 'change_me_strong'
    }
  },
  {
    id: 'chatcall',
    name: 'MERN Chat & Video Calling',
    repo: 'https://github.com/kumarnandwalkar/MERN-Chat-Calling-Application.git',
    workdir: path.join(baseDir, 'MERN-Chat-Calling-Application'),
    composeFile: 'docker-compose.yml',
    openUrl: 'http://localhost:8080',
    env: {
      CORS_ORIGIN: 'http://localhost:8080'
    }
  },
  {
    id: 'meetingsum',
    name: 'Meeting Summarizer',
    repo: 'https://github.com/kumarnandwalkar/meeting-summarizer.git',
    workdir: path.join(baseDir, 'meeting-summarizer'),
    composeFile: 'docker-compose.yml',
    openUrl: 'http://localhost:5173'
  }
];

export default projects;



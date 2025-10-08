// server/utils/logger.js

import fs from 'fs';
import path from 'path';

// Store the last 200 log lines in memory
const logHistory = [];
const MAX_LOGS = 200;

// --- THIS SECTION IS CORRECTED ---

// 1. Define a dedicated 'logs' directory inside the container's working directory.
const logDir = path.join(process.cwd(), 'logs');
const logFilePath = path.join(logDir, 'orchestrator.log');

// 2. Ensure this log directory exists before trying to write to it.
fs.mkdirSync(logDir, { recursive: true });

// 3. Create the writable stream to our log file.
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// ---------------------------------


// Central function to add a log entry
export function addLog(source, message) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        source, // e.g., 'orchestrator', 'chat-app-server'
        message: message.trim(),
    };

    logHistory.push(logEntry);
    if (logHistory.length > MAX_LOGS) {
        logHistory.shift(); // Keep the array size manageable
    }

    // Write the structured log to the file
    logStream.write(JSON.stringify(logEntry) + '\n');
    console.log(`[${source}] ${message}`); // Also log to the main console
}

export function getLogs() {
    return logHistory;
}
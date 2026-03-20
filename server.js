import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Immediate logging to confirm container start
console.log('--- CONTAINER STARTING ---');
console.log('Timestamp:', new Date().toISOString());
console.log('Node Version:', process.version);
console.log('Process ID:', process.pid);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Cloud Run provides the PORT environment variable (usually 8080)
// We MUST listen on this port.
const PORT = parseInt(process.env.PORT || '8080', 10);

console.log('Environment PORT:', process.env.PORT);
console.log('Parsed PORT:', PORT);

// Catch-all for early errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

// Serve static files from the 'dist' directory
const distPath = path.resolve(__dirname, 'dist');
console.log('Serving static files from:', distPath);

// Check if dist directory exists (logging only)
import { existsSync } from 'fs';
if (existsSync(distPath)) {
  console.log('SUCCESS: dist directory found');
} else {
  console.error('ERROR: dist directory NOT found at', distPath);
}

app.use(express.static(distPath));

// Health check endpoint for GCP
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).send('OK');
});

// Fallback to index.html for Single Page Application (SPA) routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('ERROR: index.html not found at', indexPath);
    res.status(404).send('Application not built correctly. index.html missing.');
  }
});

// Listen on 0.0.0.0 to accept external traffic
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`SUCCESS: Server is listening on 0.0.0.0:${PORT}`);
    console.log('--- SERVER READY ---');
  });

  server.on('error', (err) => {
    console.error('SERVER LISTEN ERROR:', err);
    process.exit(1);
  });
} catch (err) {
  console.error('CRITICAL STARTUP ERROR:', err);
  process.exit(1);
}

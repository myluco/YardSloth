import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const PYTHON_PORT = 8765;
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json({ limit: '15mb' }));

// Spawn the pure Python backend server (server/main.py)
let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  console.log(`Launching Python backend on port ${PYTHON_PORT}...`);
  pythonProcess = spawn('python3', ['server/main.py'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PYTHON_HOST: '127.0.0.1',
      PYTHON_PORT: String(PYTHON_PORT),
    },
  });

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`[Python Server]: ${data.toString().trim()}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    console.error(`[Python Server Error]: ${data.toString().trim()}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

startPythonBackend();

// Graceful cleanup on shutdown
process.on('exit', () => {
  if (pythonProcess) pythonProcess.kill();
});
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit();
});

// Proxy all /api/* requests directly to the Python backend
app.use('/api', async (req: Request, res: Response) => {
  const targetUrl = `http://127.0.0.1:${PYTHON_PORT}/api${req.url}`;
  
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const pyRes = await fetch(targetUrl, fetchOptions);
    const contentType = pyRes.headers.get('content-type') || 'application/json';

    res.status(pyRes.status);
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/calendar')) {
      res.setHeader('Content-Disposition', 'attachment; filename="yard_sloth_garden_calendar.ics"');
      const text = await pyRes.text();
      res.send(text);
    } else {
      const data = await pyRes.json();
      res.json(data);
    }
  } catch (err: any) {
    console.error(`Error forwarding request to Python server at ${targetUrl}:`, err.message);
    res.status(502).json({
      error: 'Python backend is starting up or unreachable. Please retry.',
      details: err.message,
    });
  }
});

// Vite Dev Server / Static Hosting
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Yard Sloth UI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

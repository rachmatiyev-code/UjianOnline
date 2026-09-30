import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE_PATH = path.resolve(__dirname, '.ujianonline_server_state.json');

interface ServerSharedState {
  isCustomized: boolean;
  updatedAt: string;
  gasWebAppUrl?: string;
  teacherProfile?: any;
  teacherPassword?: string;
  examConfig?: any;
  students?: any[];
  questions?: any[];
  submissions?: any[];
  dbInfo?: any;
}

function readServerState(): ServerSharedState | null {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) return null;
    const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as ServerSharedState;
  } catch {
    return null;
  }
}

function writeServerState(nextState: ServerSharedState): void {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(nextState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist server state:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // GET /api/state — Returns the shared teacher-configured state for any device opening the link
  app.get('/api/state', (_req, res) => {
    const state = readServerState();
    if (!state) {
      res.json({ isCustomized: false });
      return;
    }
    res.json(state);
  });

  // POST /api/state — Updates the shared state when teacher edits data, imports bulk students, or syncs DB
  app.post('/api/state', (req, res) => {
    const body = req.body || {};
    const existing = readServerState() || {
      isCustomized: true,
      updatedAt: new Date().toISOString(),
    };

    const merged: ServerSharedState = {
      ...existing,
      isCustomized: true,
      updatedAt: new Date().toISOString(),
      ...(body.gasWebAppUrl !== undefined ? { gasWebAppUrl: body.gasWebAppUrl } : {}),
      ...(body.teacherProfile !== undefined ? { teacherProfile: body.teacherProfile } : {}),
      ...(body.teacherPassword !== undefined ? { teacherPassword: body.teacherPassword } : {}),
      ...(body.examConfig !== undefined ? { examConfig: body.examConfig } : {}),
      ...(Array.isArray(body.students) ? { students: body.students } : {}),
      ...(Array.isArray(body.questions) ? { questions: body.questions } : {}),
      ...(Array.isArray(body.submissions) ? { submissions: body.submissions } : {}),
      ...(body.dbInfo !== undefined ? { dbInfo: body.dbInfo } : {}),
    };

    writeServerState(merged);
    res.json({ status: 'ok', updatedAt: merged.updatedAt });
  });

  // POST /api/submission — Atomic append when a student submits an exam via shared link
  app.post('/api/submission', (req, res) => {
    const { submission, newStudent } = req.body || {};
    if (!submission || !submission.id) {
      res.status(400).json({ status: 'error', message: 'Invalid submission' });
      return;
    }

    const existing = readServerState() || {
      isCustomized: true,
      updatedAt: new Date().toISOString(),
      students: [],
      questions: [],
      submissions: [],
    };

    const prevSubs = Array.isArray(existing.submissions) ? existing.submissions : [];
    const nextSubs = [
      submission,
      ...prevSubs.filter((s: any) => s.id !== submission.id),
    ];

    let nextStudents = Array.isArray(existing.students) ? existing.students : [];
    if (newStudent && newStudent.id) {
      const exists = nextStudents.some(
        (st: any) => st.id === newStudent.id || st.nisn === newStudent.nisn
      );
      if (!exists) {
        nextStudents = [newStudent, ...nextStudents];
      }
    }

    const merged: ServerSharedState = {
      ...existing,
      isCustomized: true,
      updatedAt: new Date().toISOString(),
      submissions: nextSubs,
      students: nextStudents,
    };

    writeServerState(merged);
    res.json({ status: 'ok', submissionsCount: nextSubs.length });
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UjianOnline server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

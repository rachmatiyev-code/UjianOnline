import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_STATE_FILE = './db_state.json';
const PERSISTED_CONFIG_FILE = path.resolve(
  __dirname,
  'src/config/persistedConfig.json'
);

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

function readDbState(): ServerSharedState | null {
  try {
    if (fs.existsSync(DB_STATE_FILE)) {
      const data = fs.readFileSync(DB_STATE_FILE, 'utf-8');
      if (data.trim()) {
        return JSON.parse(data) as ServerSharedState;
      }
    }
    if (fs.existsSync(PERSISTED_CONFIG_FILE)) {
      const fallbackData = fs.readFileSync(PERSISTED_CONFIG_FILE, 'utf-8');
      if (fallbackData.trim()) {
        const parsed = JSON.parse(fallbackData);
        if (parsed && parsed.isCustomized) {
          return parsed as ServerSharedState;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function writeDbState(newState: ServerSharedState): void {
  try {
    // 1. Persist to ./db_state.json as requested
    fs.writeFileSync(DB_STATE_FILE, JSON.stringify(newState, null, 2), 'utf-8');

    // 2. Also persist to src/config/persistedConfig.json so DEFAULT_GAS_URL & state survive rebuilds/shares
    const configPayload = {
      defaultGasUrl: newState.gasWebAppUrl || '',
      ...newState,
    };
    fs.writeFileSync(
      PERSISTED_CONFIG_FILE,
      JSON.stringify(configPayload, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to persist db_state.json:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Saat membaca state (GET /api/state)
  app.get('/api/state', (_req, res) => {
    try {
      if (fs.existsSync(DB_STATE_FILE)) {
        const data = fs.readFileSync(DB_STATE_FILE, 'utf-8');
        res.json(JSON.parse(data));
        return;
      }
      const fallback = readDbState();
      if (fallback) {
        res.json(fallback);
        return;
      }
      res.json({ isCustomized: false });
    } catch {
      res.json({ isCustomized: false });
    }
  });

  // Saat menyimpan state (POST /api/state)
  app.post('/api/state', (req, res) => {
    const body = req.body || {};
    const existing = readDbState() || {
      isCustomized: true,
      updatedAt: new Date().toISOString(),
    };

    const newState: ServerSharedState = {
      ...existing,
      isCustomized: true,
      updatedAt: new Date().toISOString(),
      ...(body.gasWebAppUrl !== undefined
        ? { gasWebAppUrl: body.gasWebAppUrl }
        : {}),
      ...(body.teacherProfile !== undefined
        ? { teacherProfile: body.teacherProfile }
        : {}),
      ...(body.teacherPassword !== undefined
        ? { teacherPassword: body.teacherPassword }
        : {}),
      ...(body.examConfig !== undefined ? { examConfig: body.examConfig } : {}),
      ...(Array.isArray(body.students) ? { students: body.students } : {}),
      ...(Array.isArray(body.questions) ? { questions: body.questions } : {}),
      ...(Array.isArray(body.submissions)
        ? { submissions: body.submissions }
        : {}),
      ...(body.dbInfo !== undefined ? { dbInfo: body.dbInfo } : {}),
    };

    writeDbState(newState);
    res.json(newState);
  });

  // POST /api/submission — Menambahkan hasil ujian siswa ke ./db_state.json
  app.post('/api/submission', (req, res) => {
    const { submission, newStudent } = req.body || {};
    if (!submission || !submission.id) {
      res.status(400).json({ status: 'error', message: 'Invalid submission' });
      return;
    }

    const existing = readDbState() || {
      isCustomized: true,
      updatedAt: new Date().toISOString(),
      students: [],
      questions: [],
      submissions: [],
    };

    const prevSubs = Array.isArray(existing.submissions)
      ? existing.submissions
      : [];
    const nextSubs = [
      submission,
      ...prevSubs.filter((s: any) => s.id !== submission.id),
    ];

    let nextStudents = Array.isArray(existing.students)
      ? existing.students
      : [];
    if (newStudent && newStudent.id) {
      const exists = nextStudents.some(
        (st: any) => st.id === newStudent.id || st.nisn === newStudent.nisn
      );
      if (!exists) {
        nextStudents = [newStudent, ...nextStudents];
      }
    }

    const newState: ServerSharedState = {
      ...existing,
      isCustomized: true,
      updatedAt: new Date().toISOString(),
      submissions: nextSubs,
      students: nextStudents,
    };

    writeDbState(newState);
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

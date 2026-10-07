import {
  Question,
  Student,
  ExamSubmission,
  WorkspaceDatabaseInfo,
} from '../types/exam';
import {
  INITIAL_QUESTIONS,
  INITIAL_STUDENTS,
  INITIAL_SUBMISSIONS,
} from '../data/initialData';
import persistedConfig from '../config/persistedConfig.json';

/**
 * Permanent Default Fallback Google Apps Script Web App URL.
 * Siswa yang membuka link tanpa localStorage guru akan langsung terhubung ke database Google Sheets yang sama.
 */
export const DEFAULT_GAS_URL: string =
  (persistedConfig as any)?.defaultGasUrl ||
  (persistedConfig as any)?.gasWebAppUrl ||
  (import.meta as any)?.env?.VITE_DEFAULT_GAS_URL ||
  '';

export type DatabaseTabName =
  | 'Hasil_Ujian'
  | 'Data_Siswa'
  | 'Bank_Soal'
  | 'Riwayat_Partisipasi';

export const FOLDER_NAME = 'UjianOnline_Database';
export const SPREADSHEET_TITLE = 'UjianOnline_Master_Database';

export const TAB_NAMES: Record<string, DatabaseTabName> = {
  RESULTS: 'Hasil_Ujian',
  STUDENTS: 'Data_Siswa',
  QUESTIONS: 'Bank_Soal',
  HISTORY: 'Riwayat_Partisipasi',
};

export interface DatabaseSnapshot {
  students: Student[];
  questions: Question[];
  submissions: ExamSubmission[];
  updatedAt: string;
}

/**
 * Complete Google Apps Script (Code.gs) template.
 * Uses native DriveApp & SpreadsheetApp (Zero Firebase dependency) to automatically:
 * 1. Find or create folder "UjianOnline_Database" in Google Drive.
 * 2. Find or create spreadsheet "UjianOnline_Master_Database" inside that folder.
 * 3. Create, sync (write), and fetch (read) 4 structured tabs:
 *    Hasil_Ujian, Data_Siswa, Bank_Soal, Riwayat_Partisipasi.
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * UjianOnline — Google Apps Script Backend (Code.gs)
 * Tanpa Firebase — Menggunakan DriveApp & SpreadsheetApp Bawaan Google
 * Mendukung Sinkronisasi (Simpan) & Ambil Data (Fetch) untuk 4 Tabel:
 * 1. Hasil_Ujian
 * 2. Data_Siswa
 * 3. Bank_Soal
 * 4. Riwayat_Partisipasi
 */

const FOLDER_NAME = 'UjianOnline_Database';
const SPREADSHEET_TITLE = 'UjianOnline_Master_Database';
const TABS = ['Hasil_Ujian', 'Data_Siswa', 'Bank_Soal', 'Riwayat_Partisipasi'];

function findSheetSmart(ss, tabName) {
  let sheet = ss.getSheetByName(tabName);
  if (sheet && sheet.getLastRow() > 1) return sheet;

  const normalizedTarget = tabName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const allSheets = ss.getSheets();
  for (let i = 0; i < allSheets.length; i++) {
    const s = allSheets[i];
    const normName = s.getName().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      normName === normalizedTarget ||
      (normalizedTarget.indexOf('siswa') !== -1 && normName.indexOf('siswa') !== -1) ||
      (normalizedTarget.indexOf('soal') !== -1 && normName.indexOf('soal') !== -1) ||
      (normalizedTarget.indexOf('hasil') !== -1 && (normName.indexOf('hasil') !== -1 || normName.indexOf('nilai') !== -1)) ||
      (normalizedTarget.indexOf('riwayat') !== -1 && (normName.indexOf('riwayat') !== -1 || normName.indexOf('partisipasi') !== -1))
    ) {
      if (s.getLastRow() > 0) return s;
    }
  }
  return sheet || null;
}

function ensureDatabaseInDrive() {
  let folder;
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(FOLDER_NAME);
  }

  let spreadsheet = null;
  try {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    spreadsheet = null;
  }

  if (!spreadsheet) {
    const files = folder.getFilesByName(SPREADSHEET_TITLE);
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.openById(files.next().getId());
    } else {
      const anySheetFiles = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
      if (anySheetFiles.hasNext()) {
        spreadsheet = SpreadsheetApp.openById(anySheetFiles.next().getId());
      } else {
        spreadsheet = SpreadsheetApp.create(SPREADSHEET_TITLE);
        const ssFile = DriveApp.getFileById(spreadsheet.getId());
        ssFile.moveTo(folder);
      }
    }
  }

  TABS.forEach(function(tabName) {
    let sheet = findSheetSmart(spreadsheet, tabName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(tabName);
      sheet.setFrozenRows(1);
    }
  });

  return {
    folderId: folder.getId(),
    folderName: FOLDER_NAME,
    folderUrl: folder.getUrl(),
    spreadsheetId: spreadsheet.getId(),
    spreadsheetTitle: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    spreadsheet: spreadsheet
  };
}

function writeSheetData(sheet, header, rows) {
  sheet.clearContents();
  const allRows = [header].concat(rows || []);
  if (allRows.length > 0 && allRows[0].length > 0) {
    sheet.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);
    sheet.getRange(1, 1, 1, allRows[0].length).setFontWeight('bold').setBackground('#F1F5F9');
  }
}

function readSheetRows(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return [];
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

function buildFetchPayload(db, props, targetTab) {
  const ss = db.spreadsheet;
  const resultData = {};
  const rows = {};

  TABS.forEach(function(t) {
    if (targetTab === 'ALL' || targetTab === t) {
      const sheet = findSheetSmart(ss, t);
      const sheetRows = readSheetRows(sheet);
      rows[t] = sheetRows;
      resultData[t + '_Rows'] = sheetRows;
      const saved = props.getProperty('MODEL_' + t);
      resultData[t] = saved ? JSON.parse(saved) : null;
    }
  });

  return {
    status: 'success',
    tab: targetTab,
    data: resultData,
    rows: rows,
    folderId: db.folderId,
    folderName: db.folderName,
    folderUrl: db.folderUrl,
    spreadsheetId: db.spreadsheetId,
    spreadsheetTitle: db.spreadsheetTitle,
    spreadsheetUrl: db.spreadsheetUrl,
    fetchedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString()
  };
}

function doPost(e) {
  try {
    const payload = (e && e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
    const db = ensureDatabaseInDrive();
    const ss = db.spreadsheet;
    const props = PropertiesService.getScriptProperties();

    if (payload.action === 'syncAll' && payload.tables) {
      writeSheetData(
        findSheetSmart(ss, 'Hasil_Ujian') || ss.getSheetByName('Hasil_Ujian'),
        payload.tables.resultsHeader,
        payload.tables.resultsRows
      );
      writeSheetData(
        findSheetSmart(ss, 'Data_Siswa') || ss.getSheetByName('Data_Siswa'),
        payload.tables.studentsHeader,
        payload.tables.studentsRows
      );
      writeSheetData(
        findSheetSmart(ss, 'Bank_Soal') || ss.getSheetByName('Bank_Soal'),
        payload.tables.questionsHeader,
        payload.tables.questionsRows
      );
      writeSheetData(
        findSheetSmart(ss, 'Riwayat_Partisipasi') || ss.getSheetByName('Riwayat_Partisipasi'),
        payload.tables.historyHeader,
        payload.tables.historyRows
      );

      if (payload.rawModels) {
        if (payload.rawModels.submissions) {
          props.setProperty('MODEL_Hasil_Ujian', JSON.stringify(payload.rawModels.submissions));
          props.setProperty('MODEL_Riwayat_Partisipasi', JSON.stringify(payload.rawModels.submissions));
        }
        if (payload.rawModels.students) {
          props.setProperty('MODEL_Data_Siswa', JSON.stringify(payload.rawModels.students));
        }
        if (payload.rawModels.questions) {
          props.setProperty('MODEL_Bank_Soal', JSON.stringify(payload.rawModels.questions));
        }
      }
    }

    const targetTab = payload.tab || 'ALL';
    return ContentService.createTextOutput(
      JSON.stringify(buildFetchPayload(db, props, targetTab))
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'error',
        message: err.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const db = ensureDatabaseInDrive();
    const props = PropertiesService.getScriptProperties();
    const tab = (e && e.parameter && e.parameter.tab) ? e.parameter.tab : 'ALL';
    return ContentService.createTextOutput(
      JSON.stringify(buildFetchPayload(db, props, tab))
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'error',
        message: err.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export function buildSheetsTablePayload(
  students: Student[],
  questions: Question[],
  submissions: ExamSubmission[]
) {
  const resultsHeader = [
    'ID Hasil',
    'Waktu Selesai',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Judul Ujian',
    'Skor Perolehan',
    'Skor Maksimal',
    'Nilai Akhir (%)',
    'Predikat',
    'Status Kelulusan',
    'Durasi (Detik)',
    'Ringkasan Jawaban Benar',
  ];
  const resultsRows = submissions.map((sub) => {
    const correctCount = sub.details.filter((d) => d.isCorrect).length;
    return [
      sub.id,
      new Date(sub.submittedAt).toLocaleString('id-ID'),
      sub.studentNisn,
      sub.studentName,
      sub.className,
      sub.examTitle,
      String(sub.totalScore),
      String(sub.maxScore),
      `${sub.percentage}%`,
      sub.gradeLetter,
      sub.passed ? 'LULUS' : 'REMEDIAL',
      String(sub.durationSeconds),
      `${correctCount}/${sub.details.length} Soal Benar`,
    ];
  });

  const studentsHeader = [
    'ID Siswa',
    'NISN',
    'Nama Lengkap',
    'Kelas',
    'Email Sekolah',
    'Status',
    'Tanggal Terdaftar',
    'Total Partisipasi Ujian',
    'Rata-Rata Nilai (%)',
    'Nilai Tertinggi (%)',
    'Riwayat Ujian Terakhir',
  ];
  const studentsRows = students.map((st) => {
    const stSubs = submissions.filter(
      (s) => s.studentId === st.id || s.studentNisn === st.nisn
    );
    const totalAttempts = stSubs.length;
    const avgScore =
      totalAttempts > 0
        ? Math.round(stSubs.reduce((acc, c) => acc + c.percentage, 0) / totalAttempts)
        : 0;
    const maxScore =
      totalAttempts > 0 ? Math.max(...stSubs.map((s) => s.percentage)) : 0;
    const lastAttempt =
      totalAttempts > 0
        ? new Date(stSubs[0].submittedAt).toLocaleString('id-ID')
        : 'Belum Mengikuti';

    return [
      st.id,
      st.nisn,
      st.name,
      st.className,
      st.email,
      st.status,
      st.joinedAt,
      String(totalAttempts),
      totalAttempts > 0 ? `${avgScore}%` : '-',
      totalAttempts > 0 ? `${maxScore}%` : '-',
      lastAttempt,
    ];
  });

  const questionsHeader = [
    'ID Soal',
    'Topik / Kompetensi',
    'Tipe Soal',
    'Tingkat Kesulitan',
    'Bobot Poin',
    'Format Media',
    'Pertanyaan Soal',
    'Opsi Jawaban',
    'Kunci Jawaban',
    'Pembahasan Analisis',
  ];
  const questionsRows = questions.map((q) => [
    q.id,
    q.topic,
    q.type,
    q.difficulty,
    String(q.points),
    q.mediaType,
    q.text,
    q.options.map((o) => `${o.id}: ${o.label}`).join(' | '),
    q.correctAnswers.join(', '),
    q.explanation,
  ]);

  const historyHeader = [
    'ID Partisipasi',
    'Waktu Mulai',
    'Waktu Selesai',
    'Durasi Pengerjaan',
    'ID Siswa',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Paket Ujian',
    'Pengacakan Aktif',
    'Nilai Akhir (%)',
    'Status',
    'Detail Evaluasi Butir Soal',
  ];
  const historyRows = submissions.map((sub) => {
    const mins = Math.floor(sub.durationSeconds / 60);
    const secs = sub.durationSeconds % 60;
    const itemBreakdown = sub.details
      .map(
        (d) =>
          `[${d.questionId} (${d.topic}): ${d.isCorrect ? 'BENAR' : 'SALAH'} (${d.earnedPoints}/${d.maxPoints}pt)]`
      )
      .join(' ; ');
    return [
      sub.id,
      new Date(sub.startedAt).toLocaleString('id-ID'),
      new Date(sub.submittedAt).toLocaleString('id-ID'),
      `${mins}m ${secs}d`,
      sub.studentId,
      sub.studentNisn,
      sub.studentName,
      sub.className,
      sub.examTitle,
      sub.randomizedQuestions ? 'Ya (Soal & Opsi Diacak)' : 'Tidak',
      `${sub.percentage}%`,
      sub.passed ? 'LULUS' : 'REMEDIAL',
      itemBreakdown,
    ];
  });

  return {
    resultsHeader,
    resultsRows,
    studentsHeader,
    studentsRows,
    questionsHeader,
    questionsRows,
    historyHeader,
    historyRows,
  };
}

/**
 * Synchronizes all 4 sheets to Google Drive ("UjianOnline_Database") & Google Sheets
 * via Google Apps Script Web App URL (text/plain POST to avoid CORS preflight blockage).
 */
export async function syncDataViaGoogleAppsScript(
  gasWebAppUrl: string,
  students: Student[],
  questions: Question[],
  submissions: ExamSubmission[]
): Promise<WorkspaceDatabaseInfo> {
  const trimmedUrl = gasWebAppUrl.trim();
  if (!trimmedUrl) {
    throw new Error(
      'Mohon masukkan Web App URL Google Apps Script (https://script.google.com/macros/s/.../exec) terlebih dahulu di menu Database Sheets.'
    );
  }

  const tables = buildSheetsTablePayload(students, questions, submissions);
  const payloadData = {
    action: 'syncAll',
    folderName: FOLDER_NAME,
    spreadsheetTitle: SPREADSHEET_TITLE,
    tables,
    rawModels: {
      students,
      questions,
      submissions,
    },
  };

  let response: Response;
  try {
    // 2. Simple Request (Content-Type: text/plain, no custom headers) & 3. Referrer Policy
    response = await fetch(trimmedUrl, {
      method: 'POST',
      referrerPolicy: 'no-referrer-when-downgrade',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payloadData),
    });
  } catch (directErr) {
    // Optional fallback to /api/gas-proxy if browser blocks cross-origin or strict referrer occurs
    try {
      response = await fetch('/api/gas-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          __targetUrl: trimmedUrl,
          ...payloadData,
        }),
      });
    } catch {
      throw directErr;
    }
  }

  if (response.status === 401) {
    throw new Error(
      'Error 401 Unauthorized: Deployment Google Apps Script belum memiliki izin akses publik. ' +
        'Pastikan di Apps Script: Deploy > New deployment > Execute as: Me > Who has access: Anyone, ' +
        'lalu salin URL /exec baru dan uji di jendela Incognito.'
    );
  }

  if (!response.ok) {
    throw new Error(
      `Google Apps Script HTTP Error (${response.status}): Pastikan Web App di-deploy dengan akses "Anyone".`
    );
  }

  const data = await response.json();
  if (data.status === 'error') {
    throw new Error(`Google Apps Script Error: ${data.message}`);
  }

  return {
    gasWebAppUrl: trimmedUrl,
    folderId: data.folderId || 'GAS-FOLDER-ID',
    folderName: data.folderName || FOLDER_NAME,
    folderUrl: data.folderUrl || 'https://drive.google.com/drive/my-drive',
    spreadsheetId: data.spreadsheetId || 'GAS-SHEET-ID',
    spreadsheetTitle: data.spreadsheetTitle || SPREADSHEET_TITLE,
    spreadsheetUrl: data.spreadsheetUrl || 'https://docs.google.com/spreadsheets',
    lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
  };
}

function isRowEmpty(row: any): boolean {
  if (!row) return true;
  if (Array.isArray(row)) {
    return row.every((cell) => String(cell ?? '').trim() === '');
  }
  if (typeof row === 'object') {
    return Object.values(row).every((val) => String(val ?? '').trim() === '');
  }
  return String(row).trim() === '';
}

function isStudentHeaderRow(row: any[]): boolean {
  const joined = row
    .map((c) => String(c ?? '').toLowerCase().trim())
    .join(' | ');
  return (
    joined.includes('id siswa') ||
    joined.includes('id_siswa') ||
    joined.includes('nama lengkap') ||
    joined.includes('nama_lengkap') ||
    joined.includes('nama siswa') ||
    (joined.includes('nisn') && joined.includes('kelas')) ||
    (joined.includes('nama') && joined.includes('kelas'))
  );
}

/**
 * Smart parser for Data_Siswa rows:
 * Handles full 11-column app sheets, custom 2-4 column sheets (e.g. NISN | Nama | Kelas, or No | Nama | Kelas),
 * header rows on row 1, or array of JSON objects from custom GAS scripts.
 */
export function parseStudentsFromRows(
  rawRows: any[],
  fallbackStudents: Student[] = []
): Student[] {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  const nonEmpty = rawRows.filter((r) => !isRowEmpty(r));
  if (nonEmpty.length === 0) return [];

  // Handle array of objects (if GAS returned [{ nisn, name, ... }] or [{ "Nama Siswa": ... }])
  if (!Array.isArray(nonEmpty[0]) && typeof nonEmpty[0] === 'object') {
    return nonEmpty
      .map((obj: Record<string, any>, idx: number) => {
        const keys = Object.keys(obj);
        const getByKey = (patterns: string[]) => {
          const foundKey = keys.find((k) =>
            patterns.some((p) => k.toLowerCase().includes(p))
          );
          return foundKey ? String(obj[foundKey] ?? '').trim() : '';
        };
        const name =
          obj.name ||
          getByKey(['nama', 'name', 'siswa', 'peserta']) ||
          String(Object.values(obj)[0] ?? '').trim();
        if (!name || name.toLowerCase() === 'nama lengkap') return null;
        const nisn =
          obj.nisn ||
          getByKey(['nisn', 'induk']) ||
          `008400${String(idx + 1).padStart(4, '0')}`;
        const id =
          obj.id ||
          getByKey(['id_siswa', 'id siswa', 'id', 'kode']) ||
          `SIS-DB-${String(idx + 1).padStart(3, '0')}`;
        const className =
          obj.className || getByKey(['kelas', 'class', 'rombel']) || 'XII MIPA 1';
        const email =
          obj.email ||
          getByKey(['email', 'surel']) ||
          `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@sekolah.sch.id`;
        const statusRaw = obj.status || getByKey(['status']) || 'Aktif';
        const joinedAt =
          obj.joinedAt ||
          getByKey(['tanggal', 'terdaftar', 'join']) ||
          new Date().toISOString().slice(0, 10);

        return {
          id: String(id),
          nisn: String(nisn),
          name: String(name),
          className: String(className),
          email: String(email),
          status: String(statusRaw).toLowerCase().includes('non')
            ? 'Nonaktif'
            : 'Aktif',
          joinedAt: String(joinedAt),
        } as Student;
      })
      .filter((s): s is Student => s !== null);
  }

  // Handle 2D array of spreadsheet cells
  const rows2D = nonEmpty.map((r) => (Array.isArray(r) ? r : [r]));
  let headerMap: {
    id?: number;
    nisn?: number;
    name?: number;
    className?: number;
    email?: number;
    status?: number;
    joinedAt?: number;
  } | null = null;

  let dataRows = rows2D;
  if (isStudentHeaderRow(rows2D[0])) {
    headerMap = {};
    rows2D[0].forEach((cell, colIdx) => {
      const h = String(cell ?? '').toLowerCase().trim();
      if ((h.includes('id') || h === 'no' || h === 'nomor') && !h.includes('nisn')) {
        if (headerMap!.id === undefined) headerMap!.id = colIdx;
      } else if (h.includes('nisn') || h.includes('induk')) {
        headerMap!.nisn = colIdx;
      } else if (h.includes('nama') || h.includes('name') || h.includes('siswa')) {
        if (headerMap!.name === undefined) headerMap!.name = colIdx;
      } else if (h.includes('kelas') || h.includes('class') || h.includes('rombel')) {
        headerMap!.className = colIdx;
      } else if (h.includes('email') || h.includes('surel')) {
        headerMap!.email = colIdx;
      } else if (h.includes('status')) {
        headerMap!.status = colIdx;
      } else if (h.includes('tanggal') || h.includes('terdaftar')) {
        headerMap!.joinedAt = colIdx;
      }
    });
    dataRows = rows2D.slice(1);
  }

  return dataRows
    .map((r, idx): Student | null => {
      const cells = r.map((c) => String(c ?? '').trim());
      if (cells.every((c) => c === '')) return null;
      // Skip accidental repeated header rows
      if (isStudentHeaderRow(cells)) return null;

      let id = '';
      let nisn = '';
      let name = '';
      let className = '';
      let email = '';
      let status = 'Aktif';
      let joinedAt = '';

      if (headerMap && headerMap.name !== undefined) {
        id = headerMap.id !== undefined ? cells[headerMap.id] || '' : '';
        nisn = headerMap.nisn !== undefined ? cells[headerMap.nisn] || '' : '';
        name = cells[headerMap.name] || '';
        className =
          headerMap.className !== undefined ? cells[headerMap.className] || '' : '';
        email = headerMap.email !== undefined ? cells[headerMap.email] || '' : '';
        status = headerMap.status !== undefined ? cells[headerMap.status] || '' : 'Aktif';
        joinedAt =
          headerMap.joinedAt !== undefined ? cells[headerMap.joinedAt] || '' : '';
      } else if (cells.length >= 4 && cells[2] !== '') {
        // Standard 4+ column layout: ID | NISN | Nama | Kelas | Email | Status | Tanggal
        id = cells[0];
        nisn = cells[1];
        name = cells[2];
        className = cells[3];
        email = cells[4] || '';
        status = cells[5] || 'Aktif';
        joinedAt = cells[6] || '';
      } else if (cells.length === 3) {
        // 3 columns: could be [NISN, Nama, Kelas] or [No/ID, Nama, Kelas] or [ID, NISN, Nama]
        const c0Digits = /^\d{5,}$/.test(cells[0]);
        const c1Digits = /^\d{5,}$/.test(cells[1]);
        if (c1Digits) {
          id = cells[0];
          nisn = cells[1];
          name = cells[2];
        } else if (c0Digits) {
          nisn = cells[0];
          name = cells[1];
          className = cells[2];
        } else {
          id = cells[0];
          name = cells[1];
          className = cells[2];
        }
      } else if (cells.length === 2) {
        // 2 columns: [NISN, Nama] or [Nama, Kelas]
        if (/^\d{4,}$/.test(cells[0])) {
          nisn = cells[0];
          name = cells[1];
        } else {
          name = cells[0];
          className = cells[1];
        }
      } else {
        // 1 column or sparse columns: find first non-empty non-numeric cell as name
        const nonBlank = cells.filter(Boolean);
        if (nonBlank.length === 1) {
          name = nonBlank[0];
        } else if (nonBlank.length >= 2) {
          nisn = /^\d+$/.test(nonBlank[0]) ? nonBlank[0] : '';
          name = /^\d+$/.test(nonBlank[0]) ? nonBlank[1] : nonBlank[0];
          className = nonBlank[2] || '';
        }
      }

      if (!name) {
        const firstText = cells.find((c) => c && !/^\d+$/.test(c));
        name = firstText || cells.find(Boolean) || '';
      }
      if (!name) return null;

      const existing = fallbackStudents.find(
        (st) =>
          (id && st.id === id) ||
          (nisn && st.nisn === nisn) ||
          st.name.toLowerCase() === name.toLowerCase()
      );

      const finalId =
        id || existing?.id || `SIS-DB-${String(idx + 1).padStart(3, '0')}`;
      const finalNisn =
        nisn || existing?.nisn || `008400${String(idx + 1).padStart(4, '0')}`;
      const finalClass = className || existing?.className || 'XII MIPA 1';
      const finalEmail =
        email ||
        existing?.email ||
        `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@sekolah.sch.id`;
      const finalStatus: Student['status'] = String(status)
        .toLowerCase()
        .includes('non')
        ? 'Nonaktif'
        : 'Aktif';
      const finalJoined =
        joinedAt || existing?.joinedAt || new Date().toISOString().slice(0, 10);

      return {
        id: finalId,
        nisn: finalNisn,
        name,
        className: finalClass,
        email: finalEmail,
        status: finalStatus,
        joinedAt: finalJoined,
      };
    })
    .filter((st): st is Student => st !== null);
}

function isQuestionHeaderRow(row: any[]): boolean {
  const joined = row
    .map((c) => String(c ?? '').toLowerCase().trim())
    .join(' | ');
  return (
    joined.includes('id soal') ||
    joined.includes('id_soal') ||
    joined.includes('pertanyaan soal') ||
    joined.includes('kunci jawaban') ||
    (joined.includes('topik') && joined.includes('bobot'))
  );
}

export function parseQuestionsFromRows(
  rawRows: any[],
  fallbackQuestions: Question[] = []
): Question[] {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];
  const nonEmpty = rawRows.filter((r) => !isRowEmpty(r));
  if (nonEmpty.length === 0) return [];

  if (!Array.isArray(nonEmpty[0]) && typeof nonEmpty[0] === 'object') {
    return nonEmpty
      .map((obj: Record<string, any>, idx: number) => {
        const text = String(
          obj.text || obj.pertanyaan || obj.question || Object.values(obj)[0] || ''
        ).trim();
        if (!text) return null;
        const id = String(obj.id || `SOAL-DB-${String(idx + 1).padStart(3, '0')}`);
        const existing = fallbackQuestions.find((q) => q.id === id);
        return {
          id,
          topic: String(obj.topic || obj.topik || existing?.topic || 'Evaluasi Umum'),
          type: (obj.type || existing?.type || 'multiple_choice') as Question['type'],
          difficulty: (obj.difficulty ||
            existing?.difficulty ||
            'Sedang') as Question['difficulty'],
          points: Number(obj.points || obj.bobot || existing?.points || 15),
          mediaType: (obj.mediaType ||
            existing?.mediaType ||
            'none') as Question['mediaType'],
          mediaUrl: obj.mediaUrl || existing?.mediaUrl,
          mediaCaption: obj.mediaCaption || existing?.mediaCaption,
          formulaText: obj.formulaText || existing?.formulaText,
          audioFreq: obj.audioFreq || existing?.audioFreq,
          text,
          options:
            Array.isArray(obj.options) && obj.options.length > 0
              ? obj.options
              : existing?.options || [
                  { id: 'A', label: 'Pilihan A' },
                  { id: 'B', label: 'Pilihan B' },
                  { id: 'C', label: 'Pilihan C' },
                  { id: 'D', label: 'Pilihan D' },
                ],
          correctAnswers:
            Array.isArray(obj.correctAnswers) && obj.correctAnswers.length > 0
              ? obj.correctAnswers
              : existing?.correctAnswers || ['A'],
          explanation: String(
            obj.explanation ||
              obj.pembahasan ||
              existing?.explanation ||
              'Pembahasan diambil dari database Google Sheets.'
          ),
          createdAt: obj.createdAt || existing?.createdAt || new Date().toISOString(),
        } as Question;
      })
      .filter((q): q is Question => q !== null);
  }

  const rows2D = nonEmpty.map((r) => (Array.isArray(r) ? r : [r]));
  const dataRows = isQuestionHeaderRow(rows2D[0]) ? rows2D.slice(1) : rows2D;

  return dataRows
    .map((r, idx): Question | null => {
      const cells = r.map((c) => String(c ?? '').trim());
      if (cells.every((c) => c === '')) return null;
      if (isQuestionHeaderRow(cells)) return null;

      const id =
        cells[0] && cells.length >= 3
          ? cells[0]
          : `SOAL-DB-${String(idx + 1).padStart(3, '0')}`;
      const existing = fallbackQuestions.find((q) => q.id === id);

      // Standard 7+ column layout vs compact layout
      const text =
        cells.length >= 7 && cells[6]
          ? cells[6]
          : cells.find((c, i) => i > 0 && c.length > 12) ||
            cells[1] ||
            cells[0] ||
            '';
      if (!text) return null;

      const rawOptions =
        cells[7] ||
        existing?.options.map((o) => `${o.id}: ${o.label}`).join(' | ') ||
        'A: Pilihan A | B: Pilihan B | C: Pilihan C | D: Pilihan D';
      const options = rawOptions
        .split('|')
        .map((part) => {
          const [idPart, ...labelParts] = part.trim().split(':');
          return {
            id: (idPart || 'A').trim(),
            label: labelParts.join(':').trim() || (idPart || 'Opsi').trim(),
          };
        })
        .filter((o) => o.id);

      const rawCorrect = (cells[8] || existing?.correctAnswers.join(',') || 'A')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      return {
        id,
        topic: cells[1] && cells.length >= 5 ? cells[1] : existing?.topic || 'Umum',
        type: (['multiple_choice', 'checkboxes', 'true_false', 'short_answer'].includes(
          cells[2]
        )
          ? cells[2]
          : existing?.type || 'multiple_choice') as Question['type'],
        difficulty: (['Mudah', 'Sedang', 'Sulit'].includes(cells[3])
          ? cells[3]
          : existing?.difficulty || 'Sedang') as Question['difficulty'],
        points: Number(cells[4]) || existing?.points || 15,
        mediaType: (['none', 'image', 'audio', 'video', 'formula'].includes(cells[5])
          ? cells[5]
          : existing?.mediaType || 'none') as Question['mediaType'],
        mediaUrl: existing?.mediaUrl,
        mediaCaption: existing?.mediaCaption,
        formulaText: existing?.formulaText,
        audioFreq: existing?.audioFreq,
        text,
        options: options.length > 0 ? options : [{ id: 'A', label: 'Pilihan A' }],
        correctAnswers: rawCorrect.length > 0 ? rawCorrect : ['A'],
        explanation:
          cells[9] ||
          existing?.explanation ||
          'Pembahasan diambil dari database Google Sheets.',
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
    })
    .filter((q): q is Question => q !== null);
}

function isSubmissionHeaderRow(row: any[]): boolean {
  const joined = row
    .map((c) => String(c ?? '').toLowerCase().trim())
    .join(' | ');
  return (
    joined.includes('id hasil') ||
    joined.includes('id_hasil') ||
    joined.includes('id partisipasi') ||
    joined.includes('id_partisipasi') ||
    joined.includes('waktu selesai') ||
    joined.includes('skor perolehan') ||
    joined.includes('nilai akhir')
  );
}

export function parseSubmissionsFromRows(
  rawRows: any[],
  fallbackSubmissions: ExamSubmission[],
  isHistoryFormat = false
): ExamSubmission[] {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];
  const nonEmpty = rawRows.filter((r) => !isRowEmpty(r));
  if (nonEmpty.length === 0) return [];

  if (!Array.isArray(nonEmpty[0]) && typeof nonEmpty[0] === 'object') {
    return nonEmpty
      .map((obj: Record<string, any>, idx: number) => {
        const id = String(obj.id || `SUB-DB-${idx + 1}`);
        const existing = fallbackSubmissions.find((s) => s.id === id);
        const studentName = String(
          obj.studentName || obj.nama || existing?.studentName || ''
        ).trim();
        if (!studentName) return null;
        const totalScore = Number(obj.totalScore ?? existing?.totalScore ?? 80);
        const maxScore = Number(obj.maxScore ?? existing?.maxScore ?? 100);
        const percentage = Number(
          obj.percentage ??
            (maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 80)
        );
        const gradeLetter = (obj.gradeLetter ||
          (percentage >= 85
            ? 'A'
            : percentage >= 75
            ? 'B'
            : percentage >= 60
            ? 'C'
            : percentage >= 45
            ? 'D'
            : 'E')) as ExamSubmission['gradeLetter'];
        return {
          id,
          studentId: String(obj.studentId || existing?.studentId || `SIS-${idx + 1}`),
          studentNisn: String(
            obj.studentNisn || obj.nisn || existing?.studentNisn || '0084192831'
          ),
          studentName,
          className: String(
            obj.className || obj.kelas || existing?.className || 'XII MIPA 1'
          ),
          examTitle: String(
            obj.examTitle || existing?.examTitle || 'Evaluasi Terpadu'
          ),
          startedAt: obj.startedAt || existing?.startedAt || new Date().toISOString(),
          submittedAt:
            obj.submittedAt || existing?.submittedAt || new Date().toISOString(),
          durationSeconds: Number(
            obj.durationSeconds || existing?.durationSeconds || 1200
          ),
          totalScore,
          maxScore,
          percentage,
          gradeLetter,
          passed: obj.passed !== undefined ? Boolean(obj.passed) : percentage >= 75,
          randomizedQuestions: existing?.randomizedQuestions ?? true,
          randomizedOptions: existing?.randomizedOptions ?? true,
          details: Array.isArray(obj.details)
            ? obj.details
            : existing?.details || [],
          syncedToSheets: true,
        } as ExamSubmission;
      })
      .filter((s): s is ExamSubmission => s !== null);
  }

  const rows2D = nonEmpty.map((r) => (Array.isArray(r) ? r : [r]));
  const firstRowJoined = rows2D[0]
    .map((c) => String(c ?? '').toLowerCase())
    .join(' | ');
  const detectedHistory =
    isHistoryFormat ||
    firstRowJoined.includes('id partisipasi') ||
    firstRowJoined.includes('waktu mulai');
  const dataRows = isSubmissionHeaderRow(rows2D[0]) ? rows2D.slice(1) : rows2D;

  return dataRows
    .map((r, idx): ExamSubmission | null => {
      const cells = r.map((c) => String(c ?? '').trim());
      if (cells.every((c) => c === '')) return null;
      if (isSubmissionHeaderRow(cells)) return null;

      const id = cells[0] || `SUB-DB-${idx + 1}`;
      const existing = fallbackSubmissions.find((s) => s.id === id);

      if (detectedHistory && cells.length >= 7) {
        // Riwayat_Partisipasi layout:
        // 0:ID, 1:Mulai, 2:Selesai, 3:Durasi, 4:ID_Siswa, 5:NISN, 6:Nama, 7:Kelas, 8:Paket, 9:Acak, 10:Nilai%, 11:Status
        const studentName = cells[6] || existing?.studentName || '';
        if (!studentName) return null;
        const pctRaw = String(cells[10] || '').replace('%', '').trim();
        const percentage = Number(pctRaw) || existing?.percentage || 80;
        const maxScore = existing?.maxScore || 100;
        const totalScore =
          existing?.totalScore || Math.round((percentage / 100) * maxScore);
        const gradeLetter: ExamSubmission['gradeLetter'] =
          percentage >= 85
            ? 'A'
            : percentage >= 75
            ? 'B'
            : percentage >= 60
            ? 'C'
            : percentage >= 45
            ? 'D'
            : 'E';
        const passed =
          String(cells[11] || '').toUpperCase().includes('LULUS') ||
          percentage >= 75;

        return {
          id,
          studentId: cells[4] || existing?.studentId || `SIS-${idx + 1}`,
          studentNisn: cells[5] || existing?.studentNisn || '0084192831',
          studentName,
          className: cells[7] || existing?.className || 'XII MIPA 1',
          examTitle: cells[8] || existing?.examTitle || 'Ujian Evaluasi',
          startedAt: existing?.startedAt || new Date().toISOString(),
          submittedAt: existing?.submittedAt || new Date().toISOString(),
          durationSeconds: existing?.durationSeconds || 1200,
          totalScore,
          maxScore,
          percentage,
          gradeLetter,
          passed,
          randomizedQuestions: existing?.randomizedQuestions ?? true,
          randomizedOptions: existing?.randomizedOptions ?? true,
          details: existing?.details || INITIAL_SUBMISSIONS[0]?.details || [],
          syncedToSheets: true,
        };
      }

      // Hasil_Ujian layout or compact layout
      const studentName =
        cells[3] || cells[2] || cells[1] || existing?.studentName || '';
      if (!studentName) return null;

      const totalScore = Number(cells[6]) || existing?.totalScore || 80;
      const maxScore = Number(cells[7]) || existing?.maxScore || 100;
      const pctRaw = String(cells[8] || '').replace('%', '').trim();
      const percentage =
        Number(pctRaw) ||
        (maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 80);
      const gradeLetter = (['A', 'B', 'C', 'D', 'E'].includes(cells[9])
        ? cells[9]
        : percentage >= 85
        ? 'A'
        : percentage >= 75
        ? 'B'
        : percentage >= 60
        ? 'C'
        : percentage >= 45
        ? 'D'
        : 'E') as ExamSubmission['gradeLetter'];
      const passed =
        String(cells[10] || '').toUpperCase().includes('LULUS') ||
        percentage >= 75;

      return {
        id,
        studentId: existing?.studentId || `SIS-${idx + 1}`,
        studentNisn: cells[2] || existing?.studentNisn || '0084192831',
        studentName,
        className: cells[4] || existing?.className || 'XII MIPA 1',
        examTitle: cells[5] || existing?.examTitle || 'Ujian Evaluasi',
        startedAt: existing?.startedAt || new Date().toISOString(),
        submittedAt: existing?.submittedAt || new Date().toISOString(),
        durationSeconds: Number(cells[11]) || existing?.durationSeconds || 1200,
        totalScore,
        maxScore,
        percentage,
        gradeLetter,
        passed,
        randomizedQuestions: existing?.randomizedQuestions ?? true,
        randomizedOptions: existing?.randomizedOptions ?? true,
        details: existing?.details || INITIAL_SUBMISSIONS[0]?.details || [],
        syncedToSheets: true,
      };
    })
    .filter((s): s is ExamSubmission => s !== null);
}

/**
 * Helper to fetch rows from a Google Spreadsheet via Google Visualization JSON endpoint
 * if spreadsheetId is known and shared, or if the user pasted a docs.google.com/spreadsheets URL.
 */
async function tryFetchSheetRowsViaGviz(
  spreadsheetId: string,
  sheetName: string
): Promise<any[][] | null> {
  if (!spreadsheetId || spreadsheetId.startsWith('GAS-')) return null;
  try {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      spreadsheetId
    )}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url, {
      method: 'GET',
      referrerPolicy: 'no-referrer-when-downgrade',
    });
    if (!res.ok) return null;
    const text = await res.text();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const table = parsed?.table;
    if (!table || !Array.isArray(table.rows)) return null;

    const cols: string[] = (table.cols || []).map((c: any) =>
      String(c?.label || '').trim()
    );
    const hasLabels = cols.some((c) => c !== '');
    const dataRows: any[][] = table.rows.map((r: any) =>
      (r.c || []).map((cell: any) =>
        cell ? String(cell.f ?? cell.v ?? '').trim() : ''
      )
    );
    return hasLabels ? [cols, ...dataRows] : dataRows;
  } catch {
    return null;
  }
}

/**
 * Fetches data for a specific tab ('Hasil_Ujian' | 'Data_Siswa' | 'Bank_Soal' | 'Riwayat_Partisipasi' | 'ALL')
 * from Google Apps Script Web App (supporting both POST and GET payloads, raw sheet rows, and gviz fallback)
 * or from the synced database snapshot.
 */
export async function fetchFromDatabaseViaGas(
  gasWebAppUrl: string,
  targetTab: DatabaseTabName | 'ALL',
  snapshot?: DatabaseSnapshot,
  knownSpreadsheetId?: string
): Promise<{
  students?: Student[];
  questions?: Question[];
  submissions?: ExamSubmission[];
  dbInfo?: WorkspaceDatabaseInfo;
  source: 'gas_remote' | 'database_snapshot';
}> {
  const trimmedUrl = (gasWebAppUrl || DEFAULT_GAS_URL || '').trim();

  // Safe non-empty fallback pools so we never crash if snapshot is undefined
  const safeSnapshotStudents =
    snapshot?.students && snapshot.students.length > 0
      ? snapshot.students
      : INITIAL_STUDENTS;
  const safeSnapshotQuestions =
    snapshot?.questions && snapshot.questions.length > 0
      ? snapshot.questions
      : INITIAL_QUESTIONS;
  const safeSnapshotSubmissions =
    snapshot?.submissions && snapshot.submissions.length > 0
      ? snapshot.submissions
      : INITIAL_SUBMISSIONS;

  // Check if user pasted a direct Google Sheets URL (https://docs.google.com/spreadsheets/d/...)
  const sheetsIdMatch = trimmedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetsIdMatch && sheetsIdMatch[1]) {
    const sheetId = sheetsIdMatch[1];
    const out: {
      students?: Student[];
      questions?: Question[];
      submissions?: ExamSubmission[];
      source: 'gas_remote';
    } = { source: 'gas_remote' };

    if (targetTab === 'Data_Siswa' || targetTab === 'ALL') {
      const gvizRows = await tryFetchSheetRowsViaGviz(sheetId, 'Data_Siswa');
      const parsed = gvizRows
        ? parseStudentsFromRows(gvizRows, safeSnapshotStudents)
        : [];
      out.students = parsed.length > 0 ? parsed : safeSnapshotStudents;
    }
    if (targetTab === 'Bank_Soal' || targetTab === 'ALL') {
      const gvizRows = await tryFetchSheetRowsViaGviz(sheetId, 'Bank_Soal');
      const parsed = gvizRows
        ? parseQuestionsFromRows(gvizRows, safeSnapshotQuestions)
        : [];
      out.questions = parsed.length > 0 ? parsed : safeSnapshotQuestions;
    }
    if (
      targetTab === 'Hasil_Ujian' ||
      targetTab === 'Riwayat_Partisipasi' ||
      targetTab === 'ALL'
    ) {
      const sheetTab =
        targetTab === 'Riwayat_Partisipasi'
          ? 'Riwayat_Partisipasi'
          : 'Hasil_Ujian';
      const gvizRows = await tryFetchSheetRowsViaGviz(sheetId, sheetTab);
      const parsed = gvizRows
        ? parseSubmissionsFromRows(
            gvizRows,
            safeSnapshotSubmissions,
            sheetTab === 'Riwayat_Partisipasi'
          )
        : [];
      out.submissions = parsed.length > 0 ? parsed : safeSnapshotSubmissions;
    }
    return out;
  }

  if (trimmedUrl.startsWith('https://script.google.com/')) {
    let resJson: any = null;
    let authError: string | null = null;

    // Step 1: Try POST with action: 'fetchData' (Simple Request text/plain & referrerPolicy: no-referrer-when-downgrade)
    try {
      const response = await fetch(trimmedUrl, {
        method: 'POST',
        referrerPolicy: 'no-referrer-when-downgrade',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'fetchData',
          tab: targetTab,
        }),
      });
      if (response.status === 401) {
        authError =
          'Error 401 Unauthorized: Deployment Google Apps Script belum memiliki akses publik. ' +
          'Buka Apps Script > Deploy > New deployment > Execute as: Me > Who has access: Anyone.';
      } else if (response.ok) {
        resJson = await response.json();
      }
    } catch {
      // Try fallback to /api/gas-proxy if browser CORS blocks
      try {
        const proxyRes = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            __targetUrl: trimmedUrl,
            action: 'fetchData',
            tab: targetTab,
          }),
        });
        if (proxyRes.status === 401) {
          authError =
            'Error 401 Unauthorized: Deployment Google Apps Script belum memiliki akses publik. ' +
            'Buka Apps Script > Deploy > New deployment > Execute as: Me > Who has access: Anyone.';
        } else if (proxyRes.ok) {
          resJson = await proxyRes.json();
        }
      } catch {
        resJson = null;
      }
    }

    // Step 2: If POST didn't include data/rows, try GET fallback
    const hasPostPayload =
      resJson &&
      (resJson.data !== undefined ||
        resJson.rows !== undefined ||
        Array.isArray(resJson.Data_Siswa) ||
        Array.isArray(resJson.Hasil_Ujian));

    if (!hasPostPayload && !authError) {
      try {
        const sep = trimmedUrl.includes('?') ? '&' : '?';
        const getUrl = `${trimmedUrl}${sep}action=fetchData&tab=${encodeURIComponent(
          targetTab
        )}`;
        const getRes = await fetch(getUrl, {
          method: 'GET',
          referrerPolicy: 'no-referrer-when-downgrade',
        });
        if (getRes.status === 401) {
          authError =
            'Error 401 Unauthorized: Deployment Google Apps Script belum memiliki akses publik. ' +
            'Buka Apps Script > Deploy > New deployment > Execute as: Me > Who has access: Anyone.';
        } else if (getRes.ok) {
          const getJson = await getRes.json();
          if (getJson && getJson.status !== 'error') {
            resJson = { ...resJson, ...getJson };
          }
        }
      } catch {
        // Fallback GET via proxy
        try {
          const sep = trimmedUrl.includes('?') ? '&' : '?';
          const getUrl = `${trimmedUrl}${sep}action=fetchData&tab=${encodeURIComponent(
            targetTab
          )}`;
          const proxyGet = await fetch(
            `/api/gas-proxy?url=${encodeURIComponent(getUrl)}`,
            {
              method: 'GET',
            }
          );
          if (proxyGet.status === 401) {
            authError =
              'Error 401 Unauthorized: Deployment Google Apps Script belum memiliki akses publik.';
          } else if (proxyGet.ok) {
            const proxyJson = await proxyGet.json();
            if (proxyJson && proxyJson.status !== 'error') {
              resJson = { ...resJson, ...proxyJson };
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (authError) {
      throw new Error(authError);
    }

    if (resJson?.status === 'error') {
      throw new Error(`Google Apps Script Error: ${resJson.message}`);
    }

    const d = resJson?.data || {};
    const r = resJson?.rows || {};
    const effectiveSheetId =
      resJson?.spreadsheetId || knownSpreadsheetId || '';

    const out: {
      students?: Student[];
      questions?: Question[];
      submissions?: ExamSubmission[];
      dbInfo?: WorkspaceDatabaseInfo;
      source: 'gas_remote';
    } = {
      source: 'gas_remote',
      dbInfo: resJson
        ? {
            gasWebAppUrl: trimmedUrl,
            folderId: resJson.folderId || 'GAS-FOLDER-ID',
            folderName: resJson.folderName || FOLDER_NAME,
            folderUrl:
              resJson.folderUrl || 'https://drive.google.com/drive/my-drive',
            spreadsheetId: resJson.spreadsheetId || 'GAS-SHEET-ID',
            spreadsheetTitle: resJson.spreadsheetTitle || SPREADSHEET_TITLE,
            spreadsheetUrl:
              resJson.spreadsheetUrl || 'https://docs.google.com/spreadsheets',
            lastSyncedAt:
              resJson.fetchedAt ||
              resJson.lastSyncedAt ||
              new Date().toISOString(),
          }
        : undefined,
    };

    // --- 1. Resolve Data_Siswa ---
    if (targetTab === 'Data_Siswa' || targetTab === 'ALL') {
      const candidateRows =
        d.Data_Siswa_Rows ||
        r.Data_Siswa ||
        (Array.isArray(d.Data_Siswa) && Array.isArray(d.Data_Siswa[0])
          ? d.Data_Siswa
          : null) ||
        resJson?.Data_Siswa_Rows;

      const modelStudents: Student[] =
        Array.isArray(d.Data_Siswa) &&
        d.Data_Siswa.length > 0 &&
        !Array.isArray(d.Data_Siswa[0])
          ? parseStudentsFromRows(d.Data_Siswa, safeSnapshotStudents)
          : [];

      let parsedFromRows: Student[] = [];
      if (Array.isArray(candidateRows) && candidateRows.length > 0) {
        parsedFromRows = parseStudentsFromRows(candidateRows, [
          ...modelStudents,
          ...safeSnapshotStudents,
        ]);
      }

      if (parsedFromRows.length === 0 && effectiveSheetId) {
        const gvizRows = await tryFetchSheetRowsViaGviz(
          effectiveSheetId,
          'Data_Siswa'
        );
        if (gvizRows && gvizRows.length > 0) {
          parsedFromRows = parseStudentsFromRows(gvizRows, safeSnapshotStudents);
        }
      }

      // Prioritize actual sheet rows first (so edits made directly in Google Sheets appear immediately!)
      if (parsedFromRows.length > 0) {
        out.students = parsedFromRows;
      } else if (modelStudents.length > 0) {
        out.students = modelStudents;
      } else {
        out.students = safeSnapshotStudents;
      }
    }

    // --- 2. Resolve Bank_Soal ---
    if (targetTab === 'Bank_Soal' || targetTab === 'ALL') {
      const candidateRows =
        d.Bank_Soal_Rows ||
        r.Bank_Soal ||
        (Array.isArray(d.Bank_Soal) && Array.isArray(d.Bank_Soal[0])
          ? d.Bank_Soal
          : null) ||
        resJson?.Bank_Soal_Rows;

      const modelQuestions: Question[] =
        Array.isArray(d.Bank_Soal) &&
        d.Bank_Soal.length > 0 &&
        !Array.isArray(d.Bank_Soal[0])
          ? parseQuestionsFromRows(d.Bank_Soal, safeSnapshotQuestions)
          : [];

      let parsedFromRows: Question[] = [];
      if (Array.isArray(candidateRows) && candidateRows.length > 0) {
        parsedFromRows = parseQuestionsFromRows(candidateRows, [
          ...modelQuestions,
          ...safeSnapshotQuestions,
        ]);
      }

      if (parsedFromRows.length === 0 && effectiveSheetId) {
        const gvizRows = await tryFetchSheetRowsViaGviz(
          effectiveSheetId,
          'Bank_Soal'
        );
        if (gvizRows && gvizRows.length > 0) {
          parsedFromRows = parseQuestionsFromRows(
            gvizRows,
            safeSnapshotQuestions
          );
        }
      }

      if (parsedFromRows.length > 0) {
        out.questions = parsedFromRows;
      } else if (modelQuestions.length > 0) {
        out.questions = modelQuestions;
      } else {
        out.questions = safeSnapshotQuestions;
      }
    }

    // --- 3. Resolve Hasil_Ujian & Riwayat_Partisipasi ---
    if (
      targetTab === 'Hasil_Ujian' ||
      targetTab === 'Riwayat_Partisipasi' ||
      targetTab === 'ALL'
    ) {
      const isHistory = targetTab === 'Riwayat_Partisipasi';
      const candidateRows = isHistory
        ? d.Riwayat_Partisipasi_Rows ||
          r.Riwayat_Partisipasi ||
          d.Hasil_Ujian_Rows ||
          r.Hasil_Ujian
        : d.Hasil_Ujian_Rows ||
          r.Hasil_Ujian ||
          d.Riwayat_Partisipasi_Rows ||
          r.Riwayat_Partisipasi;

      const rawModelList = isHistory
        ? d.Riwayat_Partisipasi || d.Hasil_Ujian
        : d.Hasil_Ujian || d.Riwayat_Partisipasi;

      const modelSubmissions: ExamSubmission[] =
        Array.isArray(rawModelList) &&
        rawModelList.length > 0 &&
        !Array.isArray(rawModelList[0])
          ? parseSubmissionsFromRows(
              rawModelList,
              safeSnapshotSubmissions,
              isHistory
            )
          : [];

      let parsedFromRows: ExamSubmission[] = [];
      if (Array.isArray(candidateRows) && candidateRows.length > 0) {
        parsedFromRows = parseSubmissionsFromRows(
          candidateRows,
          [...modelSubmissions, ...safeSnapshotSubmissions],
          isHistory
        );
      }

      if (parsedFromRows.length === 0 && effectiveSheetId) {
        const gvizRows = await tryFetchSheetRowsViaGviz(
          effectiveSheetId,
          isHistory ? 'Riwayat_Partisipasi' : 'Hasil_Ujian'
        );
        if (gvizRows && gvizRows.length > 0) {
          parsedFromRows = parseSubmissionsFromRows(
            gvizRows,
            safeSnapshotSubmissions,
            isHistory
          );
        }
      }

      if (parsedFromRows.length > 0) {
        out.submissions = parsedFromRows;
      } else if (modelSubmissions.length > 0) {
        out.submissions = modelSubmissions;
      } else {
        out.submissions = safeSnapshotSubmissions;
      }
    }

    return out;
  }

  // Fallback to UjianOnline_Database snapshot when running in local/simulated GAS mode
  return {
    source: 'database_snapshot',
    students:
      targetTab === 'Data_Siswa' || targetTab === 'ALL'
        ? safeSnapshotStudents
        : undefined,
    questions:
      targetTab === 'Bank_Soal' || targetTab === 'ALL'
        ? safeSnapshotQuestions
        : undefined,
    submissions:
      targetTab === 'Hasil_Ujian' ||
      targetTab === 'Riwayat_Partisipasi' ||
      targetTab === 'ALL'
        ? safeSnapshotSubmissions.map((s) => ({ ...s, syncedToSheets: true }))
        : undefined,
  };
}

export function exportTabAsCsv(
  tabName: DatabaseTabName,
  students: Student[],
  questions: Question[],
  submissions: ExamSubmission[]
) {
  const tables = buildSheetsTablePayload(students, questions, submissions);
  let header: string[] = [];
  let rows: string[][] = [];

  if (tabName === 'Hasil_Ujian') {
    header = tables.resultsHeader;
    rows = tables.resultsRows;
  } else if (tabName === 'Data_Siswa') {
    header = tables.studentsHeader;
    rows = tables.studentsRows;
  } else if (tabName === 'Bank_Soal') {
    header = tables.questionsHeader;
    rows = tables.questionsRows;
  } else {
    header = tables.historyHeader;
    rows = tables.historyRows;
  }

  const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csvContent = [
    header.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${SPREADSHEET_TITLE}_${tabName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface SharedServerStatePayload {
  isCustomized?: boolean;
  updatedAt?: string;
  gasWebAppUrl?: string;
  teacherProfile?: any;
  teacherPassword?: string;
  examConfig?: any;
  students?: Student[];
  questions?: Question[];
  submissions?: ExamSubmission[];
  dbInfo?: WorkspaceDatabaseInfo | null;
}

export async function fetchServerSharedState(): Promise<SharedServerStatePayload | null> {
  try {
    const res = await fetch('/api/state', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as SharedServerStatePayload;
  } catch {
    return null;
  }
}

export async function saveServerSharedState(
  payload: SharedServerStatePayload
): Promise<void> {
  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore network errors in offline preview
  }
}

export async function appendServerSubmission(
  submission: ExamSubmission,
  newStudent?: Student
): Promise<void> {
  try {
    await fetch('/api/submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission, newStudent }),
    });
  } catch {
    // ignore
  }
}

export function buildShareableAppUrl(gasWebAppUrl?: string): string {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const params = new URLSearchParams();
  const effectiveGas = (gasWebAppUrl || DEFAULT_GAS_URL || '').trim();
  if (effectiveGas) {
    params.set('gas', effectiveGas);
  }
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}


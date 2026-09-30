import {
  Question,
  Student,
  ExamSubmission,
  WorkspaceDatabaseInfo,
} from '../types/exam';

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

function ensureDatabaseInDrive() {
  let folder;
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(FOLDER_NAME);
  }

  let spreadsheet;
  const files = folder.getFilesByName(SPREADSHEET_TITLE);
  if (files.hasNext()) {
    const file = files.next();
    spreadsheet = SpreadsheetApp.openById(file.getId());
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_TITLE);
    const ssFile = DriveApp.getFileById(spreadsheet.getId());
    ssFile.moveTo(folder);
  }

  const existingSheets = spreadsheet.getSheets();
  if (existingSheets.length === 1 && existingSheets[0].getName() !== TABS[0]) {
    existingSheets[0].setName(TABS[0]);
  }

  TABS.forEach(function(tabName) {
    let sheet = spreadsheet.getSheetByName(tabName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(tabName);
    }
    sheet.setFrozenRows(1);
  });

  return {
    folderId: folder.getId(),
    folderName: FOLDER_NAME,
    folderUrl: folder.getUrl(),
    spreadsheetId: spreadsheet.getId(),
    spreadsheetTitle: SPREADSHEET_TITLE,
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
  if (lastRow <= 1 || lastCol === 0) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const db = ensureDatabaseInDrive();
    const ss = db.spreadsheet;
    const props = PropertiesService.getScriptProperties();

    if (payload.action === 'syncAll') {
      writeSheetData(
        ss.getSheetByName('Hasil_Ujian'),
        payload.tables.resultsHeader,
        payload.tables.resultsRows
      );
      writeSheetData(
        ss.getSheetByName('Data_Siswa'),
        payload.tables.studentsHeader,
        payload.tables.studentsRows
      );
      writeSheetData(
        ss.getSheetByName('Bank_Soal'),
        payload.tables.questionsHeader,
        payload.tables.questionsRows
      );
      writeSheetData(
        ss.getSheetByName('Riwayat_Partisipasi'),
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

    if (payload.action === 'fetchData') {
      const targetTab = payload.tab || 'ALL';
      const resultData = {};

      if (targetTab === 'Hasil_Ujian' || targetTab === 'ALL') {
        const saved = props.getProperty('MODEL_Hasil_Ujian');
        resultData.Hasil_Ujian = saved ? JSON.parse(saved) : null;
        resultData.Hasil_Ujian_Rows = readSheetRows(ss.getSheetByName('Hasil_Ujian'));
      }
      if (targetTab === 'Data_Siswa' || targetTab === 'ALL') {
        const saved = props.getProperty('MODEL_Data_Siswa');
        resultData.Data_Siswa = saved ? JSON.parse(saved) : null;
        resultData.Data_Siswa_Rows = readSheetRows(ss.getSheetByName('Data_Siswa'));
      }
      if (targetTab === 'Bank_Soal' || targetTab === 'ALL') {
        const saved = props.getProperty('MODEL_Bank_Soal');
        resultData.Bank_Soal = saved ? JSON.parse(saved) : null;
        resultData.Bank_Soal_Rows = readSheetRows(ss.getSheetByName('Bank_Soal'));
      }
      if (targetTab === 'Riwayat_Partisipasi' || targetTab === 'ALL') {
        const saved = props.getProperty('MODEL_Riwayat_Partisipasi');
        resultData.Riwayat_Partisipasi = saved ? JSON.parse(saved) : null;
        resultData.Riwayat_Partisipasi_Rows = readSheetRows(ss.getSheetByName('Riwayat_Partisipasi'));
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          status: 'success',
          tab: targetTab,
          data: resultData,
          folderId: db.folderId,
          folderName: db.folderName,
          folderUrl: db.folderUrl,
          spreadsheetId: db.spreadsheetId,
          spreadsheetTitle: db.spreadsheetTitle,
          spreadsheetUrl: db.spreadsheetUrl,
          fetchedAt: new Date().toISOString()
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'success',
        folderId: db.folderId,
        folderName: db.folderName,
        folderUrl: db.folderUrl,
        spreadsheetId: db.spreadsheetId,
        spreadsheetTitle: db.spreadsheetTitle,
        spreadsheetUrl: db.spreadsheetUrl,
        lastSyncedAt: new Date().toISOString()
      })
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
    const ss = db.spreadsheet;
    const tab = (e && e.parameter && e.parameter.tab) ? e.parameter.tab : 'ALL';
    const rows = {};
    TABS.forEach(function(t) {
      if (tab === 'ALL' || tab === t) {
        rows[t] = readSheetRows(ss.getSheetByName(t));
      }
    });

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'success',
        tab: tab,
        rows: rows,
        folderId: db.folderId,
        folderName: db.folderName,
        folderUrl: db.folderUrl,
        spreadsheetId: db.spreadsheetId,
        spreadsheetTitle: db.spreadsheetTitle,
        spreadsheetUrl: db.spreadsheetUrl,
        lastSyncedAt: new Date().toISOString()
      })
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

  const response = await fetch(trimmedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'syncAll',
      folderName: FOLDER_NAME,
      spreadsheetTitle: SPREADSHEET_TITLE,
      tables,
      rawModels: {
        students,
        questions,
        submissions,
      },
    }),
  });

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

/**
 * Parses raw spreadsheet rows from Google Sheets back into typed models
 * if structured JSON properties aren't present yet (e.g. rows edited directly in Sheets).
 */
function parseStudentsFromRows(rows: any[][]): Student[] {
  return rows
    .filter((r) => r && r.length >= 4 && String(r[2] || '').trim() !== '')
    .map((r, idx) => ({
      id: String(r[0] || `SIS-DB-${idx + 1}`),
      nisn: String(r[1] || `008000${idx + 1}`),
      name: String(r[2] || 'Siswa'),
      className: String(r[3] || 'XII MIPA 1'),
      email: String(r[4] || 'siswa@sekolah.sch.id'),
      status: String(r[5]) === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
      joinedAt: String(r[6] || new Date().toISOString().slice(0, 10)),
    }));
}

function parseQuestionsFromRows(rows: any[][]): Question[] {
  return rows
    .filter((r) => r && r.length >= 7 && String(r[6] || '').trim() !== '')
    .map((r, idx) => {
      const rawOptions = String(r[7] || 'A: Opsi A | B: Opsi B | C: Opsi C | D: Opsi D');
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

      const rawCorrect = String(r[8] || 'A')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      return {
        id: String(r[0] || `SOAL-DB-${idx + 1}`),
        topic: String(r[1] || 'Umum'),
        type: (['multiple_choice', 'checkboxes', 'true_false', 'short_answer'].includes(
          String(r[2])
        )
          ? String(r[2])
          : 'multiple_choice') as Question['type'],
        difficulty: (['Mudah', 'Sedang', 'Sulit'].includes(String(r[3]))
          ? String(r[3])
          : 'Sedang') as Question['difficulty'],
        points: Number(r[4]) || 10,
        mediaType: (['none', 'image', 'audio', 'video', 'formula'].includes(
          String(r[5])
        )
          ? String(r[5])
          : 'none') as Question['mediaType'],
        text: String(r[6] || ''),
        options: options.length > 0 ? options : [{ id: 'A', label: 'Pilihan A' }],
        correctAnswers: rawCorrect.length > 0 ? rawCorrect : ['A'],
        explanation: String(r[9] || 'Pembahasan diambil dari database Google Sheets.'),
        createdAt: new Date().toISOString(),
      };
    });
}

function parseSubmissionsFromResultRows(
  rows: any[][],
  fallbackSubmissions: ExamSubmission[]
): ExamSubmission[] {
  return rows
    .filter((r) => r && r.length >= 4 && String(r[3] || '').trim() !== '')
    .map((r, idx) => {
      const id = String(r[0] || `SUB-DB-${idx + 1}`);
      const existing = fallbackSubmissions.find((s) => s.id === id);
      const totalScore = Number(r[6]) || existing?.totalScore || 80;
      const maxScore = Number(r[7]) || existing?.maxScore || 100;
      const pctRaw = String(r[8] || '').replace('%', '').trim();
      const percentage =
        Number(pctRaw) ||
        (maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 80);
      const gradeLetter = (['A', 'B', 'C', 'D', 'E'].includes(String(r[9]))
        ? String(r[9])
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
        String(r[10] || '').toUpperCase().includes('LULUS') || percentage >= 75;

      return {
        id,
        studentId: existing?.studentId || `SIS-${idx + 1}`,
        studentNisn: String(r[2] || existing?.studentNisn || '0084192831'),
        studentName: String(r[3] || existing?.studentName || 'Siswa Peserta'),
        className: String(r[4] || existing?.className || 'XII MIPA 1'),
        examTitle: String(r[5] || existing?.examTitle || 'Ujian Evaluasi'),
        startedAt: existing?.startedAt || new Date().toISOString(),
        submittedAt: existing?.submittedAt || new Date().toISOString(),
        durationSeconds: Number(r[11]) || existing?.durationSeconds || 900,
        totalScore,
        maxScore,
        percentage,
        gradeLetter,
        passed,
        randomizedQuestions: existing?.randomizedQuestions ?? true,
        randomizedOptions: existing?.randomizedOptions ?? true,
        details: existing?.details || [],
        syncedToSheets: true,
      };
    });
}

/**
 * Fetches data for a specific tab ('Hasil_Ujian' | 'Data_Siswa' | 'Bank_Soal' | 'Riwayat_Partisipasi' | 'ALL')
 * from Google Apps Script Web App or from the synced database snapshot.
 */
export async function fetchFromDatabaseViaGas(
  gasWebAppUrl: string,
  targetTab: DatabaseTabName | 'ALL',
  snapshot: DatabaseSnapshot
): Promise<{
  students?: Student[];
  questions?: Question[];
  submissions?: ExamSubmission[];
  dbInfo?: WorkspaceDatabaseInfo;
  source: 'gas_remote' | 'database_snapshot';
}> {
  const trimmedUrl = gasWebAppUrl.trim();

  if (trimmedUrl.startsWith('https://script.google.com/')) {
    const response = await fetch(trimmedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'fetchData',
        tab: targetTab,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Gagal mengambil data dari Google Apps Script (${response.status}). Pastikan Web App di-deploy dengan akses "Anyone".`
      );
    }

    const resJson = await response.json();
    if (resJson.status === 'error') {
      throw new Error(`Google Apps Script Error: ${resJson.message}`);
    }

    const d = resJson.data || {};
    const out: {
      students?: Student[];
      questions?: Question[];
      submissions?: ExamSubmission[];
      dbInfo?: WorkspaceDatabaseInfo;
      source: 'gas_remote';
    } = {
      source: 'gas_remote',
      dbInfo: {
        gasWebAppUrl: trimmedUrl,
        folderId: resJson.folderId || 'GAS-FOLDER-ID',
        folderName: resJson.folderName || FOLDER_NAME,
        folderUrl: resJson.folderUrl || 'https://drive.google.com/drive/my-drive',
        spreadsheetId: resJson.spreadsheetId || 'GAS-SHEET-ID',
        spreadsheetTitle: resJson.spreadsheetTitle || SPREADSHEET_TITLE,
        spreadsheetUrl:
          resJson.spreadsheetUrl || 'https://docs.google.com/spreadsheets',
        lastSyncedAt: resJson.fetchedAt || new Date().toISOString(),
      },
    };

    if (targetTab === 'Data_Siswa' || targetTab === 'ALL') {
      if (Array.isArray(d.Data_Siswa) && d.Data_Siswa.length > 0) {
        out.students = d.Data_Siswa;
      } else if (Array.isArray(d.Data_Siswa_Rows) && d.Data_Siswa_Rows.length > 0) {
        out.students = parseStudentsFromRows(d.Data_Siswa_Rows);
      } else {
        out.students = snapshot.students;
      }
    }

    if (targetTab === 'Bank_Soal' || targetTab === 'ALL') {
      if (Array.isArray(d.Bank_Soal) && d.Bank_Soal.length > 0) {
        out.questions = d.Bank_Soal;
      } else if (Array.isArray(d.Bank_Soal_Rows) && d.Bank_Soal_Rows.length > 0) {
        out.questions = parseQuestionsFromRows(d.Bank_Soal_Rows);
      } else {
        out.questions = snapshot.questions;
      }
    }

    if (
      targetTab === 'Hasil_Ujian' ||
      targetTab === 'Riwayat_Partisipasi' ||
      targetTab === 'ALL'
    ) {
      const modelList =
        targetTab === 'Riwayat_Partisipasi'
          ? d.Riwayat_Partisipasi || d.Hasil_Ujian
          : d.Hasil_Ujian || d.Riwayat_Partisipasi;
      const rowList = d.Hasil_Ujian_Rows || d.Riwayat_Partisipasi_Rows;

      if (Array.isArray(modelList) && modelList.length > 0) {
        out.submissions = modelList;
      } else if (Array.isArray(rowList) && rowList.length > 0) {
        out.submissions = parseSubmissionsFromResultRows(
          rowList,
          snapshot.submissions
        );
      } else {
        out.submissions = snapshot.submissions;
      }
    }

    return out;
  }

  // Fallback to UjianOnline_Database snapshot when running in local/simulated GAS mode
  return {
    source: 'database_snapshot',
    students:
      targetTab === 'Data_Siswa' || targetTab === 'ALL'
        ? snapshot.students
        : undefined,
    questions:
      targetTab === 'Bank_Soal' || targetTab === 'ALL'
        ? snapshot.questions
        : undefined,
    submissions:
      targetTab === 'Hasil_Ujian' ||
      targetTab === 'Riwayat_Partisipasi' ||
      targetTab === 'ALL'
        ? snapshot.submissions.map((s) => ({ ...s, syncedToSheets: true }))
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

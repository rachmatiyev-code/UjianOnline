import {
  Question,
  Student,
  ExamSubmission,
  WorkspaceDatabaseInfo,
} from '../types/exam';

export const FOLDER_NAME = 'UjianOnline_Database';
export const SPREADSHEET_TITLE = 'UjianOnline_Master_Database';

export const TAB_NAMES = {
  RESULTS: 'Hasil_Ujian',
  STUDENTS: 'Data_Siswa',
  QUESTIONS: 'Bank_Soal',
  HISTORY: 'Riwayat_Partisipasi',
};

/**
 * Complete Google Apps Script (Code.gs) template.
 * Uses native DriveApp & SpreadsheetApp (Zero Firebase dependency) to automatically:
 * 1. Find or create folder "UjianOnline_Database" in Google Drive.
 * 2. Find or create spreadsheet "UjianOnline_Master_Database" inside that folder.
 * 3. Create and populate 4 structured tabs: Hasil_Ujian, Data_Siswa, Bank_Soal, Riwayat_Partisipasi.
 * 4. Expose doPost(e) and doGet(e) Web App endpoints for real-time two-way sync.
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * UjianOnline — Google Apps Script Backend (Code.gs)
 * Tanpa Firebase — Menggunakan DriveApp & SpreadsheetApp Bawaan Google
 *
 * Cara Penggunaan:
 * 1. Buka https://script.google.com dan buat proyek baru.
 * 2. Tempel seluruh kode ini ke dalam file Code.gs lalu simpan.
 * 3. Klik "Deploy" > "New deployment" > Pilih jenis "Web app".
 * 4. Execute as: "Me" | Who has access: "Anyone".
 * 5. Salin Web App URL (https://script.google.com/macros/s/.../exec) ke aplikasi UjianOnline.
 */

const FOLDER_NAME = 'UjianOnline_Database';
const SPREADSHEET_TITLE = 'UjianOnline_Master_Database';
const TABS = ['Hasil_Ujian', 'Data_Siswa', 'Bank_Soal', 'Riwayat_Partisipasi'];

function ensureDatabaseInDrive() {
  // 1. Cari atau buat folder khusus "UjianOnline_Database"
  let folder;
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(FOLDER_NAME);
  }

  // 2. Cari atau buat spreadsheet di dalam folder "UjianOnline_Database"
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

  // 3. Pastikan 4 lembar kerja (tab) tersedia
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

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const db = ensureDatabaseInDrive();
    const ss = db.spreadsheet;

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
      // text/plain prevents browser CORS preflight OPTIONS failure on Google Apps Script endpoints
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'syncAll',
      folderName: FOLDER_NAME,
      spreadsheetTitle: SPREADSHEET_TITLE,
      tables,
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

export function exportTabAsCsv(
  tabName: 'Hasil_Ujian' | 'Data_Siswa' | 'Bank_Soal' | 'Riwayat_Partisipasi',
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

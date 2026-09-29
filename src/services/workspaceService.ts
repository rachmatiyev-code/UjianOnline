import {
  Question,
  Student,
  ExamSubmission,
  WorkspaceDatabaseInfo,
} from '../types/exam';

const FOLDER_NAME = 'UjianOnline_Database';
const SPREADSHEET_TITLE = 'UjianOnline_Master_Database';

const TAB_NAMES = {
  RESULTS: 'Hasil_Ujian',
  STUDENTS: 'Data_Siswa',
  QUESTIONS: 'Bank_Soal',
  HISTORY: 'Riwayat_Partisipasi',
};

async function fetchWithAuth(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google API Error (${res.status}): ${errText}`);
  }
  return res.json();
}

/**
 * Finds or creates the dedicated "UjianOnline_Database" folder in Google Drive,
 * then finds or creates the Master Google Sheets database inside that folder
 * with all 4 required sheets (Hasil_Ujian, Data_Siswa, Bank_Soal, Riwayat_Partisipasi).
 */
export async function ensureDatabaseStructure(
  accessToken: string
): Promise<WorkspaceDatabaseInfo> {
  // 1. Search for folder "UjianOnline_Database"
  const folderQuery = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and name = '${FOLDER_NAME}' and trashed = false`
  );
  const folderSearch = await fetchWithAuth(
    `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id,name,webViewLink)`,
    accessToken
  );

  let folderId: string;
  let folderUrl: string;

  if (folderSearch.files && folderSearch.files.length > 0) {
    folderId = folderSearch.files[0].id;
    folderUrl =
      folderSearch.files[0].webViewLink ||
      `https://drive.google.com/drive/folders/${folderId}`;
  } else {
    // Create folder "UjianOnline_Database"
    const createdFolder = await fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          name: FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      }
    );
    folderId = createdFolder.id;
    folderUrl =
      createdFolder.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;
  }

  // 2. Search for spreadsheet inside "UjianOnline_Database"
  const sheetQuery = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.spreadsheet' and name = '${SPREADSHEET_TITLE}' and '${folderId}' in parents and trashed = false`
  );
  const sheetSearch = await fetchWithAuth(
    `https://www.googleapis.com/drive/v3/files?q=${sheetQuery}&fields=files(id,name,webViewLink)`,
    accessToken
  );

  let spreadsheetId: string;
  let spreadsheetUrl: string;

  if (sheetSearch.files && sheetSearch.files.length > 0) {
    spreadsheetId = sheetSearch.files[0].id;
    spreadsheetUrl =
      sheetSearch.files[0].webViewLink ||
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  } else {
    // Create spreadsheet directly inside UjianOnline_Database folder via Drive API
    const createdSheetFile = await fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          name: SPREADSHEET_TITLE,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [folderId],
        }),
      }
    );
    spreadsheetId = createdSheetFile.id;
    spreadsheetUrl =
      createdSheetFile.webViewLink ||
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  // 3. Inspect existing sheet tabs via Sheets API metadata (never hardcode "Sheet1")
  const meta = await fetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    accessToken
  );
  const existingSheets: { title: string; sheetId: number }[] = (meta.sheets || []).map(
    (s: any) => ({
      title: s.properties?.title || '',
      sheetId: s.properties?.sheetId ?? 0,
    })
  );

  const existingTitles = new Set(existingSheets.map((s) => s.title));
  const requiredTabs = [
    TAB_NAMES.RESULTS,
    TAB_NAMES.STUDENTS,
    TAB_NAMES.QUESTIONS,
    TAB_NAMES.HISTORY,
  ];

  const requests: any[] = [];

  // If the first default tab is not one of our required tabs and we have no required tabs yet, rename the first tab to Hasil_Ujian
  if (
    existingSheets.length === 1 &&
    !existingTitles.has(TAB_NAMES.RESULTS) &&
    existingSheets[0].title !== TAB_NAMES.RESULTS
  ) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: existingSheets[0].sheetId,
          title: TAB_NAMES.RESULTS,
        },
        fields: 'title',
      },
    });
    existingTitles.add(TAB_NAMES.RESULTS);
  }

  for (const tabTitle of requiredTabs) {
    if (!existingTitles.has(tabTitle)) {
      requests.push({
        addSheet: {
          properties: {
            title: tabTitle,
            gridProperties: {
              rowCount: 1000,
              columnCount: 15,
              frozenRowCount: 1,
            },
          },
        },
      });
    }
  }

  if (requests.length > 0) {
    await fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );
  }

  return {
    folderId,
    folderName: FOLDER_NAME,
    folderUrl,
    spreadsheetId,
    spreadsheetTitle: SPREADSHEET_TITLE,
    spreadsheetUrl,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Synchronizes all 4 sheets (Hasil_Ujian, Data_Siswa, Bank_Soal, Riwayat_Partisipasi)
 * with current application data.
 */
export async function syncAllDataToSheets(
  accessToken: string,
  dbInfo: WorkspaceDatabaseInfo,
  students: Student[],
  questions: Question[],
  submissions: ExamSubmission[]
): Promise<string> {
  const { spreadsheetId } = dbInfo;

  // Build rows for Hasil_Ujian
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

  // Build rows for Data_Siswa (with aggregated participation metrics)
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

  // Build rows for Bank_Soal
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

  // Build rows for Riwayat_Partisipasi (granular per-attempt & per-topic log)
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

  // Clear existing ranges first so deleted items don't leave stale rows
  await fetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: [
          `${TAB_NAMES.RESULTS}!A1:Z1000`,
          `${TAB_NAMES.STUDENTS}!A1:Z1000`,
          `${TAB_NAMES.QUESTIONS}!A1:Z1000`,
          `${TAB_NAMES.HISTORY}!A1:Z1000`,
        ],
      }),
    }
  );

  // Batch update all 4 tabs
  await fetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${TAB_NAMES.RESULTS}!A1`,
            values: [resultsHeader, ...resultsRows],
          },
          {
            range: `${TAB_NAMES.STUDENTS}!A1`,
            values: [studentsHeader, ...studentsRows],
          },
          {
            range: `${TAB_NAMES.QUESTIONS}!A1`,
            values: [questionsHeader, ...questionsRows],
          },
          {
            range: `${TAB_NAMES.HISTORY}!A1`,
            values: [historyHeader, ...historyRows],
          },
        ],
      }),
    }
  );

  return new Date().toISOString();
}

export type QuestionType = 'multiple_choice' | 'checkboxes' | 'true_false' | 'short_answer';

export type MediaType = 'none' | 'image' | 'audio' | 'video' | 'formula';

export type DifficultyLevel = 'Mudah' | 'Sedang' | 'Sulit';

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  topic: string;
  type: QuestionType;
  text: string;
  mediaType: MediaType;
  mediaUrl?: string;
  mediaCaption?: string;
  audioFreq?: number;
  formulaText?: string;
  options: QuestionOption[];
  correctAnswers: string[];
  points: number;
  difficulty: DifficultyLevel;
  explanation: string;
  createdAt: string;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  className: string;
  email: string;
  status: 'Aktif' | 'Nonaktif';
  joinedAt: string;
}

export interface QuestionResultDetail {
  questionId: string;
  questionText: string;
  topic: string;
  studentAnswers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  explanation: string;
}

export interface ExamSubmission {
  id: string;
  studentId: string;
  studentNisn: string;
  studentName: string;
  className: string;
  examTitle: string;
  startedAt: string;
  submittedAt: string;
  durationSeconds: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  gradeLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  passed: boolean;
  randomizedQuestions: boolean;
  randomizedOptions: boolean;
  details: QuestionResultDetail[];
  syncedToSheets?: boolean;
}

export interface ExamConfig {
  title: string;
  description: string;
  passingGrade: number;
  durationMinutes: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showImmediateExplanation: boolean;
}

export interface WorkspaceDatabaseInfo {
  folderId: string;
  folderName: string;
  folderUrl: string;
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncedAt: string | null;
}

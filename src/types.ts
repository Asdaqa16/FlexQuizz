export type ViewMode = 
  | 'landing' 
  | 'login' 
  | 'dashboard' 
  | 'active-quiz' 
  | 'quiz-results'
  | 'quizzes-list'
  | 'leaderboard'
  | 'analytics'
  | 'settings';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  hint: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: Question[];
  totalQuestions: number;
  timeLimitMinutes?: number;
}

export interface UserAnswer {
  questionId: number;
  selectedOptionIndex: number | null;
  isFlagged?: boolean;
  isMarkedForReview?: boolean;
}

export interface QuizResult {
  quizId: string;
  quizTitle: string;
  scorePercentage: number;
  totalQuestions: number;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  timeSpentSeconds: number;
  dateCompleted: string;
  userAnswers: Record<number, number | null>; // questionId -> selectedIndex
  topicBreakdown: Array<{
    topicName: string;
    score: number;
    total: number;
    masteryPercentage: number;
  }>;
}

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
  email: string;
  totalQuizzesAttempted: number;
  averageScore: number;
  bestScore: number;
  accuracy: number;
  streakDays: number;
  overallProgress: number;
}

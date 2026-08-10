import React from 'react';
import { ViewMode, Quiz, UserProfile } from '../../types';

interface DashboardViewProps {
  setCurrentView: (view: ViewMode) => void;
  userProfile: UserProfile;
  onStartQuiz: (quiz: Quiz) => void;
  sampleQuizzes: Quiz[];
  recentHistory: Array<{ id: string; title: string; topic: string; score: number; date: string; icon: string; difficulty: string }>;
  onOpenUploadModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setCurrentView,
  userProfile,
  onStartQuiz,
  sampleQuizzes,
  recentHistory,
  onOpenUploadModal,
}) => {
  const pythonQuiz = sampleQuizzes.find((q) => q.id === 'python-basics') || sampleQuizzes[0];

  return (
    <div className="space-y-8 text-left">
      
      {/* Top Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#d8d7e8] shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222138] tracking-tight">
            Welcome back, Alex! 👋
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Let's keep learning and improving your quiz accuracy today.
          </p>
        </div>
      </div>

      {/* 6 Stat Cards Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-[#d8d7e8] shadow-xs hover:border-[#7372A5]/50 transition-all">
          <div className="w-8 h-8 rounded-xl bg-[#ececf4] text-[#7372A5] flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg">quiz</span>
          </div>
          <span className="text-xs font-medium text-gray-500 block">Quizzes Attempted</span>
          <span className="text-2xl font-extrabold text-[#222138] mt-0.5 block">
            {userProfile.totalQuizzesAttempted}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d8d7e8] shadow-xs hover:border-[#7372A5]/50 transition-all">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg">analytics</span>
          </div>
          <span className="text-xs font-medium text-gray-500 block">Average Score</span>
          <span className="text-2xl font-extrabold text-[#222138] mt-0.5 block">
            {userProfile.averageScore}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d8d7e8] shadow-xs hover:border-[#7372A5]/50 transition-all">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg">trophy</span>
          </div>
          <span className="text-xs font-medium text-gray-500 block">Best Score</span>
          <span className="text-2xl font-extrabold text-[#222138] mt-0.5 block">
            {userProfile.bestScore}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d8d7e8] shadow-xs hover:border-[#7372A5]/50 transition-all">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg">published_with_changes</span>
          </div>
          <span className="text-xs font-medium text-gray-500 block">Accuracy</span>
          <span className="text-2xl font-extrabold text-[#222138] mt-0.5 block">
            {userProfile.accuracy}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d8d7e8] shadow-xs hover:border-[#7372A5]/50 transition-all">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg">local_fire_department</span>
          </div>
          <span className="text-xs font-medium text-gray-500 block">Current Streak</span>
          <span className="text-2xl font-extrabold text-[#222138] mt-0.5 block">
            {userProfile.streakDays} Days
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d8d7e8] shadow-xs hover:border-[#7372A5]/50 transition-all">
          <div className="w-8 h-8 rounded-xl bg-[#ececf4] text-[#7372A5] flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg">flag</span>
          </div>
          <span className="text-xs font-medium text-gray-500 block">Overall Progress</span>
          <span className="text-2xl font-extrabold text-[#222138] mt-0.5 block">
            {userProfile.overallProgress}%
          </span>
        </div>

      </div>

      {/* Continue Learning Banner */}
      <div className="bg-[#222138] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 rounded-l-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-gray-200 text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>Resume Activity</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold font-display">
            {pythonQuiz.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-200 font-medium">
            <span className="bg-white/10 px-3 py-1 rounded-lg">Difficulty: {pythonQuiz.difficulty}</span>
            <span className="bg-white/10 px-3 py-1 rounded-lg">{pythonQuiz.totalQuestions} Questions</span>
            <span className="text-amber-300 font-bold">65% Progress</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-amber-300 h-full w-[65%] rounded-full transition-all" />
          </div>

          <button
            onClick={() => onStartQuiz(pythonQuiz)}
            className="mt-2 bg-[#7372A5] hover:bg-[#585785] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2"
          >
            <span>Continue Quiz</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* AI Learning Insight Card */}
      <div className="bg-[#ececf4] border-2 border-[#d8d7e8] rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#7372A5] text-white flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-xl">psychology</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#222138] flex items-center gap-1.5">
              <span>Your Learning Insight</span>
              <span className="text-[10px] bg-white text-[#7372A5] px-2 py-0.5 rounded-full font-extrabold uppercase border border-[#d8d7e8]">AI Recommendation</span>
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-2xl">
              Alex, based on your recent performance, you might want to spend more time practicing <strong>Networking Concepts</strong> and <strong>Control Flow</strong> in Python functions.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const netQuiz = sampleQuizzes.find((q) => q.id === 'networking-basics') || sampleQuizzes[0];
            onStartQuiz(netQuiz);
          }}
          className="shrink-0 bg-white border border-[#d8d7e8] text-[#7372A5] hover:bg-[#f6f6fa] text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
        >
          Practice Weak Topics &rarr;
        </button>
      </div>

      {/* Grid: Performance Donut & Recent Quizzes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Donut Charts Column */}
        <div className="bg-white p-6 rounded-3xl border border-[#d8d7e8] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-[#222138]">Performance Overview</h3>
            <button onClick={() => setCurrentView('analytics')} className="text-xs text-[#7372A5] font-bold hover:underline">
              View Detailed Analytics
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 items-center text-center">
            {/* Overall Donut */}
            <div className="space-y-2">
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#ececf4]"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#7372A5]"
                    strokeDasharray="82, 100"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-extrabold text-[#222138]">82%</span>
                  <span className="text-[10px] text-gray-400 font-semibold">Overall</span>
                </div>
              </div>
              <p className="text-xs font-bold text-[#222138]">Overall Score</p>
            </div>

            {/* Topic Strength Donut */}
            <div className="space-y-2">
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#ececf4]"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray="65, 100"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-extrabold text-[#222138]">65%</span>
                  <span className="text-[10px] text-gray-400 font-semibold">Topic Mastery</span>
                </div>
              </div>
              <p className="text-xs font-bold text-[#222138]">Topic Strength</p>
            </div>
          </div>
        </div>

        {/* Recent Quizzes Column */}
        <div className="bg-white p-6 rounded-3xl border border-[#d8d7e8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-[#222138]">Recent Quizzes</h3>
            <button onClick={() => setCurrentView('quizzes-list')} className="text-xs text-[#7372A5] font-bold hover:underline">
              See All Quizzes
            </button>
          </div>

          <div className="space-y-3">
            {recentHistory.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#f6f6fa] border border-[#d8d7e8] hover:bg-[#ececf4]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ececf4] text-[#7372A5] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-xl">{q.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#222138]">{q.title}</h4>
                    <p className="text-[11px] text-gray-400">{q.topic} • {q.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      q.score >= 80
                        ? 'bg-emerald-100 text-emerald-700'
                        : q.score >= 70
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {q.score}%
                  </span>
                  <button
                    onClick={() => {
                      const match = sampleQuizzes.find((sq) => sq.id === q.id || sq.title.includes(q.topic)) || sampleQuizzes[0];
                      onStartQuiz(match);
                    }}
                    className="text-xs text-[#7372A5] hover:underline font-bold"
                  >
                    Retake
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

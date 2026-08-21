import React, { useState, useEffect } from 'react';
import { ViewMode, Quiz, QuizResult } from './types';
import { INITIAL_USER_PROFILE, SAMPLE_QUIZZES, RECENT_QUIZZES_HISTORY } from './data/sampleData';
import { Sidebar } from './components/Sidebar';
import { QuizUploadModal } from './components/QuizUploadModal';
import { LoginView } from './components/Views/LoginView';
import { LandingView } from './components/Views/LandingView';
import { DashboardView } from './components/Views/DashboardView';
import { ActiveQuizView } from './components/Views/ActiveQuizView';
import { ResultsView } from './components/Views/ResultsView';
import { supabase } from './supabaseClient';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [dyslexiaMode, setDyslexiaMode] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState(INITIAL_USER_PROFILE);
  const [quizzesList, setQuizzesList] = useState<Quiz[]>(SAMPLE_QUIZZES);
  const [recentHistory, setRecentHistory] = useState<
  {
    id: string;
    title: string;
    topic: string;
    score: number;
    date: string;
    icon: string;
    difficulty: string;
  }[]
>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz>(SAMPLE_QUIZZES[0]);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  // Sync Dyslexia Mode class to body
  useEffect(() => {
    if (dyslexiaMode) {
      document.body.classList.add('dyslexia-mode');
    } else {
      document.body.classList.remove('dyslexia-mode');
    }
  }, [dyslexiaMode]);

  const handleStartQuiz = (quizToStart: Quiz) => {
    setActiveQuiz(quizToStart);
    setCurrentView('active-quiz');
  };


  const handleQuizComplete = (result: QuizResult) => {
  setQuizResult(result);
  setRecentHistory((prev) => [
  {
    id: result.quizId,
    title: result.quizTitle,
    topic: activeQuiz?.topic || result.quizTitle,
    score: result.scorePercentage,
    date: 'Just now',
    icon: 'quiz',
    difficulty: activeQuiz?.difficulty || 'Medium',
  },
  ...prev,
].slice(0, 4));

  // Add this quiz to the current session
  setQuizResults((prevResults) => {
    const updatedResults = [...prevResults, result];

    // Calculate real session statistics
    const totalQuizzes = updatedResults.length;

    const averageScore = Math.round(
      updatedResults.reduce(
        (sum, quiz) => sum + quiz.scorePercentage,
        0
      ) / totalQuizzes
    );

    const bestScore = Math.max(
      ...updatedResults.map(
        (quiz) => quiz.scorePercentage
      )
    );

    const totalQuestions = updatedResults.reduce(
      (sum, quiz) => sum + quiz.totalQuestions,
      0
    );

    const totalCorrect = updatedResults.reduce(
      (sum, quiz) => sum + quiz.correctAnswersCount,
      0
    );

    const accuracy = Math.round(
      (totalCorrect / totalQuestions) * 100
    );

    setUserProfile((profile) => ({
      ...profile,
      totalQuizzesAttempted: totalQuizzes,
      averageScore,
      bestScore,
      accuracy,
      overallProgress: averageScore,
    }));

    return updatedResults;
  });

  setCurrentView('quiz-results');
};

  const handleQuizGenerated = async (newQuiz: Quiz) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        difficulty: newQuiz.difficulty,
        total_questions: newQuiz.totalQuestions,
      });

    if (error) {
      console.error('Failed to save quiz:', error);
    }
  }

  setQuizzesList((prev) => [newQuiz, ...prev]);
  handleStartQuiz(newQuiz);
};

  // Full Screen Standalone Views
  if (currentView === 'login') {
    return (
      <LoginView
        setCurrentView={setCurrentView}
        dyslexiaMode={dyslexiaMode}
        setDyslexiaMode={setDyslexiaMode}
      />
    );
  }

  if (currentView === 'landing') {
    return (
      <>
        <LandingView
          setCurrentView={setCurrentView}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onStartDemoQuiz={() => handleStartQuiz(SAMPLE_QUIZZES[0])}
          dyslexiaMode={dyslexiaMode}
          setDyslexiaMode={setDyslexiaMode}
        />
        <QuizUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onQuizGenerated={handleQuizGenerated}
        />
      </>
    );
  }

  if (currentView === 'active-quiz') {
    return (
      <ActiveQuizView
        quiz={activeQuiz}
        setCurrentView={setCurrentView}
        dyslexiaMode={dyslexiaMode}
        setDyslexiaMode={setDyslexiaMode}
        onCompleteQuiz={handleQuizComplete}
      />
    );
  }

  if (currentView === 'quiz-results' && quizResult) {
    return (
      <ResultsView
        quizResult={quizResult}
        quiz={activeQuiz}
        setCurrentView={setCurrentView}
        dyslexiaMode={dyslexiaMode}
        setDyslexiaMode={setDyslexiaMode}
        onRetakeQuiz={() => handleStartQuiz(activeQuiz)}
        onStartAnotherQuiz={() => setCurrentView('landing')}
      />
    );
  }

  // Dashboard & App Layout Views (Only Sidebar nav, no top header nav)
  return (
    <div className="min-h-screen bg-[#f6f6fa] flex flex-col font-sans">
      
      {/* Main Container with Sidebar Navigation */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          dyslexiaMode={dyslexiaMode}
          setDyslexiaMode={setDyslexiaMode}
        />

        {/* Content Pane */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              setCurrentView={setCurrentView}
              userProfile={userProfile}
              onStartQuiz={handleStartQuiz}
              sampleQuizzes={quizzesList}
              recentHistory={recentHistory}
              quizResults={quizResults}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
            />
          )}

          {currentView === 'quizzes-list' && (
            <div className="space-y-6 text-left">
              <div>
                <h1 className="text-2xl font-extrabold text-[#222138]">Available Quizzes</h1>
                <p className="text-xs text-gray-500">Pick a quiz topic to start practicing immediately</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzesList.map((quiz) => (
                  <div key={quiz.id} className="bg-white p-6 rounded-2xl border border-[#d8d7e8] shadow-xs space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="bg-[#ececf4] text-[#7372A5] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-[#d8d7e8]">
                        {quiz.difficulty}
                      </span>
                      <span className="text-xs text-gray-400 font-semibold">{quiz.totalQuestions} Questions</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-[#222138]">{quiz.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{quiz.topic}</p>
                    </div>

                    <button
                      onClick={() => handleStartQuiz(quiz)}
                      className="w-full py-2.5 rounded-xl bg-[#ececf4] hover:bg-[#7372A5] hover:text-white text-[#7372A5] font-bold text-xs transition-colors border border-[#d8d7e8]"
                    >
                      Start Quiz &rarr;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'analytics' && (
            <div className="space-y-6 text-left">
              <h1 className="text-2xl font-extrabold text-[#2b1836]">Analytics & Mastery Radar</h1>
              <div className="bg-white p-8 rounded-3xl border border-purple-100 shadow-xs space-y-6">
                <p className="text-xs text-gray-500">Detailed break-down of your subject domain performance.</p>

                <div className="space-y-4">
                  {[
                    { topic: 'Python Programming', mastery: 90 },
                    { topic: 'Database Systems (DBMS)', mastery: 85 },
                    { topic: 'Computer Networks', mastery: 75 },
                    { topic: 'Object Oriented C++', mastery: 60 },
                  ].map((item) => (
                    <div key={item.topic} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-[#2b1836]">
                        <span>{item.topic}</span>
                        <span className="text-[#8e24aa]">{item.mastery}% Mastery</span>
                      </div>
                      <div className="w-full bg-purple-50 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#8e24aa] to-purple-500 h-full rounded-full"
                          style={{ width: `${item.mastery}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === 'leaderboard' && (
            <div className="space-y-6 text-left">
              <h1 className="text-2xl font-extrabold text-[#2b1836]">Global Student Leaderboard</h1>
              <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-xs space-y-3">
                {[
                  { rank: 1, name: 'Sarah Jenkins', score: 2850, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
                  { rank: 2, name: 'Alex Johnson (You)', score: 2640, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', isUser: true },
                  { rank: 3, name: 'Michael Chen', score: 2410, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
                ].map((st) => (
                  <div
                    key={st.rank}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      st.isUser ? 'bg-purple-50 border-[#8e24aa]/40 font-bold' : 'bg-white border-purple-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center">
                        #{st.rank}
                      </span>
                      <img src={st.avatar} alt={st.name} className="w-9 h-9 rounded-full object-cover" />
                      <span className="text-xs text-[#2b1836] font-bold">{st.name}</span>
                    </div>
                    <span className="text-xs font-bold text-[#8e24aa]">{st.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* AI Material Processing Modal */}
      <QuizUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onQuizGenerated={handleQuizGenerated}
      />

    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { Quiz, QuizResult, ViewMode } from '../../types';

interface ActiveQuizViewProps {
  quiz: Quiz;
  setCurrentView: (view: ViewMode) => void;
  dyslexiaMode: boolean;
  setDyslexiaMode: (enabled: boolean) => void;
  onCompleteQuiz: (result: QuizResult) => void;
}

export const ActiveQuizView: React.FC<ActiveQuizViewProps> = ({
  quiz,
  setCurrentView,
  dyslexiaMode,
  setDyslexiaMode,
  onCompleteQuiz,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [reviewLaterQuestions, setReviewLaterQuestions] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [secondsSpent, setSecondsSpent] = useState(0);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentQuestion = quiz.questions[currentQuestionIndex] || quiz.questions[0];

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handleClearSelection = () => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: null,
    }));
  };

  const handleToggleFlag = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handleToggleReviewLater = () => {
    setReviewLaterQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;
    quiz.questions.forEach((q) => {
      const selected = selectedAnswers[q.id];
      if (selected === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });

    const total = quiz.questions.length;
    const scorePercentage = Math.round((correctCount / total) * 100);

    const result: QuizResult = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      scorePercentage,
      totalQuestions: total,
      correctAnswersCount: correctCount,
      incorrectAnswersCount: total - correctCount,
      timeSpentSeconds: secondsSpent,
      dateCompleted: 'Just now',
      userAnswers: selectedAnswers,
      topicBreakdown: [
        { topicName: quiz.topic, score: correctCount, total, masteryPercentage: scorePercentage },
        { topicName: 'Core Syntax', score: Math.min(correctCount, 3), total: 3, masteryPercentage: Math.round((Math.min(correctCount, 3)/3)*100) },
        { topicName: 'Control Flow', score: Math.min(correctCount, 2), total: 2, masteryPercentage: Math.round((Math.min(correctCount, 2)/2)*100) },
      ],
    };

    onCompleteQuiz(result);
  };

  const answeredCount = Object.values(selectedAnswers).filter((val) => val !== null && val !== undefined).length;
  const progressPercent = Math.round((answeredCount / quiz.questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#f6f6fa] flex flex-col text-left">
      
      {/* Top Header */}
      <header className="bg-white border-b border-[#d8d7e8] px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#7372A5] bg-gray-50 hover:bg-[#ececf4] px-3 py-1.5 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Exit Quiz</span>
          </button>
          
          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#222138]">{quiz.title}</h1>
            <span className="text-[11px] text-gray-400 font-semibold">{quiz.topic}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Dyslexia Mode Toggle */}
          <div className="flex items-center gap-2 bg-[#ececf4] px-3 py-1 rounded-xl border border-[#d8d7e8]">
            <span className="material-symbols-outlined text-[#7372A5] text-sm">visibility</span>
            <span className="text-xs text-gray-700 font-medium hidden md:inline">Dyslexia Mode: </span>
            <span className={`text-xs font-bold ${dyslexiaMode ? 'text-[#7372A5]' : 'text-gray-500'}`}>
              {dyslexiaMode ? 'ON' : 'OFF'}
            </span>
            <button
              onClick={() => setDyslexiaMode(!dyslexiaMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                dyslexiaMode ? 'bg-[#7372A5]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  dyslexiaMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <span className="bg-[#ececf4] text-[#7372A5] border border-[#d8d7e8] text-xs font-bold px-3 py-1 rounded-full hidden sm:inline">
            {quiz.difficulty}
          </span>

          <button
            onClick={handleSubmitQuiz}
            className="bg-[#7372A5] hover:bg-[#585785] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Submit Quiz</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Navigator Sidebar (1 Column) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Progress Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#d8d7e8] shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-500">Progress</span>
              <span className="text-[#7372A5]">
                {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
            </div>
            <div className="w-full bg-[#ececf4] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#7372A5] h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Grid Navigator */}
          <div className="bg-white p-5 rounded-2xl border border-[#d8d7e8] shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Question Navigator
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, idx) => {
                const isSelected = selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== null;
                const isCurrent = idx === currentQuestionIndex;
                const isReview = reviewLaterQuestions[q.id];

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all relative ${
                      isCurrent
                        ? 'ring-2 ring-[#7372A5] bg-[#ececf4] text-[#7372A5]'
                        : isSelected
                        ? 'bg-[#7372A5] text-white shadow-xs'
                        : 'bg-[#ececf4]/60 text-gray-600 hover:bg-[#ececf4]'
                    }`}
                  >
                    {idx + 1}
                    {isReview && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-[#d8d7e8] space-y-2 text-[11px] text-gray-500 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#7372A5]" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#ececf4] ring-1 ring-[#7372A5]" />
                <span>Current Question</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#ececf4]" />
                <span>Not Answered</span>
              </div>
            </div>
          </div>

          {/* Quick Review Bookmark */}
          <button
            onClick={handleToggleReviewLater}
            className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              reviewLaterQuestions[currentQuestion.id]
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white text-gray-700 border-[#d8d7e8] hover:bg-[#ececf4]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">bookmark</span>
            <span>{reviewLaterQuestions[currentQuestion.id] ? 'Marked for Review' : 'Review Later'}</span>
          </button>

        </div>

        {/* Main Question Display Area (3 Columns) */}
        <div className="lg:col-span-3 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#d8d7e8] shadow-md space-y-6">
            
            {/* Question Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#d8d7e8]">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#7372A5] bg-[#ececf4] px-3 py-1 rounded-full border border-[#d8d7e8]">
                QUESTION {currentQuestionIndex + 1}
              </span>

              <button
                onClick={handleToggleFlag}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  flaggedQuestions[currentQuestion.id] ? 'text-rose-600 font-bold' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="material-symbols-outlined text-lg">flag</span>
                <span>{flaggedQuestions[currentQuestion.id] ? 'Flagged' : 'Report issue'}</span>
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#222138] leading-snug">
                {currentQuestion.question}
              </h2>
              <p className="text-xs text-gray-400 font-medium">Select the correct answer.</p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                const optionLetters = ['A', 'B', 'C', 'D', 'E'];

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'border-[#7372A5] bg-[#ececf4] shadow-xs'
                        : 'border-[#d8d7e8] bg-white hover:border-[#7372A5]/50 hover:bg-[#ececf4]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#7372A5] text-white'
                            : 'bg-[#ececf4] text-[#7372A5] group-hover:bg-[#d8d7e8]'
                        }`}
                      >
                        {optionLetters[optIdx]}
                      </span>
                      <span className="text-sm font-semibold text-[#222138]">{opt}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-[#7372A5] bg-[#7372A5]' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Clear Selection */}
            {selectedAnswers[currentQuestion.id] !== undefined && selectedAnswers[currentQuestion.id] !== null && (
              <button
                onClick={handleClearSelection}
                className="text-xs text-gray-400 hover:text-[#7372A5] font-semibold underline"
              >
                Clear Selection
              </button>
            )}

            {/* Hint Accordion Card */}
            <div className="pt-2">
              {!showHint[currentQuestion.id] ? (
                <button
                  onClick={() => setShowHint((prev) => ({ ...prev, [currentQuestion.id]: true }))}
                  className="flex items-center gap-2 text-xs font-bold text-[#7372A5] bg-[#ececf4] hover:bg-[#d8d7e8] px-4 py-2.5 rounded-xl transition-colors border border-[#d8d7e8]"
                >
                  <span className="material-symbols-outlined text-base">lightbulb</span>
                  <span>Need a hint?</span>
                </button>
              ) : (
                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5">lightbulb</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 mb-0.5">Hint:</h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      {currentQuestion.hint}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Action Nav Bar */}
          <div className="flex items-center justify-between gap-4">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              className="px-5 py-2.5 rounded-xl border border-[#d8d7e8] bg-white hover:bg-[#ececf4] font-bold text-xs text-[#222138] disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Previous</span>
            </button>

            <button
              onClick={handleToggleReviewLater}
              className="px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 font-bold text-xs text-amber-800 transition-all hidden sm:flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">bookmark</span>
              <span>Mark for Review</span>
            </button>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="px-6 py-2.5 rounded-xl bg-[#7372A5] hover:bg-[#585785] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Next</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <span>Submit Quiz</span>
                <span className="material-symbols-outlined text-base">check</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

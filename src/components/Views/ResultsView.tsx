import React, { useState } from 'react';
import { Quiz, QuizResult, ViewMode } from '../../types';

interface ResultsViewProps {
  quizResult: QuizResult;
  quiz: Quiz;
  setCurrentView: (view: ViewMode) => void;
  dyslexiaMode: boolean;
  setDyslexiaMode: (enabled: boolean) => void;
  onRetakeQuiz: () => void;
  onStartAnotherQuiz: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  quizResult,
  quiz,
  setCurrentView,
  dyslexiaMode,
  setDyslexiaMode,
  onRetakeQuiz,
  onStartAnotherQuiz,
}) => {
  const [activeTab, setActiveTab] = useState<'review' | 'insights'>('review');

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-[#f6f6fa] text-left">
      
      {/* Top Header */}
      <header className="bg-white border-b border-[#d8d7e8] px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#7372A5] flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#222138]">
              Flex<span className="text-[#7372A5]">Quizz</span>
            </span>
          </button>
          
          
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#ececf4] px-3 py-1.5 rounded-xl border border-[#d8d7e8]">
            <span className="material-symbols-outlined text-[#7372A5] text-base">visibility</span>
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
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Performance Hub Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#d8d7e8] shadow-xs space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1">
              Performance Hub
            </p>
            <button
              onClick={() => setActiveTab('review')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'review'
                  ? 'bg-[#ececf4] text-[#7372A5]'
                  : 'text-gray-600 hover:bg-[#ececf4]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">fact_check</span>
              <span>Question Review</span>
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'insights'
                  ? 'bg-[#ececf4] text-[#7372A5]'
                  : 'text-gray-600 hover:bg-[#ececf4]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">insights</span>
              <span>Topic Mastery</span>
            </button>
          </div>

          <div className="bg-[#222138] p-5 rounded-2xl text-white space-y-3">
            <h4 className="font-bold text-sm">Want to improve your score?</h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              Retake this quiz to reinforce weak areas or generate a new AI adaptive quiz.
            </p>
            <button
              onClick={onRetakeQuiz}
              className="w-full py-2 bg-[#7372A5] text-white hover:bg-[#585785] rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Retake Quiz
            </button>
          </div>
        </div>

        {/* Center/Right Main Section */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Result Hero Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#d8d7e8] shadow-md space-y-6">
            <div className="text-center space-y-2">
              <span className="text-3xl">🎉</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#222138]">
                Great Job! You completed the quiz.
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {quiz.title} • Completed in {Math.floor(quizResult.timeSpentSeconds / 60)}m {quizResult.timeSpentSeconds % 60}s
              </p>
            </div>

            {/* Score Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center bg-[#f6f6fa] p-6 rounded-2xl border border-[#d8d7e8] text-center">
              
              {/* Score Donut */}
              <div className="space-y-1">
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
                      className={quizResult.scorePercentage >= 70 ? 'text-emerald-500' : 'text-amber-500'}
                      strokeDasharray={`${quizResult.scorePercentage}, 100`}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-extrabold text-[#222138]">{quizResult.scorePercentage}%</span>
                    <span className="text-[10px] text-gray-400 font-semibold">Overall</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-700 block">Final Score</span>
              </div>

              {/* Correct Answers */}
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                <span className="material-symbols-outlined text-emerald-600 text-2xl mb-1">check_circle</span>
                <span className="text-2xl font-extrabold text-emerald-800 block">
                  {quizResult.correctAnswersCount} / {quizResult.totalQuestions}
                </span>
                <span className="text-xs font-bold text-emerald-700">Correct Answers</span>
              </div>

              {/* Incorrect Answers */}
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                <span className="material-symbols-outlined text-rose-600 text-2xl mb-1">cancel</span>
                <span className="text-2xl font-extrabold text-rose-800 block">
                  {quizResult.incorrectAnswersCount} / {quizResult.totalQuestions}
                </span>
                <span className="text-xs font-bold text-rose-700">Incorrect Answers</span>
              </div>

            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-6 py-2.5 rounded-xl bg-[#7372A5] hover:bg-[#585785] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                Go to Dashboard
              </button>

              <button
                onClick={onStartAnotherQuiz}
                className="px-6 py-2.5 rounded-xl bg-[#7372A5] hover:bg-[#585785] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">upload_file</span>
                <span>Upload Material / Quizzes</span>
              </button>
            </div>
          </div>

          {/* Question Review List */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-lg text-[#222138]">Question Review & Explanations</h3>

            <div className="space-y-4">
              {quiz.questions.map((q, idx) => {
                const userSelected = quizResult.userAnswers[q.id];
                const isCorrect = userSelected === q.correctAnswerIndex;

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-2xl p-6 border-2 shadow-xs space-y-3 ${
                      isCorrect ? 'border-emerald-200' : 'border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center ${
                            isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-[#222138]">{q.question}</h4>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isCorrect ? 'check' : 'close'}
                        </span>
                        <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                      </span>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, optIdx) => {
                        const isUserChoice = userSelected === optIdx;
                        const isCorrectChoice = q.correctAnswerIndex === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                              isCorrectChoice
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : isUserChoice
                                ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                            }`}
                          >
                            <span>
                              {optionLetters[optIdx]}. {opt}
                            </span>
                            {isCorrectChoice && (
                              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
                                Correct Answer
                              </span>
                            )}
                            {isUserChoice && !isCorrectChoice && (
                              <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-200 px-2 py-0.5 rounded-full">
                                Your Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                   

                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

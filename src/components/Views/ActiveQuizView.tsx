import React, {
  useEffect,
  useState,
} from 'react';

import {
  Quiz,
  QuizResult,
  ViewMode,
  Question,
} from '../../types';


interface ActiveQuizViewProps {
  quiz: Quiz;

  adaptiveSessionId?: string;

  setCurrentView: (
    view: ViewMode
  ) => void;

  dyslexiaMode: boolean;

  setDyslexiaMode: (
    enabled: boolean
  ) => void;

  onCompleteQuiz: (
    result: QuizResult,
    completedQuiz?: Quiz
  ) => void;
}


export const ActiveQuizView: React.FC<
  ActiveQuizViewProps
> = ({
  quiz,
  adaptiveSessionId,
  setCurrentView,
  dyslexiaMode,
  setDyslexiaMode,
  onCompleteQuiz,
}) => {

  const isAdaptive =
    Boolean(adaptiveSessionId);


  // ----------------------------------------------------------
  // Questions already shown to the student.
  //
  // For adaptive mode this starts with Q1 and grows
  // one question at a time.
  // ----------------------------------------------------------

  const [
    questions,
    setQuestions,
  ] = useState<Question[]>(
    quiz.questions
  );


  const [
    currentQuestionIndex,
    setCurrentQuestionIndex,
  ] = useState(0);


  const [
    selectedAnswers,
    setSelectedAnswers,
  ] = useState<
    Record<number, number | null>
  >({});


  const [
    flaggedQuestions,
    setFlaggedQuestions,
  ] = useState<
    Record<number, boolean>
  >({});


  const [
    reviewLaterQuestions,
    setReviewLaterQuestions,
  ] = useState<
    Record<number, boolean>
  >({});


  const [
    showHint,
    setShowHint,
  ] = useState<
    Record<number, boolean>
  >({});


  const [
    secondsSpent,
    setSecondsSpent,
  ] = useState(0);


  const [
    adaptiveLoading,
    setAdaptiveLoading,
  ] = useState(false);


  const [
    adaptiveError,
    setAdaptiveError,
  ] = useState('');


  // ----------------------------------------------------------
  // Timer
  // ----------------------------------------------------------

  useEffect(() => {

    const timer =
      setInterval(() => {

        setSecondsSpent(
          (prev) => prev + 1
        );

      }, 1000);

    return () =>
      clearInterval(timer);

  }, []);


  // ----------------------------------------------------------
  // Reset if the quiz prop changes.
  // ----------------------------------------------------------

  useEffect(() => {

    setQuestions(
      quiz.questions
    );

    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setFlaggedQuestions({});
    setReviewLaterQuestions({});
    setShowHint({});
    setSecondsSpent(0);
    setAdaptiveError('');

  }, [quiz.id]);


  const currentQuestion =
    questions[
      currentQuestionIndex
    ];


  if (!currentQuestion) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm font-semibold text-[#7372A5]">
          Loading question...
        </div>
      </div>
    );

  }


  // ----------------------------------------------------------
  // OPTION SELECTION
  // ----------------------------------------------------------

  const handleSelectOption = (
    optionIndex: number
  ) => {

    if (adaptiveLoading) return;

    setSelectedAnswers(
      (prev) => ({
        ...prev,
        [currentQuestion.id]:
          optionIndex,
      })
    );
  };


  const handleClearSelection = () => {

    setSelectedAnswers(
      (prev) => ({
        ...prev,
        [currentQuestion.id]:
          null,
      })
    );
  };


  // ----------------------------------------------------------
  // FLAGS / REVIEW
  // ----------------------------------------------------------

  const handleToggleFlag = () => {

    setFlaggedQuestions(
      (prev) => ({
        ...prev,
        [currentQuestion.id]:
          !prev[
            currentQuestion.id
          ],
      })
    );
  };


  const handleToggleReviewLater = () => {

    setReviewLaterQuestions(
      (prev) => ({
        ...prev,
        [currentQuestion.id]:
          !prev[
            currentQuestion.id
          ],
      })
    );
  };


  // ----------------------------------------------------------
  // CREATE FINAL RESULT
  // ----------------------------------------------------------

  const finishQuiz = (
    finalQuestions: Question[]
  ) => {

    let correctCount = 0;

    finalQuestions.forEach(
      (question) => {

        const selected =
          selectedAnswers[
            question.id
          ];

        if (
          selected ===
          question.correctAnswerIndex
        ) {
          correctCount += 1;
        }

      }
    );


    const total =
      finalQuestions.length;


    const scorePercentage =
      total > 0
        ? Math.round(
            (correctCount / total) *
              100
          )
        : 0;


    // --------------------------------------------------------
    // Build concept-level breakdown.
    // --------------------------------------------------------

    const breakdown =
      new Map<
        string,
        {
          score: number;
          total: number;
        }
      >();


    finalQuestions.forEach(
      (question) => {

        const concept =
          question.concept ||
          quiz.topic;


        const existing =
          breakdown.get(
            concept
          ) || {
            score: 0,
            total: 0,
          };


        existing.total += 1;


        if (
          selectedAnswers[
            question.id
          ] ===
          question.correctAnswerIndex
        ) {
          existing.score += 1;
        }


        breakdown.set(
          concept,
          existing
        );

      }
    );


    const topicBreakdown =
      Array.from(
        breakdown.entries()
      ).map(
        ([topicName, data]) => ({
          topicName,
          score: data.score,
          total: data.total,
          masteryPercentage:
            Math.round(
              (data.score /
                data.total) *
                100
            ),
        })
      );


    const result: QuizResult = {

      quizId: quiz.id,

      quizTitle: quiz.title,

      scorePercentage,

      totalQuestions: total,

      correctAnswersCount:
        correctCount,

      incorrectAnswersCount:
        total - correctCount,

      timeSpentSeconds:
        secondsSpent,

      dateCompleted:
        'Just now',

      userAnswers:
        selectedAnswers,

      topicBreakdown,
    };


    const completedQuiz: Quiz = {
      ...quiz,
      questions:
        finalQuestions,
      totalQuestions:
        finalQuestions.length,
    };


    onCompleteQuiz(
      result,
      completedQuiz
    );
  };


  // ----------------------------------------------------------
  // ADAPTIVE NEXT QUESTION
  // ----------------------------------------------------------

  const handleAdaptiveNext =
    async () => {

      if (!adaptiveSessionId) {
        return;
      }


      const selected =
        selectedAnswers[
          currentQuestion.id
        ];


      if (
        selected ===
          null ||
        selected ===
          undefined
      ) {

        setAdaptiveError(
          'Please select an answer before continuing.'
        );

        return;
      }


      setAdaptiveError('');
      setAdaptiveLoading(true);


      try {

        const response =
          await fetch(
            'http://127.0.0.1:8000/answer-adaptive-question',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                session_id:
                  adaptiveSessionId,

                question_number:
                  currentQuestionIndex +
                  1,

                selected_option_index:
                  selected,
              }),
            }
          );


        if (!response.ok) {

          const text =
            await response.text();

          let message =
            'Could not process the answer.';

          try {

            const parsed =
              JSON.parse(text);

            message =
              parsed?.detail ||
              message;

          } catch {
            if (text) {
              message = text;
            }
          }

          throw new Error(
            message
          );
        }


        const data =
          await response.json();


        console.log(
          'Adaptive answer result:',
          data
        );


        // ----------------------------------------------------
        // LAST QUESTION
        // ----------------------------------------------------

        if (
          data.completed
        ) {

          finishQuiz(
            questions
          );

          return;
        }


        // ----------------------------------------------------
        // NEXT QUESTION
        // ----------------------------------------------------

        const raw =
          data.question;


        const rawOptions =
          Array.isArray(
            raw?.options
          )
            ? raw.options
            : [];


        const options =
          rawOptions
            .map(
              (option: any) =>
                typeof option ===
                'string'
                  ? option
                  : option?.text ||
                    ''
            )
            .filter(
              (option: string) =>
                option.trim()
                  .length > 0
            );


        const correctAnswerIndex =
          rawOptions.findIndex(
            (option: any) =>
              option?.is_correct ===
                true ||
              option?.isCorrect ===
                true ||
              option?.correct ===
                true
          );


        if (
          !raw?.question_text ||
          options.length !== 4 ||
          correctAnswerIndex <
            0
        ) {

          throw new Error(
            'The backend returned an invalid next question.'
          );
        }


        const nextQuestion:
          Question = {

          id:
            data.question_number,

          question:
            raw.question_text,

          options,

          correctAnswerIndex,

          hint: '',

          explanation: '',

          concept:
            data.next_concept,

          difficulty:
            String(
              data.next_difficulty ||
                'medium'
            ).replace(
              /^./,
              (c) =>
                c.toUpperCase()
            ) as
              | 'Easy'
              | 'Medium'
              | 'Hard',
        };


        setQuestions(
          (prev) => [
            ...prev,
            nextQuestion,
          ]
        );


        setCurrentQuestionIndex(
          (prev) => prev + 1
        );

      } catch (error) {

        console.error(
          'Adaptive question error:',
          error
        );

        setAdaptiveError(
          error instanceof Error
            ? error.message
            : 'Could not load the next question.'
        );

      } finally {

        setAdaptiveLoading(
          false
        );
      }
    };


  // ----------------------------------------------------------
  // STATIC QUIZ NEXT
  // ----------------------------------------------------------

  const handleStaticNext =
    () => {

      if (
        currentQuestionIndex <
        questions.length - 1
      ) {

        setCurrentQuestionIndex(
          (prev) => prev + 1
        );

      } else {

        finishQuiz(
          questions
        );

      }
    };


  // ----------------------------------------------------------
  // CURRENT ANSWER / PROGRESS
  // ----------------------------------------------------------

  const answeredCount =
    Object.values(
      selectedAnswers
    ).filter(
      (value) =>
        value !== null &&
        value !== undefined
    ).length;


  const progressPercent =
    Math.round(
      (answeredCount /
        quiz.totalQuestions) *
        100
    );


  const currentDifficulty =
    currentQuestion.difficulty ||
    quiz.difficulty;


  return (

    <div className="min-h-screen bg-[#f6f6fa] flex flex-col text-left">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="bg-white border-b border-[#d8d7e8] px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between gap-4">

        <div className="flex items-center gap-3">

          <button
            onClick={() =>
              setCurrentView(
                'dashboard'
              )
            }
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#7372A5] bg-gray-50 px-3 py-1.5 rounded-xl"
          >
            ←
            <span>
              Exit Quiz
            </span>
          </button>

          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#222138]">
              {quiz.title}
            </h1>

            <span className="text-[11px] text-gray-400 font-semibold">
              {currentQuestion.concept ||
                quiz.topic}
            </span>
          </div>

        </div>


        <div className="flex items-center gap-3">

          <div className="flex items-center gap-2 bg-[#ececf4] px-3 py-1 rounded-xl border border-[#d8d7e8]">

            <span className="text-xs text-gray-700 font-medium hidden md:inline">
              Dyslexia Mode:
            </span>

            <span className="text-xs font-bold text-[#7372A5]">
              {dyslexiaMode
                ? 'ON'
                : 'OFF'}
            </span>

            <button
              onClick={() =>
                setDyslexiaMode(
                  !dyslexiaMode
                )
              }
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full ${
                dyslexiaMode
                  ? 'bg-[#7372A5]'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ${
                  dyslexiaMode
                    ? 'translate-x-4'
                    : 'translate-x-0'
                }`}
              />
            </button>

          </div>


          <span className="bg-[#ececf4] text-[#7372A5] border border-[#d8d7e8] text-xs font-bold px-3 py-1 rounded-full hidden sm:inline">
            {currentDifficulty}
          </span>


          {!isAdaptive && (
            <button
              onClick={() =>
                finishQuiz(
                  questions
                )
              }
              className="bg-[#7372A5] text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              Submit Quiz
            </button>
          )}

        </div>

      </header>


      {/* ====================================================
          BODY
      ==================================================== */}

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* ==================================================
            LEFT SIDEBAR
        ================================================== */}

        <div className="lg:col-span-1 space-y-6">

          <div className="bg-white p-5 rounded-2xl border border-[#d8d7e8] shadow-xs space-y-3">

            <div className="flex items-center justify-between text-xs font-bold">

              <span className="text-gray-500">
                Progress
              </span>

              <span className="text-[#7372A5]">
                {currentQuestionIndex + 1}
                {' '}
                of
                {' '}
                {quiz.totalQuestions}
              </span>

            </div>

            <div className="w-full bg-[#ececf4] h-2.5 rounded-full overflow-hidden">

              <div
                className="bg-[#7372A5] h-full rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                }}
              />

            </div>

          </div>


          {/* Concept / adaptive information */}

          {isAdaptive && (
            <div className="bg-white p-5 rounded-2xl border border-[#d8d7e8] space-y-3">

              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Adaptive Engine
              </h3>

              <div className="text-xs text-gray-600 space-y-2">

                <p>
                  <strong>
                    Current concept:
                  </strong>{' '}
                  {currentQuestion.concept}
                </p>

                <p>
                  <strong>
                    Current difficulty:
                  </strong>{' '}
                  {currentDifficulty}
                </p>

                <p className="text-[#7372A5]">
                  Difficulty changes after
                  two consecutive correct or
                  incorrect answers.
                </p>

              </div>

            </div>
          )}


          {/* Question navigator */}

          <div className="bg-white p-5 rounded-2xl border border-[#d8d7e8] space-y-4">

            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Question Navigator
            </h3>

            <div className="grid grid-cols-5 gap-2">

              {questions.map(
                (q, idx) => {

                  const isSelected =
                    selectedAnswers[
                      q.id
                    ] !== undefined &&
                    selectedAnswers[
                      q.id
                    ] !== null;

                  const isCurrent =
                    idx ===
                    currentQuestionIndex;

                  const isReview =
                    reviewLaterQuestions[
                      q.id
                    ];

                  return (
                    <button
                      key={q.id}
                      disabled={
                        isAdaptive
                      }
                      onClick={() =>
                        setCurrentQuestionIndex(
                          idx
                        )
                      }
                      className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center relative ${
                        isCurrent
                          ? 'ring-2 ring-[#7372A5] bg-[#ececf4] text-[#7372A5]'
                          : isSelected
                          ? 'bg-[#7372A5] text-white'
                          : 'bg-[#ececf4]/60 text-gray-600'
                      } ${
                        isAdaptive
                          ? 'cursor-default'
                          : ''
                      }`}
                    >

                      {idx + 1}

                      {isReview && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" />
                      )}

                    </button>
                  );
                }
              )}

            </div>

            {isAdaptive && (
              <p className="text-[10px] text-gray-400">
                Adaptive quizzes move forward
                one question at a time.
              </p>
            )}

          </div>


          <button
            onClick={
              handleToggleReviewLater
            }
            className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
              reviewLaterQuestions[
                currentQuestion.id
              ]
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white text-gray-700 border-[#d8d7e8]'
            }`}
          >
            🔖
            <span>
              {reviewLaterQuestions[
                currentQuestion.id
              ]
                ? 'Marked for Review'
                : 'Review Later'}
            </span>
          </button>

        </div>


        {/* ==================================================
            QUESTION
        ================================================== */}

        <div className="lg:col-span-3 space-y-6">

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#d8d7e8] shadow-md space-y-6">

            <div className="flex items-center justify-between pb-4 border-b border-[#d8d7e8]">

              <span className="text-xs font-extrabold uppercase tracking-widest text-[#7372A5] bg-[#ececf4] px-3 py-1 rounded-full">
                QUESTION{' '}
                {currentQuestionIndex + 1}
              </span>

              <button
                onClick={
                  handleToggleFlag
                }
                className={`text-xs font-semibold ${
                  flaggedQuestions[
                    currentQuestion.id
                  ]
                    ? 'text-rose-600'
                    : 'text-gray-400'
                }`}
              >
                🚩{' '}
                {flaggedQuestions[
                  currentQuestion.id
                ]
                  ? 'Flagged'
                  : 'Report issue'}
              </button>

            </div>


            <div className="space-y-2">

              <h2 className="text-xl sm:text-2xl font-bold text-[#222138] leading-snug">
                {currentQuestion.question}
              </h2>

              <p className="text-xs text-gray-400 font-medium">
                Select the correct answer.
              </p>

            </div>


            <div className="space-y-3 pt-2">

              {currentQuestion.options.map(
                (
                  option,
                  optionIndex
                ) => {

                  const isSelected =
                    selectedAnswers[
                      currentQuestion.id
                    ] ===
                    optionIndex;

                  const letters = [
                    'A',
                    'B',
                    'C',
                    'D',
                  ];

                  return (

                    <button
                      key={optionIndex}
                      disabled={
                        adaptiveLoading
                      }
                      onClick={() =>
                        handleSelectOption(
                          optionIndex
                        )
                      }
                      className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between ${
                        isSelected
                          ? 'border-[#7372A5] bg-[#ececf4]'
                          : 'border-[#d8d7e8] bg-white'
                      } ${
                        adaptiveLoading
                          ? 'opacity-70'
                          : ''
                      }`}
                    >

                      <div className="flex items-center gap-3.5">

                        <span className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#7372A5] text-white'
                            : 'bg-[#ececf4] text-[#7372A5]'
                        }`}>
                          {letters[
                            optionIndex
                          ]}
                        </span>

                        <span className="text-sm font-semibold text-[#222138]">
                          {option}
                        </span>

                      </div>


                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-[#7372A5] bg-[#7372A5]'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                    </button>
                  );
                }
              )}

            </div>


            {selectedAnswers[
              currentQuestion.id
            ] !== undefined &&
              selectedAnswers[
                currentQuestion.id
              ] !== null && (

                <button
                  onClick={
                    handleClearSelection
                  }
                  className="text-xs text-gray-400 underline"
                >
                  Clear Selection
                </button>

              )}


            <div className="pt-2">

              {!showHint[
                currentQuestion.id
              ] ? (

                <button
                  onClick={() =>
                    setShowHint(
                      (prev) => ({
                        ...prev,
                        [currentQuestion.id]:
                          true,
                      })
                    )
                  }
                  className="flex items-center gap-2 text-xs font-bold text-[#7372A5] bg-[#ececf4] px-4 py-2.5 rounded-xl"
                >
                  💡 Need a hint?
                </button>

              ) : (

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">

                  <h4 className="text-xs font-bold text-amber-900 mb-1">
                    Hint:
                  </h4>

                  <p className="text-xs text-amber-800">
                    {currentQuestion.hint ||
                      'Think carefully about the core concept being tested.'}
                  </p>

                </div>

              )}

            </div>


            {adaptiveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {adaptiveError}
              </div>
            )}

          </div>


          {/* =================================================
              NAVIGATION
          ================================================= */}

          <div className="flex items-center justify-between gap-4">

            <button
              disabled={
                isAdaptive ||
                currentQuestionIndex ===
                  0 ||
                adaptiveLoading
              }
              onClick={() =>
                setCurrentQuestionIndex(
                  (prev) =>
                    prev - 1
                )
              }
              className="px-5 py-2.5 rounded-xl border border-[#d8d7e8] bg-white font-bold text-xs disabled:opacity-40"
            >
              ← Previous
            </button>


            <button
              onClick={
                isAdaptive
                  ? handleAdaptiveNext
                  : handleStaticNext
              }
              disabled={
                adaptiveLoading ||
                selectedAnswers[
                  currentQuestion.id
                ] ===
                  undefined ||
                selectedAnswers[
                  currentQuestion.id
                ] === null
              }
              className="px-6 py-2.5 rounded-xl bg-[#7372A5] text-white font-bold text-xs shadow-md disabled:opacity-50"
            >
              {adaptiveLoading
                ? 'Generating next question...'
                : currentQuestionIndex <
                    questions.length - 1 ||
                  isAdaptive
                ? 'Next →'
                : 'Submit Quiz'}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
};
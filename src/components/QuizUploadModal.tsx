import React, { useState } from 'react';

import * as pdfjsLib from 'pdfjs-dist';

import { AdaptiveQuizLaunch } from '../types';


pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();


interface QuizUploadModalProps {

  isOpen: boolean;

  onClose: () => void;

  onQuizStarted: (
    launch: AdaptiveQuizLaunch
  ) => void;
}


export const QuizUploadModal:
  React.FC<QuizUploadModalProps> = ({
    isOpen,
    onClose,
    onQuizStarted,
  }) => {

  const [
    topic,
    setTopic,
  ] = useState('');


  const [
    content,
    setContent,
  ] = useState('');


  const [
    difficulty,
    setDifficulty,
  ] = useState<
    'Easy' | 'Medium' | 'Hard'
  >('Medium');


  const [
    questionCount,
    setQuestionCount,
  ] = useState(10);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    selectedFileName,
    setSelectedFileName,
  ] = useState<string | null>(
    null
  );


  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );


  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  if (!isOpen) {
    return null;
  }


  // ==========================================================
  // FILE UPLOAD
  // ==========================================================

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      e.target.files?.[0];


    if (!file) {
      return;
    }


    setSelectedFileName(
      file.name
    );

    setSelectedFile(
      file
    );

    setErrorMessage('');


    try {

      // ------------------------------------------------------
      // PDF
      // ------------------------------------------------------

      if (
        file.type === 'application/pdf'
        ||
        file.name
          .toLowerCase()
          .endsWith('.pdf')
      ) {

        const arrayBuffer =
          await file.arrayBuffer();


        const pdf =
          await pdfjsLib.getDocument({
            data: arrayBuffer,
          }).promise;


        let extractedText = '';


        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {

          const page =
            await pdf.getPage(
              pageNumber
            );


          const textContent =
            await page.getTextContent();


          const pageText =
            textContent.items
              .map((item) => {

                if (
                  'str' in item
                ) {

                  return item.str;
                }

                return '';

              })
              .join(' ');


          extractedText +=
            `\n\n--- Page ${pageNumber} ---\n${pageText}`;
        }


        if (
          !extractedText.trim()
        ) {

          throw new Error(
            'No selectable text was found in this PDF. It may be a scanned/image-only PDF.'
          );
        }


        setContent(
          extractedText
        );


        if (!topic) {

          setTopic(
            file.name.replace(
              /\.[^/.]+$/,
              ''
            )
          );
        }


        return;
      }


      // ------------------------------------------------------
      // TXT / MD
      // ------------------------------------------------------

      if (
        file.type === 'text/plain'
        ||
        file.name
          .toLowerCase()
          .endsWith('.txt')
        ||
        file.name
          .toLowerCase()
          .endsWith('.md')
      ) {

        const text =
          await file.text();


        if (!text.trim()) {

          throw new Error(
            'The uploaded text file is empty.'
          );
        }


        setContent(text);


        if (!topic) {

          setTopic(
            file.name.replace(
              /\.[^/.]+$/,
              ''
            )
          );
        }


        return;
      }


      throw new Error(
        'Unsupported file type. Please upload a PDF, TXT, or MD file.'
      );


    } catch (error) {

      console.error(
        'File processing error:',
        error
      );


      const message =
        error instanceof Error
          ? error.message
          : 'Unable to read the uploaded file.';


      setErrorMessage(
        message
      );


      setContent('');

      setSelectedFile(null);

      setSelectedFileName(null);
    }
  };


  // ==========================================================
  // QUICK TOPICS
  // ==========================================================

  const handleQuickTopic = (
    quickTopic: string
  ) => {

    setTopic(
      quickTopic
    );


    setContent(
      `Study material for ${quickTopic}.`
    );


    setSelectedFile(null);

    setSelectedFileName(null);

    setErrorMessage('');
  };


  // ==========================================================
  // START ADAPTIVE QUIZ
  // ==========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();


    if (loading) {
      return;
    }


    setErrorMessage('');


    // --------------------------------------------------------
    // Backend requires a file.
    //
    // If the student pasted text instead,
    // create a temporary TXT file.
    // --------------------------------------------------------

    let fileToUpload =
      selectedFile;


    if (!fileToUpload) {

      const textToUpload =
        content.trim()
        ||
        `Study material about ${topic.trim()}`;


      if (
        !textToUpload.trim()
      ) {

        setErrorMessage(
          'Please enter a topic, paste study notes, or upload a file.'
        );

        return;
      }


      fileToUpload =
        new File(
          [
            textToUpload,
          ],
          `${
            topic.trim()
            || 'study-material'
          }.txt`,
          {
            type: 'text/plain',
          }
        );
    }


    if (
      !topic.trim()
      &&
      !content.trim()
    ) {

      setErrorMessage(
        'Please enter a topic, paste study notes, or upload a file.'
      );

      return;
    }


    setLoading(true);


    try {

      // ------------------------------------------------------
      // IMPORTANT:
      //
      // This MUST call /start-adaptive-quiz.
      // Not /generate-quiz.
      // ------------------------------------------------------

      const formData =
        new FormData();


      formData.append(
        'file',
        fileToUpload
      );


      const difficultyValue =
        difficulty.toLowerCase();


      const response =
        await fetch(
          `http://127.0.0.1:8000/start-adaptive-quiz?difficulty=${encodeURIComponent(
            difficultyValue
          )}&question_count=${questionCount}`,
          {
            method: 'POST',

            body: formData,
          }
        );


      if (!response.ok) {

        const errorText =
          await response.text();


        let message =
          `Quiz generation failed (${response.status}).`;


        try {

          const parsed =
            JSON.parse(
              errorText
            );


          message =
            parsed?.detail
            ||
            message;

        } catch {

          if (errorText) {
            message +=
              ` ${errorText}`;
          }
        }


        throw new Error(
          message
        );
      }


      const data =
        await response.json();


      console.log(
        'Adaptive quiz start response:',
        data
      );


      // ======================================================
      // DEFENSIVE VALIDATION
      // ======================================================

      if (
        !data?.session_id
      ) {

        throw new Error(
          'The backend did not return an adaptive quiz session ID.'
        );
      }


      if (
        !data?.question
      ) {

        throw new Error(
          'The backend did not return the first question.'
        );
      }


      if (
        !data.question.question_text
      ) {

        throw new Error(
          'The backend returned an invalid first question.'
        );
      }


      const rawOptions =
        Array.isArray(
          data.question.options
        )
          ? data.question.options
          : [];


      if (
        rawOptions.length !== 4
      ) {

        throw new Error(
          'The first question must contain exactly 4 options.'
        );
      }


      const options =
        rawOptions.map(
          (option: any) =>
            typeof option === 'string'
              ? option
              : option?.text || ''
        );


      const correctAnswerIndex =
        rawOptions.findIndex(
          (option: any) =>
            option?.is_correct === true
        );


      if (
        correctAnswerIndex < 0
      ) {

        throw new Error(
          'The first question does not contain a valid correct answer.'
        );
      }


      // ======================================================
      // CREATE FRONTEND Q1
      // ======================================================

      const firstQuestion = {

        id:
          data.question_number || 1,

        question:
          data.question.question_text,

        options,

        correctAnswerIndex,

        hint: '',

        explanation: '',

        concept:
          data.concept_label,

        difficulty:
          String(
            data.difficulty
            ||
            data.question.difficulty
            ||
            'medium'
          )
            .replace(
              /^./,
              (c: string) =>
                c.toUpperCase()
            ) as
            | 'Easy'
            | 'Medium'
            | 'Hard',
      };


      const launch:
        AdaptiveQuizLaunch = {

        sessionId:
          data.session_id,

        title:
          topic.trim()
          ||
          data.title
          ||
          'Adaptive Quiz',

        totalQuestions:
          data.total_questions
          ||
          questionCount,

        firstQuestion,
      };


      console.log(
        'Starting adaptive quiz:',
        launch
      );


      // ------------------------------------------------------
      // Give Q1 to App.
      // ------------------------------------------------------

      onQuizStarted(
        launch
      );


      onClose();


    } catch (err) {

      console.error(
        'Adaptive quiz generation error:',
        err
      );


      const message =
        err instanceof Error
          ? err.message
          : 'Unable to generate the adaptive quiz.';


      if (
        message.includes(
          'Failed to fetch'
        )
        ||
        message.includes(
          'NetworkError'
        )
      ) {

        setErrorMessage(
          'Could not connect to the quiz-generation backend. Make sure the Python backend is running on http://127.0.0.1:8000.'
        );

      } else {

        setErrorMessage(
          message
        );
      }


    } finally {

      setLoading(false);
    }
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-[#d8d7e8] overflow-hidden flex flex-col max-h-[90vh]">

        {/* HEADER */}

        <div className="p-5 bg-[#7372A5] text-white flex items-center justify-between shrink-0">

          <div className="flex items-center gap-3">
<<<<<<< HEAD
=======

            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">

              <span className="material-symbols-outlined text-2xl text-amber-300">
                auto_awesome
              </span>

            </div>


>>>>>>> 30e962cc8d4bb4b2e0e1da694889f46650445a23
            <div>

              <h3 className="font-bold text-lg">
                Generate AI Adaptive Quiz
              </h3>

              <p className="text-xs text-gray-200">
                Upload notes, paste text, or enter a topic
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <span className="material-symbols-outlined text-lg">
              close
            </span>
          </button>

        </div>


        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-5 text-left"
        >

          {errorMessage && (

            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

              <div className="font-bold mb-1">
                Quiz generation error
              </div>

              <div>
                {errorMessage}
              </div>

            </div>
          )}


          {/* QUICK TOPICS */}

          <div>

            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Quick Pick Topic Preset
            </label>


            <div className="flex flex-wrap gap-2">
<<<<<<< HEAD
              {['Python Basics', 'DBMS Fundamentals', 'Networking Basics', 'Machine Learning', 'World History'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickTopic(preset)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                    topic === preset
                      ? 'bg-[#7372A5] text-white font-bold shadow-sm'
                      : 'bg-[#ececf4] text-[#7372A5] hover:bg-[#d8d7e8] border border-[#d8d7e8]'
                  }`}
                >
                   {preset}
                </button>
              ))}
=======

              {[
                'Python Basics',
                'DBMS Fundamentals',
                'Networking Basics',
                'Machine Learning',
                'World History',
              ].map(
                (preset) => (

                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      handleQuickTopic(
                        preset
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-xl font-medium bg-[#ececf4] text-[#7372A5] border border-[#d8d7e8]"
                  >
                    ✨ {preset}
                  </button>
                )
              )}

>>>>>>> 30e962cc8d4bb4b2e0e1da694889f46650445a23
            </div>

          </div>


          {/* TOPIC */}

          <div>

            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Quiz Title or Topic Name
            </label>


            <input
              type="text"
              value={topic}
              onChange={(e) =>
                setTopic(
                  e.target.value
                )
              }
              placeholder="e.g. Machine Learning"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7372A5]/50 text-sm"
            />

          </div>


          {/* FILE */}

          <div>

            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Upload Material or Paste Study Notes
            </label>


            <div className="border-2 border-dashed border-[#d8d7e8] rounded-2xl p-4 text-center bg-[#f6f6fa] relative mb-3">

              <input
                type="file"
                accept=".txt,.md,.pdf"
                onChange={
                  handleFileUpload
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />


              <span className="material-symbols-outlined text-3xl text-[#7372A5] mb-1">
                cloud_upload
              </span>


              <p className="text-xs font-bold text-[#222138]">

                {selectedFileName
                  ? `Selected: ${selectedFileName}`
                  : 'Click to upload PDF, TXT, or MD file'}

              </p>

            </div>


            <textarea
              value={content}
              onChange={(e) => {

                setContent(
                  e.target.value
                );

                setErrorMessage('');
              }}
              placeholder="Or paste your study material here..."
              rows={4}
              className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7372A5]/50 text-xs font-mono"
            />

          </div>


          {/* SETTINGS */}

          <div className="grid grid-cols-2 gap-4">

            <div>

              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Starting Difficulty
              </label>


              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(
                    e.target.value as
                      | 'Easy'
                      | 'Medium'
                      | 'Hard'
                  )
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold"
              >

                <option value="Easy">
                  Easy
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Hard">
                  Hard
                </option>

              </select>

            </div>


            <div>

              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Question Count
              </label>


              <select
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold"
              >

                <option value={5}>
                  5 Questions
                </option>

                <option value={10}>
                  10 Questions
                </option>

              </select>

            </div>

          </div>


          {/* ADAPTIVE EXPLANATION */}

          <div className="rounded-xl bg-[#ececf4] border border-[#d8d7e8] px-4 py-3 text-xs text-gray-600">

            <strong>
              Adaptive mode:
            </strong>{' '}

            each concept has its own difficulty.
            Two consecutive correct answers increase
            that concept's difficulty, while two
            consecutive incorrect answers decrease it.

          </div>


          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              loading
              ||
              !topic.trim()
            }
            className="w-full py-3 px-4 rounded-xl bg-[#7372A5] hover:bg-[#585785] text-white font-bold text-sm shadow-md disabled:opacity-50"
          >

            {loading
              ? 'AI is building your adaptive quiz...'
              : 'Generate & Start Adaptive Quiz'}

          </button>

        </form>

      </div>

    </div>
  );
};
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Form,
)

from fastapi.middleware.cors import CORSMiddleware

import os
import random
import sys
import uuid

from dotenv import load_dotenv

from pydantic import BaseModel

from typing import Literal


load_dotenv()


# ============================================================
# AI LAYER PATH
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

AI_LAYER_PATH = os.path.join(
    BASE_DIR,
    "AI_Layer",
)

if AI_LAYER_PATH not in sys.path:

    sys.path.insert(
        0,
        AI_LAYER_PATH,
    )


# ============================================================
# MODELS
# ============================================================

from AI_Layer.models import (
    AdaptiveQuizAnswerRequest,
    AdaptiveSession,
    Concept,
    ConceptState,
    Difficulty,
)


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="FlexQuizz API"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





# ============================================================
# ADAPTIVE SESSIONS
# ============================================================

adaptive_sessions: dict[
    str,
    AdaptiveSession,
] = {}


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
def root():

    return {
        "message": "FlexQuizz API is running"
    }


@app.get("/test-ai")
async def test_ai():

    try:

        import AI_Layer.ai_core as ai_core

        return {
            "message": (
                "AI Layer imported successfully"
            ),

            "api_key_loaded": bool(
                ai_core.api_key
            ),

            "gemini_client_exists": (
                ai_core.client is not None
            ),
        }

    except Exception as e:

        return {
            "error": str(e)
        }


# ============================================================
# ADAPTIVE ENGINE CONSTANTS
# ============================================================

DIFFICULTY_ORDER = [
    "easy",
    "medium",
    "hard",
]

CONCEPT_WEIGHTS = {
    "weak": 3,
    "moderate": 2,
    "strong": 1,
}


# ============================================================
# DIFFICULTY CLAMP
# ============================================================

def clamp_difficulty(
    difficulty: Difficulty,
    direction: int,
) -> Difficulty:

    index = DIFFICULTY_ORDER.index(
        difficulty
    )

    new_index = max(
        0,
        min(
            len(DIFFICULTY_ORDER) - 1,
            index + direction,
        ),
    )

    return DIFFICULTY_ORDER[
        new_index
    ]


# ============================================================
# UPDATE ONE CONCEPT
# ============================================================

def update_concept_performance(
    state: ConceptState,
    is_correct: bool,
) -> ConceptState:
    """
    Update performance statistics for the answered concept.

    Concept performance is tracked independently from the
    global adaptive difficulty.
    """

    state.times_asked += 1

    if is_correct:
        state.correct_count += 1
    else:
        state.incorrect_count += 1

    return state


# ============================================================
# WEIGHTED CONCEPT SELECTION
# ============================================================

def choose_weighted_concept(
    session: AdaptiveSession,
) -> Concept:

    concepts = session.concepts

    if not concepts:
        raise HTTPException(
            status_code=400,
            detail="No concepts are available.",
        )

    weights = []

    for concept in concepts:

        state = session.concept_states[
            concept.label
        ]

        if state.times_asked == 0:
            weight = CONCEPT_WEIGHTS["weak"]

        else:
            accuracy = (
                state.correct_count /
                state.times_asked
            )

            if accuracy < 0.50:
                weight = CONCEPT_WEIGHTS["weak"]

            elif accuracy < 0.80:
                weight = CONCEPT_WEIGHTS["moderate"]

            else:
                weight = CONCEPT_WEIGHTS["strong"]

        weights.append(weight)

    return random.choices(
        concepts,
        weights=weights,
        k=1,
    )[0]


# ============================================================
# PREVIOUS QUESTION TEXTS
# ============================================================

def get_previous_question_texts(
    session: AdaptiveSession,
) -> list[str]:

    return [
        item.question.question_text
        for item in session.history
    ]


# ============================================================
# GENERATE NEXT UNIQUE QUESTION
# ============================================================

async def generate_next_question(
    session: AdaptiveSession,
):

    from AI_Layer.ai_core import (
        generate_validated_question,
    )


    # --------------------------------------------------------
    # 1. Choose concept using adaptive weights.
    # --------------------------------------------------------

    concept = choose_weighted_concept(
        session
    )


    


    # --------------------------------------------------------
    # 2. Use THAT concept's current difficulty.
    # --------------------------------------------------------

    difficulty = session.current_difficulty


    # --------------------------------------------------------
    # 3. Give Gemini previous questions so it avoids
    # duplicates.
    # --------------------------------------------------------

    previous_questions = (
        get_previous_question_texts(
            session
        )
    )


    question = await generate_validated_question(

        concept=concept,

        difficulty=difficulty,

        previous_questions=previous_questions,
    )


    # --------------------------------------------------------
    # 4. Assign the NEXT question number.
    # --------------------------------------------------------

    question_number = (
        session.questions_asked + 1
    )


    session.questions_asked = (
        question_number
    )


    # --------------------------------------------------------
    # 5. Store active question.
    # --------------------------------------------------------

    session.current_concept_label = (
        concept.label
    )

    session.current_question = (
        question
    )

    session.current_question_number = (
        question_number
    )


    # --------------------------------------------------------
    # 6. Add to history.
    # --------------------------------------------------------

    from AI_Layer.models import AdaptiveQuestion

    session.history.append(
        AdaptiveQuestion(
            question_number=question_number,
            concept_label=concept.label,
            difficulty=difficulty,
            question=question,
        )
    )


    return (
        concept,
        question,
        question_number,
    )


# ============================================================
# READ UPLOADED MATERIAL
# ============================================================

async def read_uploaded_material(
    file: UploadFile,
):

    file_bytes = await file.read()

    filename = (
        file.filename or ""
    ).lower()


    if (
        filename.endswith(".txt")
        or filename.endswith(".md")
        or file.content_type == "text/plain"
    ):

        try:

            text = file_bytes.decode(
                "utf-8"
            )

        except UnicodeDecodeError:

            text = file_bytes.decode(
                "latin-1"
            )


        from AI_Layer.ai_core import extract_text_and_chunk

        return extract_text_and_chunk(
            text
        )


    from AI_Layer.ai_core import (
        extract_and_chunk,
    )

    return await extract_and_chunk(
        file_bytes
    )


# ============================================================
# SINGLE QUESTION
# ============================================================

class QuestionRequest(BaseModel):

    concept: str

    description: str

    difficulty: Literal[
        "easy",
        "medium",
        "hard",
    ]


@app.post("/generate-question")
async def generate_question_api(
    request: QuestionRequest,
):

    from AI_Layer.ai_core import (
        generate_validated_question,
    )


    concept = Concept(
        label=request.concept,
        description=request.description,
        source_chunk_indices=[0],
    )


    question = await generate_validated_question(
        concept,
        request.difficulty,
    )


    return question.model_dump()


# ============================================================
# CONCEPT EXTRACTION
# ============================================================

@app.post("/extract-concepts")
async def extract_concepts_api(
    file: UploadFile = File(...),
):

    from AI_Layer.ai_core import (
        extract_concepts,
    )


    chunks = await read_uploaded_material(
        file
    )


    concepts = await extract_concepts(
        chunks
    )


    return {
        "filename": file.filename,

        "chunk_count": len(chunks),

        "concepts": [
            concept.model_dump()
            for concept in concepts
        ],
    }


# ============================================================
# START ADAPTIVE QUIZ
# ============================================================

@app.post("/start-adaptive-quiz")
async def start_adaptive_quiz(
    file: UploadFile = File(...),

    title: str = Form("Adaptive Quiz"),

    difficulty: Difficulty = "medium",

    question_count: int = 10,
):

    from AI_Layer.ai_core import (
        extract_concepts,
        deduplicate_concepts,
    )


    question_count = max(
        1,
        min(
            question_count,
            50,
        ),
    )


    try:

        # ----------------------------------------------------
        # Read material.
        # ----------------------------------------------------

        chunks = await read_uploaded_material(
            file
        )


        if not chunks:

            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable study material "
                    "was found."
                ),
            )


        # ----------------------------------------------------
        # Extract concepts.
        # ----------------------------------------------------

        concept_drafts = (
            await extract_concepts(
                chunks
            )
        )


        concepts = (
            await deduplicate_concepts(
                concept_drafts
            )
        )


        if not concepts:

            raise HTTPException(
                status_code=400,
                detail=(
                    "No educational concepts "
                    "could be extracted."
                ),
            )


        # ----------------------------------------------------
        # Initialize EVERY concept independently.
        # ----------------------------------------------------
        concept_states = {}

        for concept in concepts:
            concept_states[
                concept.label
            ] = ConceptState(
                concept_label=concept.label,
                difficulty=difficulty,
                times_asked=0,
                correct_count=0,
                incorrect_count=0,
            )
        # ----------------------------------------------------
        # Create session.
        # ----------------------------------------------------

        session_id = str(
            uuid.uuid4()
        )


        session = AdaptiveSession(
            session_id=session_id,
            title=title,
            total_questions=question_count,
            starting_difficulty=difficulty,
            current_difficulty=difficulty,
            streak_direction="",
            streak_count=0,
            concepts=concepts,
            concept_states=concept_states,
        )


        adaptive_sessions[
            session_id
        ] = session


        # ----------------------------------------------------
        # Generate Q1 RIGHT NOW.
        # ----------------------------------------------------

        (
            concept,
            question,
            question_number,
        ) = await generate_next_question(
            session
        )


        return {

            "session_id": session_id,

            "title": (
                file.filename
                or "Adaptive Quiz"
            ),

            "total_questions": (
                question_count
            ),

            "question_number": (
                question_number
            ),

            "concept_label": (
                concept.label
            ),

            "difficulty": (
                session.current_difficulty
            ),

            "question": (
                question.model_dump()
            ),
        }


    except HTTPException:
        raise


    except Exception as e:

        print(
            "Adaptive quiz start error:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not start adaptive quiz: "
                f"{e}"
            ),
        )


# ============================================================
# ANSWER ADAPTIVE QUESTION
# ============================================================

@app.post("/answer-adaptive-question")
async def answer_adaptive_question(
    request: AdaptiveQuizAnswerRequest,
):

    session = adaptive_sessions.get(
        request.session_id
    )


    if session is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "Adaptive quiz session not found."
            ),
        )


    # --------------------------------------------------------
    # Make sure there is an active question.
    # --------------------------------------------------------

    if (
        session.current_question is None
        or session.current_concept_label is None
        or session.current_question_number is None
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "There is no active question."
            ),
        )


    # --------------------------------------------------------
    # Prevent duplicate submissions.
    # --------------------------------------------------------

    if (
        request.question_number
        != session.current_question_number
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Question number does not match "
                "the active question."
            ),
        )


    question = session.current_question


    # --------------------------------------------------------
    # Validate answer index.
    # --------------------------------------------------------

    if not (
        0
        <= request.selected_option_index
        < len(question.options)
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid answer option.",
        )


    # --------------------------------------------------------
    # Backend determines correctness.
    # --------------------------------------------------------

    selected_option = question.options[
        request.selected_option_index
    ]


    was_correct = (
        selected_option.is_correct
    )


    concept_label = (
        session.current_concept_label
    )


    # --------------------------------------------------------
# Update performance for the answered concept.
# Difficulty and streak are GLOBAL to the quiz.
# --------------------------------------------------------

    state = session.concept_states[
        concept_label
    ]

    state = update_concept_performance(
        state,
        was_correct,
    )

    # --------------------------------------------------------
    # GLOBAL ADAPTIVE STREAK
    # --------------------------------------------------------

    difficulty_before = (
        session.current_difficulty
    )

    direction = (
        "correct"
        if was_correct
        else "incorrect"
    )

    # If the answer direction changed, start a new streak.
    if session.streak_direction != direction:

        session.streak_direction = direction
        session.streak_count = 1

    else:

        session.streak_count += 1


    # --------------------------------------------------------
    # TWO CONSECUTIVE CORRECT ANSWERS
    # --------------------------------------------------------

    if (
        was_correct
        and session.streak_count == 2
    ):

        session.current_difficulty = (
            clamp_difficulty(
                session.current_difficulty,
                +1,
            )
        )

        session.streak_count = 0
        session.streak_direction = ""


    # --------------------------------------------------------
    # TWO CONSECUTIVE INCORRECT ANSWERS
    # --------------------------------------------------------

    elif (
        not was_correct
        and session.streak_count == 2
    ):

        session.current_difficulty = (
            clamp_difficulty(
                session.current_difficulty,
                -1,
            )
        )

        session.streak_count = 0
        session.streak_direction = ""


    difficulty_after = (
        session.current_difficulty
    )

    # --------------------------------------------------------
    # QUIZ COMPLETE
    # --------------------------------------------------------

    if (
        session.questions_asked
        >= session.total_questions
    ):

        session.current_question = None
        session.current_concept_label = None
        session.current_question_number = None

        return {
            "session_id": session.session_id,
            "completed": True,
            "question_number": request.question_number,
            "total_questions": session.total_questions,
            "was_correct": was_correct,
            "answered_concept": concept_label,
            "answered_difficulty": difficulty_before,
            "new_difficulty": difficulty_after,
            "streak_direction": session.streak_direction,
            "streak_count": session.streak_count,
            "next_question_number": None,
            "next_concept": None,
            "next_difficulty": None,
            "question": None,
        }

    # --------------------------------------------------------
    # Generate next question.
    # --------------------------------------------------------

    try:

        (
            next_concept,
            next_question,
            next_question_number,
        ) = await generate_next_question(
            session
        )

    except Exception as e:

        print(
            "Next adaptive question error:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The answer was recorded, but "
                "the next question could not "
                f"be generated: {e}"
            ),
        )


    # --------------------------------------------------------
    # IMPORTANT:
    #
    # Return the NEXT question number.
    #
    # This fixes the bug where Q2 received ID 1
    # and inherited Q1's selected option.
    # --------------------------------------------------------

    return {

        "session_id": (
            session.session_id
        ),

        "completed": False,

        "question_number": (
            request.question_number
        ),

        "total_questions": (
            session.total_questions
        ),

        "was_correct": (
            was_correct
        ),

        "answered_concept": (
            concept_label
        ),

        "answered_difficulty": (
            difficulty_before
        ),

        "new_difficulty": (
            difficulty_after
        ),

        "streak_direction": (
            session.streak_direction
        ),

        "streak_count": (
            session.streak_count
        ),

        "next_question_number": (
            next_question_number
        ),

        "next_concept": (
            next_concept.label
        ),

        "next_difficulty": (
            session.current_difficulty
        ),

        "question": (
            next_question.model_dump()
        ),
    }


# ============================================================
# LEGACY BATCH GENERATION
# ============================================================

@app.post("/generate-quiz")
async def generate_quiz_api(
    file: UploadFile = File(...),

    difficulty: Difficulty = "easy",

    question_count: int = 10,
):

    from AI_Layer.ai_core import (
        extract_concepts,
        deduplicate_concepts,
        generate_validated_question,
    )


    question_count = max(
        1,
        min(
            question_count,
            50,
        ),
    )


    chunks = await read_uploaded_material(
        file
    )


    if not chunks:

        return {
            "filename": file.filename,
            "difficulty": difficulty,
            "concept_count": 0,
            "question_count": 0,
            "questions": [],
        }


    concept_drafts = (
        await extract_concepts(
            chunks
        )
    )


    concepts = (
        await deduplicate_concepts(
            concept_drafts
        )
    )


    if not concepts:

        return {
            "filename": file.filename,
            "difficulty": difficulty,
            "concept_count": 0,
            "question_count": 0,
            "questions": [],
        }


    questions = []

    previous_questions = []


    for i in range(question_count):

        concept = concepts[
            i % len(concepts)
        ]


        question = (
            await generate_validated_question(

                concept,

                difficulty,

                previous_questions=(
                    previous_questions
                ),
            )
        )


        previous_questions.append(
            question.question_text
        )


        questions.append(
            {
                "concept": (
                    concept.model_dump()
                ),

                "question": (
                    question.model_dump()
                ),
            }
        )


    return {

        "filename": file.filename,

        "difficulty": difficulty,

        "concept_count": len(concepts),

        "question_count": len(questions),

        "questions": questions,
    }
from typing import Literal

from pydantic import BaseModel, Field


Difficulty = Literal["easy", "medium", "hard"]
StreakDirection = Literal["correct", "incorrect", ""]


# ============================================================
# 1.1 EXTRACTION MODELS
# ============================================================

class Chunk(BaseModel):
    chunk_index: int
    text: str
    approx_page_range: str = Field(
        description="Approximate pages this text spans, e.g., '1-2'"
    )


# ============================================================
# 1.2 CONCEPT MODELS
# ============================================================

class ConceptDraft(BaseModel):
    label: str = Field(
        description="Short, concise name of the concept"
    )
    description: str = Field(
        description="One-line explanation of the concept"
    )
    source_chunk_index: int


class Concept(BaseModel):
    label: str
    description: str
    source_chunk_indices: list[int]


# ============================================================
# 1.3 QUESTION GENERATION MODELS
# ============================================================

class OptionDraft(BaseModel):
    text: str
    is_correct: bool
    misconception_tag: str | None = Field(
        default=None,
        description=(
            "Named misconception for wrong answers. "
            "Null for the correct answer."
        ),
    )


class QuestionDraft(BaseModel):
    question_text: str
    options: list[OptionDraft]
    difficulty: Difficulty


class ValidationResult(BaseModel):
    passed: bool
    notes: str = Field(
        description="Explanation of why the question passed or failed"
    )


# ============================================================
# 1.4 ADAPTIVE ENGINE MODELS
# ============================================================

class ConceptState(BaseModel):
    """
    Runtime performance state for one concept.

    Difficulty and answer streak are GLOBAL to the quiz session.
    This object only tracks how well the student is doing on
    this particular concept.
    """

    concept_label: str

    times_asked: int = 0

    correct_count: int = 0

    incorrect_count: int = 0


class AdaptiveQuestion(BaseModel):
    """
    Question stored in adaptive session history.
    """

    question_number: int

    concept_label: str

    difficulty: Difficulty

    question: QuestionDraft


class AdaptiveSession(BaseModel):
    """
    Complete server-side state for one adaptive quiz.
    """

    session_id: str

    title: str

    total_questions: int

    starting_difficulty: Difficulty

    current_difficulty: Difficulty

    streak_direction: StreakDirection = ""

    streak_count: int = 0

    concepts: list[Concept]

    concept_states: dict[str, ConceptState]

    questions_asked: int = 0

    current_concept_label: str | None = None

    current_question: QuestionDraft | None = None

    current_question_number: int | None = None

    history: list[AdaptiveQuestion] = Field(
        default_factory=list
    )


class AdaptiveQuizStartResponse(BaseModel):
    session_id: str
    title: str
    total_questions: int
    question_number: int
    concept_label: str
    difficulty: Difficulty
    question: QuestionDraft


class AdaptiveQuizAnswerRequest(BaseModel):
    session_id: str
    question_number: int
    selected_option_index: int


class AdaptiveQuizAnswerResponse(BaseModel):
    session_id: str
    completed: bool

    question_number: int
    total_questions: int

    was_correct: bool

    answered_concept: str
    answered_difficulty: Difficulty

    new_difficulty: Difficulty

    streak_direction: StreakDirection
    streak_count: int

    next_question_number: int | None = None

    next_concept: str | None = None

    next_difficulty: Difficulty | None = None

    question: QuestionDraft | None = None


# ============================================================
# 1.5 REPORT MODELS
# ============================================================

class ConceptReport(BaseModel):
    concept_label: str
    final_difficulty: Difficulty
    accuracy: float
    question_count: int


class QuizReportData(BaseModel):
    concepts: list[ConceptReport]
    weakest_concept_labels: list[str]


# ============================================================
# 1.6 STRETCH GOAL
# ============================================================

class CalibrationEstimate(BaseModel):
    suggested_starting_difficulty: Difficulty

    confidence_note: str = Field(
        description="Heuristic note about why this difficulty was chosen."
    )


class ChatTurn(BaseModel):
    role: Literal["user", "model"]
    text: str
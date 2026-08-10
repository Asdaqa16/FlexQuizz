from typing import Literal

from pydantic import BaseModel, Field

# --- 1.1 Extraction Models ---


class Chunk(BaseModel):
    chunk_index: int
    text: str
    approx_page_range: str = Field(
        description="Approximate pages this text spans, e.g., '1-2'"
    )


# --- 1.2 & 1.3 Concept Models ---


class ConceptDraft(BaseModel):
    label: str = Field(
        description="Short, concise name of the concept (e.g., 'Binary Search Trees')"
    )
    description: str = Field(description="One-line explanation of the concept")
    source_chunk_index: int


class Concept(BaseModel):
    label: str
    description: str
    source_chunk_indices: list[int]


# --- 1.4 & 1.5 Question Generation Models ---


class OptionDraft(BaseModel):
    text: str
    is_correct: bool
    misconception_tag: str | None = Field(
        default=None,
        description=(
            "Named misconception for wrong answers "
            "(e.g., 'Sign error'). Null for the correct answer."
        ),
    )


class QuestionDraft(BaseModel):
    question_text: str
    options: list[OptionDraft]
    difficulty: Literal["easy", "medium", "hard"]


class ValidationResult(BaseModel):
    passed: bool
    notes: str = Field(description="Explanation of why it passed or failed validation")


# --- 1.7 Report Models ---


class ConceptReport(BaseModel):
    concept_label: str
    final_difficulty: Literal["easy", "medium", "hard"]
    accuracy: float
    question_count: int


class QuizReportData(BaseModel):
    concepts: list[ConceptReport]
    weakest_concept_labels: list[str]


# --- 1.8 & 1.9 Stretch Goal Models ---


class CalibrationEstimate(BaseModel):
    suggested_starting_difficulty: Literal["easy", "medium", "hard"]
    confidence_note: str = Field(
        description="Heuristic note about why this difficulty was chosen."
    )


class ChatTurn(BaseModel):
    role: Literal["user", "model"]
    text: str

import random
import asyncio
import io
import logging
import os
from functools import wraps

from dotenv import load_dotenv
from google import genai
from pydantic import TypeAdapter
from pypdf import PdfReader

from exceptions import (
    ConceptExtractionError,
    PDFProcessingError,
    QuestionGenerationError,
    ValidationFailedError,
)

from models import (
    CalibrationEstimate,
    ChatTurn,
    Chunk,
    Concept,
    ConceptDraft,
    Difficulty,
    QuestionDraft,
    QuizReportData,
    ValidationResult,
)


logger = logging.getLogger(__name__)


# ============================================================
# ENVIRONMENT / GEMINI
# ============================================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

try:
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    client = genai.Client(
        api_key=api_key
    )

except ValueError as e:
    logger.warning(
        "Failed to initialize Gemini Client: %s",
        e,
    )

    client = None


# ============================================================
# CONSTANTS
# ============================================================

MODEL_TEXT = "gemini-3.1-flash-lite"

MAX_QUIZ_CONCEPTS = 8


# ============================================================
# RETRY HELPER
# ============================================================

def with_retry(
    retries: int = 0,
    backoff: float = 1.5,
    custom_exc=None,
):
    def decorator(func):

        @wraps(func)
        async def wrapper(*args, **kwargs):

            for attempt in range(retries + 1):

                try:
                    return await func(
                        *args,
                        **kwargs,
                    )

                except Exception as e:

                    if attempt == retries:

                        if custom_exc:
                            raise custom_exc(
                                f"Failed after {retries} retries "
                                f"in {func.__name__}: {e}"
                            ) from e

                        raise

                    await asyncio.sleep(
                        backoff ** attempt
                    )

        return wrapper

    return decorator


# ============================================================
# PDF EXTRACTION
# ============================================================

@with_retry(retries=1, custom_exc=PDFProcessingError)
async def extract_and_chunk(
    pdf_bytes: bytes,
) -> list[Chunk]:

    try:

        reader = PdfReader(
            io.BytesIO(pdf_bytes)
        )

        chunks = []

        current_words = []

        chunk_index = 0

        start_page = 1

        TARGET_WORDS = 1200

        OVERLAP_WORDS = 150

        for page_num, page in enumerate(
            reader.pages,
            1,
        ):

            text = page.extract_text()

            if not text:
                continue

            words = text.split()

            for word in words:

                current_words.append(
                    word
                )

                if len(current_words) >= TARGET_WORDS:

                    chunks.append(
                        Chunk(
                            chunk_index=chunk_index,
                            text=" ".join(
                                current_words
                            ),
                            approx_page_range=(
                                f"{start_page}-{page_num}"
                            ),
                        )
                    )

                    chunk_index += 1

                    current_words = (
                        current_words[
                            -OVERLAP_WORDS:
                        ]
                    )

                    start_page = page_num

        if current_words:

            chunks.append(
                Chunk(
                    chunk_index=chunk_index,
                    text=" ".join(
                        current_words
                    ),
                    approx_page_range=(
                        f"{start_page}-{len(reader.pages)}"
                    ),
                )
            )

        # --------------------------------------------------------
        # OCR Fallback for scanned / handwritten PDFs
        # --------------------------------------------------------
        
        total_words = sum(len(chunk.text.split()) for chunk in chunks)
        
        if total_words < 20:
            
            if client is None:
                raise PDFProcessingError(
                    "Gemini client is not initialized for OCR fallback."
                )
            
            print(f"[DEBUG] total_words={total_words}. Falling back to Gemini OCR.")
            
            prompt = (
                "Please transcribe all the readable text from this document "
                "as accurately as possible. Output only the transcribed text."
            )
            
            try:
                response = await client.aio.models.generate_content(
                    model=MODEL_TEXT,
                    contents=[
                        prompt,
                        genai.types.Part.from_bytes(
                            data=pdf_bytes,
                            mime_type="application/pdf",
                        )
                    ]
                )
                print(f"[DEBUG] Gemini OCR response text: {repr(response.text)}")
                transcribed_text = response.text or ""
            except Exception as gemini_e:
                print(f"[DEBUG] Gemini OCR failed: {repr(gemini_e)}")
                transcribed_text = ""
                
            return extract_text_and_chunk(transcribed_text)

        return chunks

    except Exception as e:

        raise PDFProcessingError(
            f"Failed to process PDF: {e}"
        ) from e


# ============================================================
# TEXT EXTRACTION
# ============================================================

def extract_text_and_chunk(
    text: str,
) -> list[Chunk]:

    text = text.strip()

    if not text:
        return []

    return [
        Chunk(
            chunk_index=0,
            text=text,
            approx_page_range="1",
        )
    ]


# ============================================================
# CONCEPT EXTRACTION
# ============================================================

@with_retry(
    retries=1,
    custom_exc=ConceptExtractionError,
)
async def extract_concepts(
    chunks: list[Chunk],
) -> list[ConceptDraft]:

    if not chunks:
        return []

    if client is None:

        raise ConceptExtractionError(
            "Gemini client is not initialized. "
            "Check GEMINI_API_KEY."
        )

    MAX_SOURCE_WORDS = 9000

    source_words = []

    for chunk in chunks:

        source_words.extend(
            chunk.text.split()
        )

        if len(source_words) >= MAX_SOURCE_WORDS:
            break

    source_text = " ".join(
        source_words[:MAX_SOURCE_WORDS]
    )

    prompt = (
        "Extract the most important distinct educational "
        "concepts or topics from the following study material.\n\n"

        f"Return at most {MAX_QUIZ_CONCEPTS} concepts.\n"

        "Each concept must be meaningfully distinct.\n"

        "For each concept provide:\n"
        "- a short label\n"
        "- a one-line description\n\n"

        "Merge overlapping concepts instead of repeating them.\n\n"

        f"Source material:\n{source_text}"
    )

    response = await client.aio.models.generate_content(

        model=MODEL_TEXT,

        contents=prompt,

        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[ConceptDraft],
            temperature=0.1,
        ),
    )

    drafts = TypeAdapter(
        list[ConceptDraft]
    ).validate_json(
        response.text
    )

    drafts = drafts[
        :MAX_QUIZ_CONCEPTS
    ]

    for draft in drafts:
        draft.source_chunk_index = 0

    return drafts


# ============================================================
# CONCEPT DEDUPLICATION
# ============================================================

async def deduplicate_concepts(
    concept_drafts: list[ConceptDraft],
) -> list[Concept]:

    if not concept_drafts:
        return []

    final_concepts = []

    seen_labels = set()

    for draft in concept_drafts[
        :MAX_QUIZ_CONCEPTS
    ]:

        label = draft.label.strip()

        if not label:
            continue

        key = label.lower()

        if key in seen_labels:
            continue

        seen_labels.add(key)

        final_concepts.append(
            Concept(
                label=label,
                description=draft.description.strip(),
                source_chunk_indices=[
                    draft.source_chunk_index
                ],
            )
        )

    return final_concepts


# ============================================================
# QUESTION GENERATION
# ============================================================

@with_retry(
    retries=1,
    custom_exc=QuestionGenerationError,
)
async def generate_question(
    concept: Concept,
    difficulty: Difficulty,
    previous_questions: list[str] | None = None,
) -> QuestionDraft:

    if client is None:

        raise QuestionGenerationError(
            "Gemini client is not initialized. "
            "Check GEMINI_API_KEY."
        )

    previous_questions = (
        previous_questions or []
    )

    # Keep the prompt from becoming unnecessarily huge.
    previous_questions = previous_questions[
        -20:
    ]

    if previous_questions:

        previous_text = "\n".join(
            f"- {question}"
            for question in previous_questions
        )

        uniqueness_instruction = f"""
IMPORTANT — QUESTIONS ALREADY ASKED

Do NOT repeat, paraphrase, or lightly modify any
of these previously asked questions:

{previous_text}

The new question MUST test a different aspect,
relationship, example, application, or reasoning
path within the concept.
"""

    else:

        uniqueness_instruction = """
There are no previously asked questions.
Generate an original question.
"""

    prompt = f"""
Create ONE multiple-choice question about:

Concept:
{concept.label}

Concept description:
{concept.description}

Required difficulty:
{difficulty}

{uniqueness_instruction}

Rules:

1. Provide exactly 4 options.
2. Exactly ONE option must have is_correct=true.
3. The other THREE options must have is_correct=false.
4. The correct answer must genuinely answer the question.
5. Wrong options should represent realistic misconceptions.
6. Use clear educational language.
7. Match the requested difficulty.
8. Do not copy or paraphrase previous questions.
9. Test a different aspect of the concept when possible.
10. Return only the structured JSON response.
"""

    response = await client.aio.models.generate_content(

        model=MODEL_TEXT,

        contents=prompt,

        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=QuestionDraft,
            temperature=0.65,
        ),
    )

    question = QuestionDraft.model_validate_json(
        response.text
    )

    # --------------------------------------------------------
    # Defensive validation
    # --------------------------------------------------------

    if len(question.options) != 4:

        raise QuestionGenerationError(
            "Gemini returned a question with "
            f"{len(question.options)} options instead of 4."
        )

    correct_count = sum(
        option.is_correct
        for option in question.options
    )

    if correct_count != 1:

        raise QuestionGenerationError(
            "Gemini returned a question without "
            "exactly one correct answer."
        )

    # Make sure Gemini actually respected the
    # requested difficulty.
    if question.difficulty != difficulty:

        raise QuestionGenerationError(
            "Gemini returned difficulty "
            f"'{question.difficulty}' instead of "
            f"requested '{difficulty}'."
        )

    # --------------------------------------------------------
    # Backend duplicate guard
    # --------------------------------------------------------

    normalized_new_question = (
        " ".join(
            question.question_text
            .lower()
            .split()
        )
    )

    for old_question in previous_questions:

        normalized_old_question = (
            " ".join(
                old_question
                .lower()
                .split()
            )
        )

        if (
            normalized_new_question
            == normalized_old_question
        ):

            raise QuestionGenerationError(
                "Gemini generated a duplicate question."
            )

    return question


# ============================================================
# QUESTION VALIDATION
# ============================================================

@with_retry(
    retries=1,
    custom_exc=QuestionGenerationError,
)
async def validate_question(
    question: QuestionDraft,
) -> ValidationResult:

    if client is None:

        raise QuestionGenerationError(
            "Gemini client is not initialized."
        )

    correct_indices = [
        i
        for i, option in enumerate(
            question.options
        )
        if option.is_correct
    ]

    prompt = (
        "You are an expert educational question validator.\n\n"

        "Check whether this multiple-choice question "
        "has exactly one unambiguously correct answer.\n\n"

        f"Question:\n{question.question_text}\n\n"

        "Options:\n"
        f"{[option.text for option in question.options]}\n\n"

        "Intended correct answer index:\n"
        f"{correct_indices}\n\n"

        "Return passed=true only if the intended answer "
        "is clearly correct and all distractors are clearly wrong."
    )

    response = await client.aio.models.generate_content(

        model=MODEL_TEXT,

        contents=prompt,

        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ValidationResult,
            temperature=0.1,
        ),
    )

    return ValidationResult.model_validate_json(
        response.text
    )


# ============================================================
# GENERATE + VALIDATE
# ============================================================

async def generate_validated_question(
    concept: Concept,
    difficulty: Difficulty,
    previous_questions: list[str] | None = None,
) -> QuestionDraft:

    previous_questions = (
        previous_questions or []
    )

    last_error = None

    # Multiple attempts are important because Gemini
    # may occasionally produce a duplicate or invalid question.
    for attempt in range(4):

        try:

            question = await generate_question(
                concept=concept,
                difficulty=difficulty,
                previous_questions=previous_questions,
            )

            validation = await validate_question(
                question
            )

            if validation.passed:

                # Randomize answer positions after validation.
                # The is_correct flag stays attached to each option.

                random.shuffle(
                    question.options
                )

                return question

            last_error = (
                "Question failed validation: "
                f"{validation.notes}"
            )

        except Exception as e:

            last_error = str(e)

    raise ValidationFailedError(
        f"Could not generate a valid unique question "
        f"for '{concept.label}' at {difficulty} difficulty. "
        f"{last_error}"
    )


# ============================================================
# WRONG-ANSWER EXPLANATION
# ============================================================

@with_retry(retries=2)
async def generate_explanation(
    question: QuestionDraft,
    selected_option_index: int,
) -> str:

    selected_option = question.options[
        selected_option_index
    ]

    if selected_option.is_correct:

        return (
            "That is the correct answer! Well done."
        )

    misconception = (
        selected_option.misconception_tag
        or "general misunderstanding"
    )

    prompt = (
        "A student answered this question incorrectly.\n\n"
        f"Question: {question.question_text}\n"
        f"They selected: {selected_option.text}\n"
        f"Misconception: {misconception}\n\n"
        "Write a short, encouraging explanation "
        "of why the correct answer is right."
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=0.3
        ),
    )

    return response.text.strip()


# ============================================================
# END-OF-QUIZ SUMMARY
# ============================================================

@with_retry(retries=2)
async def generate_quiz_summary(
    report_data: QuizReportData,
) -> str:

    data_str = "Concepts Tested:\n"

    for concept in report_data.concepts:

        data_str += (
            f"- {concept.concept_label}: "
            f"Ended at {concept.final_difficulty.upper()} "
            f"difficulty. "
            f"Accuracy: {concept.accuracy:.0%}.\n"
        )

    data_str += (
        "\nWeakest Concepts: "
        + ", ".join(
            report_data.weakest_concept_labels
        )
    )

    prompt = (
        "You are an empathetic professional tutor.\n"
        "Based on the following quiz report, write "
        "one encouraging paragraph summarizing "
        "the student's performance.\n\n"
        f"{data_str}"
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=0.5
        ),
    )

    return response.text.strip()


# ============================================================
# STRETCH: PAST PAPER CALIBRATION
# ============================================================

@with_retry(retries=1)
async def analyze_past_paper(
    pdf_bytes: bytes,
) -> CalibrationEstimate:

    chunks = extract_and_chunk(
        pdf_bytes
    )[:3]

    combined_text = "\n\n".join(
        chunk.text
        for chunk in chunks
    )

    prompt = (
        "Review this exam excerpt and estimate "
        "its difficulty as easy, medium, or hard.\n\n"
        f"{combined_text}"
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=CalibrationEstimate,
            temperature=0.2,
        ),
    )

    return CalibrationEstimate.model_validate_json(
        response.text
    )


# ============================================================
# TUTOR FOLLOW-UP CHAT
# ============================================================

@with_retry(retries=2)
async def tutor_followup(
    concept: Concept,
    conversation_history: list[ChatTurn],
    student_message: str,
) -> str:

    contents = [
        genai.types.Content(
            role=(
                "user"
                if turn.role == "user"
                else "model"
            ),
            parts=[
                genai.types.Part.from_text(
                    text=turn.text
                )
            ],
        )
        for turn in conversation_history
    ]

    system_instruction = (
        f"You are a helpful tutor explaining "
        f"'{concept.label}' "
        f"({concept.description}). "
        "Keep answers concise, encouraging, "
        "and in plain language."
    )

    contents.append(
        genai.types.Content(
            role="user",
            parts=[
                genai.types.Part.from_text(
                    text=(
                        f"{system_instruction}\n\n"
                        f"Student: {student_message}"
                    )
                )
            ],
        )
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=contents,
        config=genai.types.GenerateContentConfig(
            temperature=0.6
        ),
    )

    return response.text.strip()
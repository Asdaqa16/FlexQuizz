import asyncio
import io
import logging
import math
import os
from functools import wraps
from typing import Literal

from dotenv import load_dotenv
from exceptions import (
    ConceptExtractionError,
    PDFProcessingError,
    QuestionGenerationError,
    ValidationFailedError,
)
from google import genai
from google.genai import types
from models import (
    CalibrationEstimate,
    ChatTurn,
    Chunk,
    Concept,
    ConceptDraft,
    QuestionDraft,
    QuizReportData,
    ValidationResult,
)
from pydantic import TypeAdapter
from pypdf import PdfReader

logger = logging.getLogger(__name__)


# Load environment variables
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

try:
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)

except ValueError as e:
    logger.warning("Failed to initialize Gemini Client: %s", e)
    client = None


# Constants
MODEL_TEXT = "gemini-2.5-flash"
MODEL_EMBEDDING = "text-embedding-004"


# --- Utility: Async Retry Decorator ---
def with_retry(retries: int = 2, backoff: float = 1.5, custom_exc=None):
    """Decorator to retry async functions on transient failures."""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(retries + 1):
                try:
                    return await func(*args, **kwargs)

                except Exception as e:
                    if attempt == retries:
                        if custom_exc:
                            raise custom_exc(
                                f"Failed after {retries} retries "
                                f"in {func.__name__}: {e}"
                            ) from e

                        raise

                    await asyncio.sleep(backoff**attempt)

        return wrapper

    return decorator


# --- 1.1 Text Extraction & Chunking ---
def extract_and_chunk(pdf_bytes: bytes) -> list[Chunk]:
    """Extracts text from a PDF and chunks it by word count with slight overlap."""

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        chunks = []
        current_chunk_words = []
        chunk_index = 0
        start_page = 1

        # Target chunk sizes
        TARGET_WORDS = 1200
        OVERLAP_WORDS = 150

        # Note: If OCR is required in the future for scanned PDFs,
        # hook in pytesseract here when len(page.extract_text().strip()) == 0.

        for page_num, page in enumerate(reader.pages, 1):
            text = page.extract_text()

            if not text:
                continue

            words = text.split()

            for word in words:
                current_chunk_words.append(word)

                if len(current_chunk_words) >= TARGET_WORDS:
                    chunks.append(
                        Chunk(
                            chunk_index=chunk_index,
                            text=" ".join(current_chunk_words),
                            approx_page_range=f"{start_page}-{page_num}",
                        )
                    )

                    chunk_index += 1

                    # Keep overlap, adjust start_page
                    current_chunk_words = current_chunk_words[-OVERLAP_WORDS:]
                    start_page = page_num

        # Add remaining text as the final chunk
        if len(current_chunk_words) > OVERLAP_WORDS:
            chunks.append(
                Chunk(
                    chunk_index=chunk_index,
                    text=" ".join(current_chunk_words),
                    approx_page_range=f"{start_page}-{len(reader.pages)}",
                )
            )

        return chunks

    except Exception as e:
        raise PDFProcessingError(f"Failed to process PDF: {e!s}") from e


# --- 1.2 Concept Extraction ---
@with_retry(retries=2, custom_exc=ConceptExtractionError)
async def extract_concepts(chunks: list[Chunk]) -> list[ConceptDraft]:
    """Calls Gemini to identify concepts in a chunk, returning structured data."""

    all_drafts = []

    # We iterate over chunks. For production with large PDFs,
    # asyncio.gather() could map this, but we process sequentially here
    # to respect rate limits simply.
    for chunk in chunks:
        prompt = (
            "Extract distinct educational concepts or topics from the following text. "
            "Provide a short label and a one-line description for each. "
            f"Source text:\n{chunk.text}"
        )

        response = await client.aio.models.generate_content(
            model=MODEL_TEXT,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                # The SDK requires a Pydantic model for structured output
                response_schema=list[ConceptDraft],
                temperature=0.1,
            ),
        )

        # Gemini returns parsed JSON matching the schema if response_schema is provided.
        # We manually attach the correct chunk index to enforce consistency.
        drafts: list[ConceptDraft] = TypeAdapter(list[ConceptDraft]).validate_json(
            response.text
        )

        for draft in drafts:
            draft.source_chunk_index = chunk.chunk_index

        all_drafts.extend(drafts)

    return all_drafts


# --- 1.3 Concept Deduplication (Embeddings) ---
async def deduplicate_concepts(
    concept_drafts: list[ConceptDraft],
) -> list[Concept]:
    """Clusters near-duplicate concepts using cosine similarity of embeddings."""

    if not concept_drafts:
        return []

    # 1. Prepare texts for embedding
    texts_to_embed = [
        f"{concept.label}: {concept.description}" for concept in concept_drafts
    ]

    # 2. Fetch embeddings
    response = await client.aio.models.embed_content(
        model=MODEL_EMBEDDING,
        contents=texts_to_embed,
    )

    embeddings = [emb.values for emb in response.embeddings]

    # Utility: Cosine Similarity
    def cosine_sim(vec_a, vec_b):
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0

    # 3. Greedy Clustering Threshold
    THRESHOLD = 0.85
    clusters: list[list[int]] = []

    for i, emb in enumerate(embeddings):
        added_to_cluster = False

        for cluster in clusters:
            # Compare to the center/first element of the existing cluster
            center_idx = cluster[0]
            sim = cosine_sim(emb, embeddings[center_idx])

            if sim >= THRESHOLD:
                cluster.append(i)
                added_to_cluster = True
                break

        if not added_to_cluster:
            clusters.append([i])

    # 4. Merge clusters into final Concept list
    final_concepts = []

    for cluster in clusters:
        primary = concept_drafts[cluster[0]]

        # Aggregate all source chunks from the cluster, deduplicate, and sort
        indices = {concept_drafts[idx].source_chunk_index for idx in cluster}

        final_concepts.append(
            Concept(
                label=primary.label,
                description=primary.description,
                source_chunk_indices=sorted(indices),
            )
        )

    return final_concepts


# --- 1.4 Question Generation ---
@with_retry(retries=2, custom_exc=QuestionGenerationError)
async def generate_question(
    concept: Concept,
    difficulty: Literal["easy", "medium", "hard"],
) -> QuestionDraft:
    """Generates an MCQ with strictly tagged distractor misconceptions."""

    prompt = (
        f"Create a multiple choice question about '{concept.label}' "
        f"({concept.description}) at a '{difficulty}' difficulty level. "
        "Use plain language.\n\n"
        "RULES:\n"
        "1. Provide exactly 4 options. Only 1 can be correct.\n"
        "2. For the 3 incorrect options (distractors), you MUST provide "
        "a brief, specific 'misconception_tag' "
        "(e.g., 'Sign error', 'Confused X with Y'). "
        "The correct option must have a null misconception_tag."
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=QuestionDraft,
            temperature=0.4,
        ),
    )

    return QuestionDraft.model_validate_json(response.text)


# --- 1.5 Question Validation ---
@with_retry(retries=1, custom_exc=QuestionGenerationError)
async def validate_question(
    question: QuestionDraft,
) -> ValidationResult:
    """Independent model check to ensure question unambiguously has exactly one correct answer."""

    prompt = (
        "You are an expert validator. Review the following multiple choice question. "
        "Solve it independently without looking at the answer key. Then, check if the provided "
        "correct option is definitively correct, and ensure the distractors are unambiguously wrong.\n\n"
        f"Question: {question.question_text}\n"
        f"Options: {[opt.text for opt in question.options]}\n"
        f"Intended correct answer index: "
        f"{[i for i, opt in enumerate(question.options) if opt.is_correct]}\n\n"
        "Does this question pass validation?"
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ValidationResult,
            temperature=0.1,
        ),
    )

    return ValidationResult.model_validate_json(response.text)


# --- Helper: Orchestrating Generation + Validation ---
async def generate_validated_question(
    concept: Concept,
    difficulty: Literal["easy", "medium", "hard"],
) -> QuestionDraft:
    """
    Helper function for the backend teammate.
    Attempts to generate and validate a question up to 3 times before giving up.
    """

    MAX_ATTEMPTS = 3

    for attempt in range(MAX_ATTEMPTS):
        try:
            q_draft = await generate_question(concept, difficulty)
            val_result = await validate_question(q_draft)

            if val_result.passed:
                return q_draft

            logger.info(
                "Question failed validation. Notes: %s. Retrying...",
                val_result.notes,
            )

        except QuestionGenerationError as e:
            logger.warning(
                "Error during question generation/validation attempt %s: %s",
                attempt + 1,
                e,
            )

    raise ValidationFailedError(
        f"Failed to generate a valid question after {MAX_ATTEMPTS} attempts."
    )


# --- 1.6 Wrong-Answer Explanation ---
@with_retry(retries=2)
async def generate_explanation(
    question: QuestionDraft,
    selected_option_index: int,
) -> str:
    """Generates a brief explanation targeting the specific misconception tag of the picked option."""

    selected_option = question.options[selected_option_index]

    if selected_option.is_correct:
        return "That is the correct answer! Well done."

    misconception = selected_option.misconception_tag or "general misunderstanding"

    prompt = (
        f"A student answered this question incorrectly:\n"
        f"{question.question_text}\n"
        f"They selected: {selected_option.text}\n"
        f"This choice indicates the following misconception: {misconception}.\n\n"
        "Write a 2-4 sentence explanation of why the correct answer is right, "
        "directly addressing their specific misconception. Keep the tone encouraging, "
        "use plain language, and avoid jargon."
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.3),
    )

    return response.text.strip()


# --- 1.7 End-of-Quiz Summary ---
@with_retry(retries=2)
async def generate_quiz_summary(
    report_data: QuizReportData,
) -> str:
    """Turns raw quiz metrics into a single encouraging paragraph of prose."""

    # Pre-format the data for the LLM to easily digest
    data_str = "Concepts Tested:\n"

    for concept in report_data.concepts:
        data_str += (
            f"- {concept.concept_label}: Ended at "
            f"{concept.final_difficulty.upper()} difficulty. "
            f"Accuracy: {concept.accuracy:.0%}.\n"
        )

    data_str += (
        f"\nIdentified Weakest Concepts: "
        f"{', '.join(report_data.weakest_concept_labels)}"
    )

    prompt = (
        "You are an empathetic, professional tutor. Based on the following quiz report data, "
        "write a single paragraph (roughly 60-120 words) summarizing the student's performance. "
        "Call out their strongest areas, but specifically name their weakest 2-3 concepts and "
        "frame them as clear areas for review.\n\n"
        "CRITICAL RULES:\n"
        "- Prose only. ONE single paragraph.\n"
        "- NO bullet points, NO headers.\n"
        "- Do not restate raw numbers verbatim (e.g. don't say 'You got 75% accuracy'). "
        "Use natural language instead.\n\n"
        f"Data:\n{data_str}"
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.5),
    )

    return response.text.strip()


# --- 1.8 Stretch: Past Paper Calibration ---
@with_retry(retries=1)
async def analyze_past_paper(
    pdf_bytes: bytes,
) -> CalibrationEstimate:
    """Heuristically estimates exam difficulty to set initial adaptive thresholds."""

    # Extract only a portion (e.g., first few pages) to save tokens/time
    # for a rough heuristic
    chunks = extract_and_chunk(pdf_bytes)[:3]
    combined_text = "\n\n".join(c.text for c in chunks)

    prompt = (
        "Review the following excerpt from an exam paper. Based on the complexity of the language, "
        "the depth of the subject matter, and the nature of the questions (if any), estimate a starting "
        "difficulty ('easy', 'medium', or 'hard') for an adaptive quiz engine.\n"
        "Note: This is a rough heuristic, not a verified calibration.\n\n"
        f"Exam Text:\n{combined_text}"
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=CalibrationEstimate,
            temperature=0.2,
        ),
    )

    return CalibrationEstimate.model_validate_json(response.text)


# --- 1.9 Stretch: Tutor Follow-up Chat ---
@with_retry(retries=2)
async def tutor_followup(
    concept: Concept,
    conversation_history: list[ChatTurn],
    student_message: str,
) -> str:
    """Multi-turn chat function scoped strictly to one concept."""

    # Construct history for the new SDK
    contents = [
        types.Content(
            role="user" if turn.role == "user" else "model",
            parts=[types.Part.from_text(text=turn.text)],
        )
        for turn in conversation_history
    ]

    # Append the current prompt with context
    system_instruction = (
        f"You are a helpful tutor explaining the concept "
        f"'{concept.label}' ({concept.description}). "
        "Keep answers concise, encouraging, and in plain language. "
        "If the user asks about unrelated topics, gently steer them "
        "back to the current concept."
    )

    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(
                    text=f"{system_instruction}\n\nStudent: {student_message}"
                )
            ],
        )
    )

    response = await client.aio.models.generate_content(
        model=MODEL_TEXT,
        contents=contents,
        config=types.GenerateContentConfig(temperature=0.6),
    )

    return response.text.strip()

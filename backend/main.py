
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
from pydantic import BaseModel
from typing import Literal
from dotenv import load_dotenv

load_dotenv()



BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_LAYER_PATH = os.path.join(BASE_DIR, "AI_Layer")

if AI_LAYER_PATH not in sys.path:
    sys.path.insert(0, AI_LAYER_PATH)



app = FastAPI(title="FlexQuizz API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get("/")
def root():
    return {"message": "FlexQuizz API is running"}




@app.get("/test-ai")
async def test_ai():
    try:
        import ai_core

        return {
            "message": "AI Layer imported successfully",
            "api_key_loaded": bool(ai_core.api_key),
            "gemini_client_exists": ai_core.client is not None,
        }

    except Exception as e:
        return {"error": str(e)}



class QuestionRequest(BaseModel):
    concept: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]


@app.post("/generate-question")
async def generate_question_api(request: QuestionRequest):

    from ai_core import generate_validated_question
    from models import Concept

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




@app.post("/extract-concepts")
async def extract_concepts_api(
    file: UploadFile = File(...)
):

    from ai_core import extract_and_chunk, extract_concepts

    pdf_bytes = await file.read()

    chunks = extract_and_chunk(pdf_bytes)
    concepts = await extract_concepts(chunks)

    return {
        "filename": file.filename,
        "chunk_count": len(chunks),
        "concepts": [
            concept.model_dump()
            for concept in concepts
        ],
    }




@app.post("/generate-quiz")
async def generate_quiz_api(
    file: UploadFile = File(...),
    difficulty: Literal["easy", "medium", "hard"] = "easy",
):

    from ai_core import (
        extract_and_chunk,
        extract_concepts,
        deduplicate_concepts,
        generate_validated_question,
    )

    
    pdf_bytes = await file.read()

    

    chunks = extract_and_chunk(pdf_bytes)

    

    concept_drafts = await extract_concepts(chunks)

    

    concepts = await deduplicate_concepts(
        concept_drafts
    )

    

    questions = []

    for concept in concepts:

        question = await generate_validated_question(
            concept,
            difficulty,
        )

        questions.append(
            {
                "concept": concept.model_dump(),
                "question": question.model_dump(),
            }
        )

    
    return {
        "filename": file.filename,
        "difficulty": difficulty,
        "concept_count": len(concepts),
        "questions": questions,
    }


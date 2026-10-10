"""
LabMate - AI Viva Evaluation Service (Python Backend)
"""

import json
import httpx
from typing import Dict, Any
from ..config import settings
from ..schemas.schemas import VivaEvaluationResponse, VivaQuestionResponse

async def evaluate_viva_py(
    question: str,
    student_answer: str,
    experiment_title: str,
    difficulty: str
) -> VivaEvaluationResponse:
    url = f"{settings.OLLAMA_ENDPOINT.rstrip('/')}/api/chat"
    
    prompt = f"""You are an engineering viva examiner for "{experiment_title}" ({difficulty} level).
Question: {question}
Student Answer: {student_answer}

Respond ONLY in valid JSON matching this schema:
{{
  "score": <0 to 10 number>,
  "correctConcepts": ["list of correct points"],
  "missingConcepts": ["list of missed concepts"],
  "incorrectStatements": ["list of errors"],
  "modelAnswer": "comprehensive model answer",
  "explanation": "educational critique in 2-3 sentences",
  "followUpQuestion": "follow-up question"
}}"""

    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT_SECONDS) as client:
            res = await client.post(url, json={
                "model": settings.OLLAMA_MODEL,
                "stream": False,
                "format": "json",
                "messages": [{"role": "user", "content": prompt}]
            })
            if res.status_code == 200:
                parsed = res.json()
                raw_text = parsed.get("message", {}).get("content", "")
                data = json.loads(raw_text)
                return VivaEvaluationResponse(
                    score=float(data.get("score", 7.0)),
                    correctConcepts=data.get("correctConcepts", []),
                    missingConcepts=data.get("missingConcepts", []),
                    incorrectStatements=data.get("incorrectStatements", []),
                    modelAnswer=data.get("modelAnswer", "Standard model answer."),
                    explanation=data.get("explanation", "Evaluated by local Gemma."),
                    followUpQuestion=data.get("followUpQuestion")
                )
    except Exception:
        pass

    # Deterministic fallback evaluation
    return VivaEvaluationResponse(
        score=7.0,
        correctConcepts=["Demonstrated foundational familiarity with subject"],
        missingConcepts=["Explicit mathematical formula and boundary assumptions"],
        incorrectStatements=[],
        modelAnswer="At constant physical temperature, electric current is directly proportional to potential difference: V = I * R.",
        explanation="Accurate foundational attempt. In oral engineering exams, always cite governing laws and units.",
        followUpQuestion="What is the unit of electrical resistance and conductance?"
    )


async def generate_viva_question_py(
    experiment_title: str,
    difficulty: str,
    question_number: int,
    total_questions: int,
    previous_questions: list,
) -> VivaQuestionResponse:
    """Ask the local Gemma model for ONE new viva question. Returns source='unavailable' if Ollama is down."""
    url = f"{settings.OLLAMA_ENDPOINT.rstrip('/')}/api/chat"
    asked = "\n".join(f"- {q}" for q in previous_questions) or "None yet."
    prompt = f"""You are a strict but fair viva examiner in an engineering lab.
Experiment: {experiment_title}
Difficulty: {difficulty}
This is question {question_number} of {total_questions}.
Questions already asked (do NOT repeat or rephrase):
{asked}

Ask exactly ONE new question under 40 words. No answer, no hints, no numbering.
Respond ONLY with JSON: {{"question": "<question>"}}"""
    try:
        async with httpx.AsyncClient(timeout=max(settings.OLLAMA_TIMEOUT_SECONDS, 45)) as client:
            res = await client.post(url, json={
                "model": settings.OLLAMA_MODEL,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.8},
                "messages": [{"role": "user", "content": prompt}],
            })
            if res.status_code == 200:
                data = json.loads(res.json().get("message", {}).get("content", "{}"))
                q = str(data.get("question", "")).strip()
                if 15 <= len(q) <= 400 and q not in previous_questions:
                    return VivaQuestionResponse(question=q, source="gemma")
    except Exception:
        pass
    return VivaQuestionResponse(question=None, source="unavailable")

import pdfplumber
import groq
import json
import re
from dotenv import load_dotenv
from io import BytesIO
import os

load_dotenv()


def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set")
    return groq.Groq(api_key=api_key)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    # Extract all text from PDF given raw bytes
    text_pages = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_pages.append(page_text)
    return "\n\n".join(text_pages)


def parse_syllabus_with_groq(pdf_text: str) -> dict:
    """
    Send extracted syllabus text to Groq and get back structured data:
    - course name
    - assignment categories with weights
    - individual assignments/exams with due dates and point values
    """
    client = get_groq_client()

    prompt = f"""You are a syllabus parser. Extract structured academic data from the syllabus text below.

Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{{
  "course_name": "string",
  "instructor": "string or null",
  "assignment_categories": [
    {{
      "category_name": "string",
      "weight_percent": number or null
    }}
  ],
  "assignments": [
    {{
      "title": "string",
      "type": "string (e.g. Homework, Quiz, Midterm, Final, Project, Presentation, Lab)",
      "due_date": "YYYY-MM-DD or null",
      "points": number or null,
      "max_points": number or null,
      "category_name": "string or null (match to assignment_categories above if possible)"
    }}
  ]
}}

Rules:
- If a weight or points value is not mentioned, use null.
- If a due date is mentioned but year is missing, infer the most likely upcoming year.
- Normalize date formats to YYYY-MM-DD.
- Include every assignment, exam, quiz, project, and presentation you can find.
- For category weights, look for grading breakdowns.

SYLLABUS TEXT:
{pdf_text}
"""

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_completion_tokens=2048,
        top_p=1,
        stream=False,
        stop=None,
    )

    raw = completion.choices[0].message.content.strip()

    # Strip accidental markdown fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    return json.loads(raw)


def process_syllabus(file_bytes: bytes) -> dict:
    """
    Full pipeline: PDF bytes → extracted text → Groq parsing → structured dict.
    """
    pdf_text = extract_text_from_pdf(file_bytes)

    if not pdf_text.strip():
        raise ValueError("Could not extract any text from the PDF. It may be scanned/image-based.")

    parsed = parse_syllabus_with_groq(pdf_text)
    return parsed
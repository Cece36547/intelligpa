import re
from io import BytesIO
import pdfplumber


BAD_CATEGORY_WORDS = [
    "zoom", "http", "email", "office", "regular class", "final class",
    "help needed", "brightspace", "instructor", "communication",
    "table", "due date", "if any", "percentage", "indiv", "individual", "group due"
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_pages = []

    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_pages.append(page_text)

    return "\n".join(text_pages)


def clean_text(text: str) -> str:
    text = text.replace("–", "-").replace("—", "-")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def clean_name(name: str) -> str:
    name = re.sub(r"\s+", " ", name)
    name = name.strip(" .:-,;")

    # Remove common table/header junk
    name = re.sub(r"^(individual|group|indiv\.?|assignment|category)\s+", "", name, flags=re.I)
    name = re.sub(r"\s+(individual|group)$", "", name, flags=re.I)

    # Cut off if it accidentally captured syllabus prose
    stop_phrases = [
        " as this will", " office hours", " the instructor", " via zoom",
        " link via", " brightspace", " due date", " if any"
    ]

    lower = name.lower()
    for phrase in stop_phrases:
        idx = lower.find(phrase)
        if idx != -1:
            name = name[:idx].strip(" .:-,;")
            break

    return name


def is_bad_name(name: str) -> bool:
    lower = name.lower()

    if len(name) < 3 or len(name) > 70:
        return True

    if any(word in lower for word in BAD_CATEGORY_WORDS):
        return True

    if re.fullmatch(r"table\s*\d*", lower):
        return True

    if lower.count("/") >= 2:
        return True
    if name.lower().startswith("ivid"):
        return True

    if "attendance and participation individual" in lower:
        return False

    return False


def extract_course_name(text: str) -> str:
    # Prefer clean line-based matches
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    for line in lines[:40]:
        match = re.search(r"(CSCI\s*\d+[A-Z0-9]*)\s*[-:]\s*(.+)", line, re.I)
        if match:
            code = match.group(1).strip()
            title = clean_name(match.group(2))
            return f"{code} - {title}" if title else code

    # Fallback: just course code
    match = re.search(r"(CSCI\s*\d+[A-Z0-9]*)", text, re.I)
    if match:
        return match.group(1).strip()

    return "Parsed Syllabus Course"


def extract_instructor(text: str) -> str | None:
    patterns = [
        r"(?:Professor|Instructor)\s*[:\-]\s*([A-Za-z .'-]{2,60})",
        r"Prof\.\s*([A-Za-z .'-]{2,60})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            name = clean_name(match.group(1))
            if not is_bad_name(name):
                return name

    return None


def extract_categories(text: str) -> list[dict]:
    categories = []
    seen = set()

    lines = [line.strip() for line in text.splitlines() if line.strip()]

    patterns = [
        r"^(\d{1,3})\s*%\s*[-:]?\s*(.+)$",
        r"^(.+?)\s*[-:]?\s*(\d{1,3})\s*%$",
    ]

    for line in lines:
        for pattern in patterns:
            match = re.search(pattern, line, re.I)
            if not match:
                continue

            if match.group(1).isdigit():
                weight = float(match.group(1))
                name = clean_name(match.group(2))
            else:
                name = clean_name(match.group(1))
                weight = float(match.group(2))

            if weight <= 0 or weight > 100:
                continue

            if is_bad_name(name):
                continue

            key = name.lower()
            if key not in seen:
                seen.add(key)
                categories.append({
                    "category_name": name,
                    "weight_percent": weight
                })

    return categories


def infer_assignment_type(name: str) -> str:
    lower = name.lower()

    if "quiz" in lower:
        return "Quiz"
    if "exam" in lower or "final" in lower or "midterm" in lower:
        return "Exam"
    if "presentation" in lower:
        return "Presentation"
    if "paper" in lower or "document" in lower:
        return "Paper"
    if "project" in lower or "application" in lower:
        return "Project"
    if "participation" in lower or "attendance" in lower:
        return "Participation"
    if "review" in lower:
        return "Review"
    if "discussion" in lower or "forum" in lower:
        return "Discussion"

    return "Assignment"


def extract_assignments_from_categories(categories: list[dict]) -> list[dict]:
    assignments = []

    for cat in categories:
        name = cat["category_name"]

        assignments.append({
            "title": name,
            "type": infer_assignment_type(name),
            "due_date": None,
            "points": None,
            "max_points": 100,
            "category_name": name
        })

    return assignments


def process_syllabus(file_bytes: bytes) -> dict:
    pdf_text = extract_text_from_pdf(file_bytes)

    if not pdf_text.strip():
        raise ValueError("Could not extract any text from the PDF. It may be scanned/image-based.")

    text = clean_text(pdf_text)

    categories = extract_categories(text)
    assignments = extract_assignments_from_categories(categories)

    return {
        "course_name": extract_course_name(text),
        "instructor": extract_instructor(text),
        "assignment_categories": categories,
        "assignments": assignments,
        "parser_type": "rule_based",
        "ai_used": False
    }
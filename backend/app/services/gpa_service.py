GRADE_POINTS = {
    "A": 4.0,
    "A-": 3.7,
    "B+": 3.3,
    "B": 3.0,
    "B-": 2.7,
    "C+": 2.3,
    "C": 2.0,
    "D": 1.0,
    "F": 0.0
}

def calculate_term_gpa(courses: list[dict]) -> float:
    total_points = 0
    total_credits = 0

    for course in courses:
        grade = courses["grade"]
        credits = course["credits"]

        total_points += GRADE_POINTS[grade] * credits
        total_credits += credits
    if total_credits == 0:
        return 0.0
    
    return round(total_points / total_credits, 2)

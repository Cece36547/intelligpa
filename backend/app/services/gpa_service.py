from app.models.student import Student

GRADE_POINTS = {
    "A": 4.0,
    "A-": 3.7,
    "B+": 3.3,
    "B": 3.0,
    "B-": 2.7,
    "C+": 2.3,
    "C": 2.0,
    "D": 1.0,
    "F": 0.0,
}


def percentage_to_letter(percentage: float) -> str:
    if percentage >= 93:
        return "A"
    elif percentage >= 90:
        return "A-"
    elif percentage >= 87:
        return "B+"
    elif percentage >= 83:
        return "B"
    elif percentage >= 80:
        return "B-"
    elif percentage >= 77:
        return "C+"
    elif percentage >= 73:
        return "C"
    elif percentage >= 60:
        return "D"
    return "F"


def calculate_term_gpa(courses: list[dict]) -> float:
    total_points = 0.0
    total_credits = 0

    for course in courses:
        grade = course["grade"]
        credits = course["credits"]
        total_points += GRADE_POINTS[grade] * credits
        total_credits += credits

    if total_credits == 0:
        return 0.0

    return round(total_points / total_credits, 2)


def compute_category_average(assignments: list) -> float | None:
    """
    Compute category average using total earned points / total possible points.
    Returns None if there are no graded assignments in the category.
    """
    graded = [
        a for a in assignments
        if a.score is not None and a.max_score is not None and a.max_score > 0
    ]

    if not graded:
        return None

    earned = sum(a.score for a in graded)
    possible = sum(a.max_score for a in graded)

    if possible == 0:
        return None

    return (earned / possible) * 100


def project_course_percentage(course) -> dict:
    """
    Project final course percentage using category weights and current performance.

    Assumption:
    - If a category has graded work, use that category's current weighted average.
    - If a category has no graded work yet, fall back to the student's overall known
      course average across other graded categories.
    - If nothing is graded in the whole course, default to 0.0.
    """
    category_results = []
    known_category_averages = []

    for category in course.categories:
        category_assignments = [
            a for a in course.assignments
            if a.category_id == category.category_id
        ]

        category_average = compute_category_average(category_assignments)

        if category_average is not None:
            known_category_averages.append(category_average)

        category_results.append({
            "category_id": category.category_id,
            "category_name": category.category_name,
            "weight": category.weight,
            "current_average": None if category_average is None else round(category_average, 2),
            "assignments_count": len(category_assignments),
            "graded_assignments_count": len([
                a for a in category_assignments
                if a.score is not None and a.max_score is not None and a.max_score > 0
            ]),
        })

    overall_known_average = (
        sum(known_category_averages) / len(known_category_averages)
        if known_category_averages
        else 0.0
    )

    projected_total = 0.0
    total_weight = 0.0

    for item in category_results:
        weight = item["weight"] or 0.0
        current_average = item["current_average"]

        used_average = current_average if current_average is not None else overall_known_average

        projected_total += used_average * (weight / 100.0)
        total_weight += weight

        item["projected_average_used"] = round(used_average, 2)

    if total_weight == 0:
        projected_percentage = 0.0
    else:
        projected_percentage = projected_total

    return {
        "projected_percentage": round(projected_percentage, 2),
        "overall_known_average": round(overall_known_average, 2),
        "categories": category_results,
    }


def project_student_gpa(student: Student) -> dict:
    """
    Project GPA for a student using real course/category/assignment data.
    """
    projected_courses = []
    total_quality_points = 0.0
    total_credits = 0

    for course in student.courses:
        credits = course.credits if course.credits is not None else 3

        course_projection = project_course_percentage(course)
        projected_percentage = course_projection["projected_percentage"]
        projected_letter = percentage_to_letter(projected_percentage)
        projected_points = GRADE_POINTS[projected_letter]

        total_quality_points += projected_points * credits
        total_credits += credits

        projected_courses.append({
            "course_id": course.course_id,
            "course_name": course.course_name,
            "instructor": course.instructor,
            "credits": credits,
            "projected_percentage": projected_percentage,
            "projected_letter": projected_letter,
            "projected_points": projected_points,
            "overall_known_average": course_projection["overall_known_average"],
            "categories": course_projection["categories"],
        })

    projected_gpa = round(total_quality_points / total_credits, 2) if total_credits > 0 else 0.0
    current_gpa = student.current_gpa if student.current_gpa is not None else 0.0
    goal_gpa = student.goal_gpa if student.goal_gpa is not None else 0.0

    return {
        "student_user_name": student.student_user_name,
        "current_gpa": round(current_gpa, 2),
        "goal_gpa": round(goal_gpa, 2),
        "projected_gpa": projected_gpa,
        "goal_met": projected_gpa >= goal_gpa,
        "difference_from_goal": round(projected_gpa - goal_gpa, 2),
        "total_credits_used": total_credits,
        "projected_courses": projected_courses,
    }


def project_gpa(current_gpa: float, goal_gpa: float) -> dict:
    """
    Legacy baseline projection. Keep for comparison/testing.
    """
    difference = round(goal_gpa - current_gpa, 2)

    if difference <= 0:
        status = "On track or exceeding goal"
        estimated_final_gpa = current_gpa
    elif difference <= 0.3:
        status = "Slight improvement needed"
        estimated_final_gpa = round(current_gpa + 0.2, 2)
    else:
        status = "Significant improvement needed"
        estimated_final_gpa = round(current_gpa + 0.1, 2)

    return {
        "current_gpa": current_gpa,
        "goal_gpa": goal_gpa,
        "estimated_final_gpa": estimated_final_gpa,
        "difference": difference,
        "goal_met": estimated_final_gpa >= goal_gpa,
        "status": status,
    }
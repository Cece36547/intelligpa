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
    "F": 0.0
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
    total_points = 0
    total_credits = 0

    for course in courses:
        grade = course["grade"]
        credits = course["credits"]

        total_points += GRADE_POINTS[grade] * credits
        total_credits += credits

    if total_credits == 0:
        return 0.0

    return round(total_points / total_credits, 2)


def project_course_percentage(course) -> float:
    """
    Projects final course percentage using current assignment performance
    and category weights.
    """
    category_averages = []

    # First pass: compute average for categories with graded assignments
    for category in course.categories:
        category_assignments = [
            a for a in course.assignments
            if a.category_id == category.category_id and a.score is not None and a.max_score
        ]

        if category_assignments:
            percentages = [(a.score / a.max_score) * 100 for a in category_assignments]
            avg = sum(percentages) / len(percentages)
            category_averages.append(avg)

    overall_known_average = sum(category_averages) / len(category_averages) if category_averages else 0.0

    projected_total = 0.0

    # Second pass: apply weights
    for category in course.categories:
        category_assignments = [
            a for a in course.assignments
            if a.category_id == category.category_id and a.score is not None and a.max_score
        ]

        if category_assignments:
            percentages = [(a.score / a.max_score) * 100 for a in category_assignments]
            category_average = sum(percentages) / len(percentages)
        else:
            category_average = overall_known_average

        projected_total += category_average * category.weight

    return round(projected_total, 2)


def project_student_gpa(student: Student) -> dict:
    """
    Projects GPA for a student based on current course assignment trends.
    """
    projected_courses = []
    total_points = 0.0
    total_credits = 0

    for course in student.courses:
        projected_percentage = project_course_percentage(course)
        projected_letter = percentage_to_letter(projected_percentage)
        projected_points = GRADE_POINTS[projected_letter]
        credits = 3

        total_points += projected_points * credits
        total_credits += credits

        projected_courses.append({
            "course_id": course.course_id,
            "course_name": course.course_name,
            "projected_percentage": projected_percentage,
            "projected_letter": projected_letter,
            "credits": credits
        })

    projected_gpa = round(total_points / total_credits, 2) if total_credits > 0 else 0.0
    goal_gpa = student.goal_gpa if student.goal_gpa is not None else 0.0

    return {
        "student_user_name": student.student_user_name,
        "current_gpa": student.current_gpa,
        "goal_gpa": goal_gpa,
        "projected_gpa": projected_gpa,
        "goal_met": projected_gpa >= goal_gpa,
        "difference_from_goal": round(projected_gpa - goal_gpa, 2),
        "projected_courses": projected_courses
    }

def project_gpa(current_gpa: float, goal_gpa: float) -> dict:
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
        "status": status
    }
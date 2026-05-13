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

        graded_count = len([
            a for a in category_assignments
            if a.score is not None and a.max_score is not None and a.max_score > 0
        ])

        category_results.append({
            "category_id": category.category_id,
            "category_name": category.category_name,
            "weight": category.weight,
            "current_average": None if category_average is None else round(category_average, 2),
            "assignments_count": len(category_assignments),
            "graded_assignments_count": graded_count,
            "projected_average_used": 0,
            "assignments": [
                {
                    "assignment_id": a.assignment_id,
                    "title": a.title,
                    "score": a.score,
                    "max_score": a.max_score,
                    "due_date": a.due_date.isoformat() if a.due_date else None,
                }
                for a in category_assignments
            ],
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

    projected_percentage = projected_total if total_weight > 0 else 0.0

    return {
        "projected_percentage": round(projected_percentage, 2),
        "overall_known_average": round(overall_known_average, 2),
        "categories": category_results,
    }

def calculate_risk_level(projected_gpa: float, goal_gpa: float, graded_assignments: int, total_assignments: int) -> dict:

    if total_assignments == 0:
        completion_rate = 0.0
    else:
        completion_rate = graded_assignments / total_assignments

    # If goal is missing or invalid, do not pretend risk is low
    if goal_gpa is None or goal_gpa <= 0:
        return {
            "risk_level": "Unknown",
            "confidence": "Low",
            "difference_from_goal": None,
            "completion_rate": round(completion_rate * 100, 2),
            "message": "Goal GPA is missing, so risk cannot be evaluated accurately."
        }

    difference = round(projected_gpa - goal_gpa, 2)

    if projected_gpa >= goal_gpa and completion_rate >= 0.5:
        risk_level = "Low Risk"
        confidence = "High"
        message = "Student is currently projected to meet the goal with enough graded data."
    elif projected_gpa >= goal_gpa and completion_rate < 0.5:
        risk_level = "Moderate Risk"
        confidence = "Medium"
        message = "Student is projected to meet the goal, but there is limited graded data."
    elif projected_gpa < goal_gpa and abs(difference) <= 0.3:
        risk_level = "Moderate Risk"
        confidence = "Medium"
        message = "Student is slightly below the goal but still within recovery range."
    else:
        risk_level = "High Risk"
        confidence = "Low"
        message = "Student is projected below the goal and needs improvement."

    return {
        "risk_level": risk_level,
        "confidence": confidence,
        "difference_from_goal": difference,
        "completion_rate": round(completion_rate * 100, 2),
        "message": message
    }

def project_student_gpa(student: Student) -> dict:
    projected_courses = []
    total_quality_points = 0.0
    total_credits = 0
    total_assignments = 0
    graded_assignments = 0

    for course in student.courses:
        credits = course.credits if course.credits is not None else 3

        course_projection = project_course_percentage(course)

        for category in course_projection["categories"]:
            total_assignments += category["assignments_count"]
            graded_assignments += category["graded_assignments_count"]
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

    risk_analysis = calculate_risk_level(
        projected_gpa=projected_gpa,
        goal_gpa=goal_gpa,
        graded_assignments=graded_assignments,
        total_assignments=total_assignments
    )

    return {
        "student_user_name": student.student_user_name,
        "current_gpa": round(current_gpa, 2),
        "goal_gpa": round(goal_gpa, 2),
        "projected_gpa": projected_gpa,
        "goal_met": projected_gpa >= goal_gpa,
        "difference_from_goal": round(projected_gpa - goal_gpa, 2),
        "total_credits_used": total_credits,
        "risk_analysis": risk_analysis,
        "projected_courses": projected_courses,
    }

def needed_average_for_target(course, target_percentage: float = 90.0) -> dict:
    """
    Calculates what average the student needs on all ungraded categories
    to reach a target final course percentage.
    Default target is 90% = A-.
    """
    known_weighted_total = 0.0
    remaining_weight = 0.0
    category_breakdown = []

    for category in course.categories:
        category_assignments = [
            a for a in course.assignments
            if a.category_id == category.category_id
        ]

        category_average = compute_category_average(category_assignments)
        weight = category.weight or 0.0

        if category_average is None:
            remaining_weight += weight
            status = "ungraded"
        else:
            known_weighted_total += category_average * (weight / 100.0)
            status = "graded"

        category_breakdown.append({
            "category_id": category.category_id,
            "category_name": category.category_name,
            "weight": weight,
            "current_average": None if category_average is None else round(category_average, 2),
            "status": status,
        })

    if remaining_weight == 0:
        needed_average = 0.0 if known_weighted_total >= target_percentage else None
    else:
        needed_average = (target_percentage - known_weighted_total) / (remaining_weight / 100.0)

    return {
        "course_id": course.course_id,
        "course_name": course.course_name,
        "target_percentage": target_percentage,
        "target_letter": percentage_to_letter(target_percentage),
        "known_weighted_total": round(known_weighted_total, 2),
        "remaining_weight": round(remaining_weight, 2),
        "needed_average_on_remaining": None if needed_average is None else round(needed_average, 2),
        "possible": needed_average is not None and needed_average <= 100,
        "already_met": known_weighted_total >= target_percentage and remaining_weight == 0,
        "categories": category_breakdown,
    }

def simulate_course_what_if(course, hypothetical_scores: list[dict]) -> dict:
    """
    Simulates course grade using real graded scores plus hypothetical scores.

    hypothetical_scores format:
    [
        {"assignment_id": 1, "score": 95, "max_score": 100}
    ]
    """

    hypothetical_map = {
        item["assignment_id"]: item
        for item in hypothetical_scores
    }
    current_projection = project_course_percentage(course)
    current_percentage = current_projection["projected_percentage"]
    
    category_results = []
    projected_total = 0.0
    total_weight = 0.0

    for category in course.categories:
        category_assignments = [
            a for a in course.assignments
            if a.category_id == category.category_id
        ]

        earned = 0.0
        possible = 0.0

        for assignment in category_assignments:
            if assignment.assignment_id in hypothetical_map:
                hypo = hypothetical_map[assignment.assignment_id]
                score = hypo.get("score")
                max_score = hypo.get("max_score", assignment.max_score or 100)
            else:
                score = assignment.score
                max_score = assignment.max_score

            if score is not None and max_score is not None and max_score > 0:
                earned += score
                possible += max_score

        category_average = None
        if possible > 0:
            category_average = (earned / possible) * 100
            projected_total += category_average * ((category.weight or 0) / 100)
            total_weight += category.weight or 0

        category_results.append({
            "category_id": category.category_id,
            "category_name": category.category_name,
            "weight": category.weight,
            "simulated_average": None if category_average is None else round(category_average, 2),
        })

    simulated_percentage = projected_total if total_weight > 0 else 0.0
    simulated_letter = percentage_to_letter(simulated_percentage)

    return {
    "course_id": course.course_id,
    "course_name": course.course_name,
    "current_percentage": current_percentage,
    "simulated_percentage": round(simulated_percentage, 2),
    "delta_percentage": round(simulated_percentage - current_percentage, 2),
    "simulated_letter": simulated_letter,
    "simulated_points": GRADE_POINTS[simulated_letter],
    "categories": category_results,
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
        "status": status,
    }
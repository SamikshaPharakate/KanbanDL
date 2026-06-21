import sys
from models.time_predictor import time_predictor
from models.productivity_predictor import productivity_predictor
from models.nlp_engine import analyze_task_text, generate_subtasks, get_mood_recommendations

def test_time_predictor():
    print("Testing Time Predictor...")
    # priority (1-3), num_subtasks, text_length, avg_user_completion_time (hours), energy_required (1-5)
    pred = time_predictor.predict(
        priority=3,  # high
        num_subtasks=5,
        text_length=150,
        avg_user_completion_time=15.0,
        energy_required=4
    )
    print(f"Prediction: {pred} hours")
    assert isinstance(pred, float)
    assert pred > 0.0
    print("Time Predictor - PASS")

def test_productivity_predictor():
    print("\nTesting Productivity & Burnout Predictor...")
    # streak_length, focus_hours, tasks_completed, energy_level
    pred_tired = productivity_predictor.predict(
        streak_length=15,
        focus_hours=11.5,  # overworked
        tasks_completed=2,
        energy_level=1     # exhausted
    )
    print(f"Tired User Prediction: {pred_tired}")
    assert pred_tired["burnout_risk"] in ["Moderate", "High"]
    
    pred_fresh = productivity_predictor.predict(
        streak_length=2,
        focus_hours=4.0,
        tasks_completed=5,
        energy_level=4
    )
    print(f"Fresh User Prediction: {pred_fresh}")
    print("Productivity Predictor - PASS")

def test_nlp_engine():
    print("\nTesting NLP Engine & Subtask Generator...")
    title = "Setup Express Server with Auth"
    desc = "We need to setup the express server, define a database MongoDB collection for users, write unit tests for register api, and deploy to heroku."
    
    analysis = analyze_task_text(title, desc)
    print(f"Analysis: {analysis}")
    assert analysis["difficulty"] in ["medium", "hard"]
    
    subtasks = generate_subtasks(title, desc)
    print(f"Generated Subtasks: {subtasks}")
    assert len(subtasks) > 0
    
    # Test recommendations
    tasks = [
        {"_id": "t1", "title": "Database Schema", "priority": "high", "difficulty": "hard", "energy_required": 4},
        {"_id": "t2", "title": "Fix alignment", "priority": "low", "difficulty": "easy", "energy_required": 1}
    ]
    recs = get_mood_recommendations(mood_score=2, energy_level=1, pending_tasks=tasks)
    print(f"Low Energy Recommendations: {recs}")
    assert recs[0]["_id"] == "t2"  # Low energy should recommend the easy task
    
    print("NLP Engine - PASS")

if __name__ == "__main__":
    print("=== STARTING AI BACKEND TESTS ===")
    try:
        test_time_predictor()
        test_productivity_predictor()
        test_nlp_engine()
        print("\n=== ALL AI BACKEND TESTS PASSED ===")
        sys.exit(0)
    except Exception as e:
        print(f"\n=== TEST FAILURE: {e} ===")
        import traceback
        traceback.print_exc()
        sys.exit(1)

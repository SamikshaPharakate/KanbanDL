import uvicorn
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional

load_dotenv()

# Import models
from models.time_predictor import time_predictor
from models.productivity_predictor import productivity_predictor
from models.nlp_engine import analyze_task_text, generate_subtasks, get_mood_recommendations

app = FastAPI(
    title="TaskFlow AI Backend",
    description="Deep Learning and NLP APIs for TaskFlow Productivity Board",
    version="1.0.0"
)

# Enable CORS for communication from backend Node server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------
# Pydantic Schemas
# -----------------

class TimePredictionRequest(BaseModel):
    title: str
    description: str
    priority: str  # 'low' | 'medium' | 'high'
    num_subtasks: int = 0
    avg_user_completion_time: Optional[float] = 12.0

class ProductivityPredictionRequest(BaseModel):
    streak_length: int = 0
    focus_hours: float = 0.0
    tasks_completed: int = 0
    energy_level: int = Field(3, ge=1, le=5)  # 1 to 5

class NLPAnalysisRequest(BaseModel):
    title: str
    description: str

class TaskItem(BaseModel):
    id: str = Field(..., alias="_id")
    title: str
    priority: str
    difficulty: str
    energy_required: int

    class Config:
        populate_by_name = True

class RecommendationRequest(BaseModel):
    energy_level: int = Field(3, ge=1, le=5)
    mood_score: int = Field(3, ge=1, le=5)
    tasks: List[TaskItem]

class RetrainTimeItem(BaseModel):
    priority: int
    num_subtasks: int
    text_length: int
    avg_user_completion_time: float
    energy_required: int
    actual_time: float

class RetrainTimeRequest(BaseModel):
    data: List[RetrainTimeItem]

class RetrainProductivityItem(BaseModel):
    streak_length: int
    focus_hours: float
    tasks_completed: int
    energy_level: int
    productivity_class: int
    burnout_class: int

class RetrainProductivityRequest(BaseModel):
    data: List[RetrainProductivityItem]

# -----------------
# API Endpoints
# -----------------

@app.get("/")
def read_root():
    return {"status": "online", "message": "TaskFlow Deep Learning API is running."}

@app.post("/predict-time")
def predict_time(req: TimePredictionRequest):
    try:
        # First use NLP engine to estimate difficulty and energy parameters from text
        nlp_analysis = analyze_task_text(req.title, req.description)
        
        # Priority mapping
        prio_map = {"low": 1, "medium": 2, "high": 3}
        priority_numeric = prio_map.get(req.priority.lower(), 2)
        
        # Get length of text
        text_length = len(req.title) + len(req.description)
        
        # Call regression MLP neural network
        predicted_time = time_predictor.predict(
            priority=priority_numeric,
            num_subtasks=req.num_subtasks,
            text_length=text_length,
            avg_user_completion_time=req.avg_user_completion_time,
            energy_required=nlp_analysis["energy_required"]
        )
        
        # Determine risk level based on predicted completion time
        if predicted_time > 24.0:
            risk_level = "high"
        elif predicted_time > 8.0:
            risk_level = "medium"
        else:
            risk_level = "low"
            
        return {
            "predicted_time": predicted_time,
            "difficulty": nlp_analysis["difficulty"],
            "energy_required": nlp_analysis["energy_required"],
            "risk_level": risk_level
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-productivity")
def predict_productivity(req: ProductivityPredictionRequest):
    try:
        predictions = productivity_predictor.predict(
            streak_length=req.streak_length,
            focus_hours=req.focus_hours,
            tasks_completed=req.tasks_completed,
            energy_level=req.energy_level
        )
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-nlp")
def analyze_nlp(req: NLPAnalysisRequest):
    try:
        # Extract features
        nlp_analysis = analyze_task_text(req.title, req.description)
        # Generate subtasks (with Gemini API if key exists, otherwise local rule-based engine)
        subtasks = generate_subtasks(req.title, req.description)
        
        return {
            "priority": nlp_analysis["priority"],
            "difficulty": nlp_analysis["difficulty"],
            "energy_required": nlp_analysis["energy_required"],
            "subtasks": subtasks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-tasks")
def recommend_tasks(req: RecommendationRequest):
    try:
        # Re-format Pydantic tasks list to basic python dicts
        tasks_dicts = [task.model_dump(by_alias=True) for task in req.tasks]
        recommendations = get_mood_recommendations(
            mood_score=req.mood_score,
            energy_level=req.energy_level,
            pending_tasks=tasks_dicts
        )
        return {"recommended_tasks": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retrain-time")
def retrain_time(req: RetrainTimeRequest):
    data_list = [item.model_dump() for item in req.data]
    success = time_predictor.retrain(data_list)
    if not success:
        raise HTTPException(status_code=400, detail="Retraining failed. Check dataset size and values.")
    return {"success": True, "message": "Task completion time model retrained successfully."}

@app.post("/retrain-productivity")
def retrain_productivity(req: RetrainProductivityRequest):
    data_list = [item.model_dump() for item in req.data]
    success = productivity_predictor.retrain(data_list)
    if not success:
        raise HTTPException(status_code=400, detail="Retraining failed. Check dataset size and values.")
    return {"success": True, "message": "Productivity and burnout model retrained successfully."}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

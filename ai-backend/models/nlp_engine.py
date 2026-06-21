import os
import re
import urllib.request
import json
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_KEY")

# Active verb action maps for heuristic subtask generation
ACTION_KEYWORDS = {
    r"\b(design|ui|ux|frontend|css|style|mockup|wireframe)\b": [
        "Create design wireframes & mockups",
        "Implement responsive layout styling",
        "Verify styling across multiple devices"
    ],
    r"\b(database|db|mongodb|mongoose|schema|collection)\b": [
        "Define schema and collection structures",
        "Configure database connection & indexes",
        "Write query helpers and data validators"
    ],
    r"\b(auth|login|signup|register|jwt|bcrypt|password)\b": [
        "Setup authentication routes & encryption",
        "Implement JWT token validation middleware",
        "Validate input fields & handle error states"
    ],
    r"\b(api|route|endpoint|controller|backend|express)\b": [
        "Structure API route paths",
        "Write controllers & request handlers",
        "Test API endpoints using REST requests"
    ],
    r"\b(test|jest|mocha|pytest|unit test|validate)\b": [
        "Write assertions & test suites",
        "Run automated test scripts",
        "Verify boundary cases & mock database calls"
    ],
    r"\b(deploy|production|host|docker|cloud|aws|heroku)\b": [
        "Configure environment variables & configs",
        "Setup deployment script & build steps",
        "Deploy to host environment & verify uptime"
    ],
    r"\b(socket|realtime|real-time|chat|notification|io)\b": [
        "Initialize Socket.io connection handshake",
        "Implement room joining & custom event emitters",
        "Handle user disconnects & state syncing"
    ],
    r"\b(ml|deep learning|ai|model|train|predict|nlp)\b": [
        "Prepare training datasets & features",
        "Train baseline model and tune hyperparameters",
        "Create endpoint to serve predictions"
    ]
}

def clean_text(text: str) -> str:
    """Helper to clean whitespace and basic formatting."""
    return re.sub(r'\s+', ' ', text).strip()

def analyze_task_text(title: str, description: str) -> dict:
    """Analyze title and description for priority (urgency) and difficulty (complexity)."""
    combined_text = f"{title} {description}".lower()
    
    # Priority Heuristics
    urgency_score = 0
    urgent_keywords = ["urgent", "asap", "immediate", "critical", "blocker", "due today", "fix", "bug", "crash"]
    for word in urgent_keywords:
        if word in combined_text:
            urgency_score += 2
            
    # Priority designation based on heuristics
    if urgency_score >= 4:
        priority = "high"
    elif urgency_score >= 2:
        priority = "medium"
    else:
        priority = "low"
        
    # Complexity Heuristics
    complexity_score = 0
    complex_keywords = ["implement", "setup", "configure", "train", "deploy", "build", "refactor", "database", "integrate"]
    for word in complex_keywords:
        if word in combined_text:
            complexity_score += 1
            
    # Include word count and length factors
    text_len = len(combined_text)
    if text_len > 300:
        complexity_score += 2
    elif text_len > 100:
        complexity_score += 1
        
    if complexity_score >= 4:
        difficulty = "hard"
        energy = 5
    elif complexity_score >= 2:
        difficulty = "medium"
        energy = 3
    else:
        difficulty = "easy"
        energy = 1
        
    return {
        "priority": priority,
        "difficulty": difficulty,
        "energy_required": energy
    }

def generate_subtasks_local(title: str, description: str) -> list:
    """Heuristically generate subtasks by searching for active topics in text."""
    combined_text = f"{title} {description}".lower()
    subtasks = []
    
    # Match keywords in the description to find specific lists
    for pattern, steps in ACTION_KEYWORDS.items():
        if re.search(pattern, combined_text):
            subtasks.extend(steps)
            
    # Extract imperative sentences from description
    sentences = re.split(r'[.!?;\n]+', description)
    action_verbs = [
        "create", "add", "make", "write", "build", "setup", "configure", "implement", 
        "test", "deploy", "fix", "update", "integrate", "design", "refactor", "run"
    ]
    
    for sentence in sentences:
        sentence_clean = clean_text(sentence)
        if not sentence_clean:
            continue
            
        words = sentence_clean.split()
        if len(words) > 2 and words[0].lower() in action_verbs:
            # Reformat first word to title case and clean punctuation
            formatted = sentence_clean[0].upper() + sentence_clean[1:]
            formatted = re.sub(r'[,.]$', '', formatted)
            if formatted not in subtasks:
                subtasks.append(formatted)
                
    # If nothing generated, add generic steps
    if not subtasks:
        subtasks = [
            "Review task requirements",
            "Write core implementation details",
            "Verify code functionality and review"
        ]
        
    # Return unique subtasks capped at 6 items
    seen = set()
    unique_subtasks = []
    for item in subtasks:
        if item.lower() not in seen:
            seen.add(item.lower())
            unique_subtasks.append(item)
            
    return unique_subtasks[:6]

def generate_subtasks_gemini(title: str, description: str) -> list:
    """Generate subtasks using Gemini API via HTTP request."""
    if not GEMINI_API_KEY:
        return []
        
    prompt = f"""
    You are an AI assistant helping a developer break down a Kanban task.
    Task Title: {title}
    Task Description: {description}
    
    Provide a list of 3 to 6 logical, actionable developer subtasks.
    Return ONLY a JSON list of strings, nothing else. Example:
    ["Create database schema", "Write route handlers", "Implement API tests"]
    Do not wrap it in markdown code blocks. Just output raw JSON list.
    """
    
    # Standard Gemini v1beta model API endpoint
    url = f"https://generativetext.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
    
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2
        }
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            
            # Extract content from response structure
            content = res_body['candidates'][0]['content']['parts'][0]['text']
            
            # Clean possible markdown wrapping
            content_clean = content.replace("```json", "").replace("```", "").strip()
            subtasks = json.loads(content_clean)
            if isinstance(subtasks, list) and all(isinstance(s, str) for s in subtasks):
                return subtasks
    except Exception as e:
        print(f"Gemini subtask generation failed: {e}. Falling back to local model.")
        
    return []

def generate_subtasks(title: str, description: str) -> list:
    """Generate task subtasks (prefers Gemini if API key is present)."""
    if GEMINI_API_KEY:
        gemini_tasks = generate_subtasks_gemini(title, description)
        if gemini_tasks:
            return gemini_tasks
            
    return generate_subtasks_local(title, description)

def get_mood_recommendations(mood_score: int, energy_level: int, pending_tasks: list) -> list:
    """Generate task recommendations based on user mood/energy score.
    
    - Low Energy (1-2): Recommend easy, low-energy tasks.
    - Normal Energy (3): Recommend standard tasks.
    - High Energy (4-5): Recommend hard, high-priority tasks.
    """
    recommended = []
    for task in pending_tasks:
        # Expected structure: {id, title, priority, difficulty, energy}
        task_energy = task.get("energy_required", 3)
        task_prio = task.get("priority", "medium")
        
        # Match task energy/difficulty to user energy
        if energy_level <= 2:
            # User is tired: prefer easy, low-energy, or high-priority but easy tasks
            if task_energy <= 2:
                recommended.append(task)
        elif energy_level == 3:
            # User is in normal focus state: recommend medium tasks
            if task_energy <= 3:
                recommended.append(task)
        else:
            # User is highly energetic: recommend hard, high priority tasks first
            if task_energy >= 3 or task_prio == "high":
                recommended.append(task)
                
    # Sort recommendations: high priority first
    recommended.sort(key=lambda t: 3 if t.get("priority") == "high" else (2 if t.get("priority") == "medium" else 1), reverse=True)
    return recommended

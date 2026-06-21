# KanbanDL 🚀🧠

**An Intelligent, AI-Powered Kanban Board with Gamification & Deep Learning**

KanbanDL is a modern, full-stack productivity application designed to completely revolutionize how you manage tasks. Instead of just a static board, KanbanDL actively analyzes your tasks using Natural Language Processing (NLP) to predict completion times, auto-generate subtasks, and assess burnout risks.

![KanbanDL Preview](frontend/src/assets/hero.png) *(Add a screenshot here!)*

## ✨ Key Features
- **🧠 AI Task Intelligence:** Deep Learning models predict task difficulty, estimate completion time, and auto-generate subtasks based purely on the task description.
- **🎮 Gamification System:** Turn work into a game! Earn XP, level up, maintain daily streaks, and unlock badges for being productive.
- **⚡ Real-time Collaboration:** WebSockets allow you and your team to move tasks across columns instantly without refreshing.
- **📊 Productivity Analytics:** Get insights into your focus hours, burnout risk, and task completion velocity over time.
- **🌓 Modern UI:** A beautiful, responsive, glass-morphic design with built-in Dark/Light mode support.

## 🛠️ Tech Stack
This project uses a robust 3-tier architecture:

1. **Frontend (React + Vite):** A blazing fast UI styled with TailwindCSS, Lucide Icons, and `@hello-pangea/dnd` for smooth drag-and-drop interactions.
2. **Main Backend (Node.js + Express):** Handles user authentication (JWT), MongoDB connections, and Socket.io real-time events.
3. **AI Backend (Python + FastAPI):** Hosts custom neural network models (Multi-Layer Perceptrons) and NLP logic to generate predictions.

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [Python 3.x](https://www.python.org/) installed. You will also need a local or cloud [MongoDB](https://www.mongodb.com/) instance.

### 1. Start the AI Backend
```bash
cd ai-backend
python -m venv venv
# Activate venv: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
pip install -r requirements.txt
python main.py
```
*(Runs on http://localhost:8000)*

### 2. Start the Node Backend
```bash
cd backend
npm install
# Ensure you have a .env file with your MONGO_URI and JWT_SECRET
node server.js
```
*(Runs on http://localhost:5000)*

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*(Runs on http://localhost:5173)*

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is open-source and available under the MIT License.

const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const Board = require('./models/Board');
const Column = require('./models/Column');
const Task = require('./models/Task');
const Analytics = require('./models/Analytics');

const BACKEND_URL = 'http://127.0.0.1:5000';
const MONGO_URI = 'mongodb://127.0.0.1:27017/taskflow';

// Mock server start wrapper
let serverInstance;

const startServer = async () => {
  // Clear environment for test database
  process.env.PORT = '5000';
  process.env.MONGO_URI = MONGO_URI;
  
  // Wipe test db collections
  await mongoose.connect(MONGO_URI);
  await User.deleteMany({ username: 'testuser_backend' });
  await Board.deleteMany({ name: 'Integration Test Board' });
  
  const expressServer = require('./server');
  // Wait 2 seconds for Express to boot and bind
  await new Promise(resolve => setTimeout(resolve, 2000));
};

const runTests = async () => {
  console.log('=== STARTING BACKEND INTEGRATION TESTS ===');
  let token = '';
  let boardId = '';
  let columnId = '';
  let taskId = '';

  // 1. User Registration
  console.log('\nTesting POST /api/auth/register...');
  try {
    const regRes = await axios.post(`${BACKEND_URL}/api/auth/register`, {
      username: 'testuser_backend',
      email: 'testuser_backend@example.com',
      password: 'testpassword123'
    });
    console.log('Register Response:', regRes.data);
    token = regRes.data.token;
    if (!token) throw new Error('Token not returned in registration');
    console.log('Registration - PASS');
  } catch (err) {
    console.error('Registration failed:', err.response ? err.response.data : err.message);
    throw err;
  }

  // Set Auth headers
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 2. User Login
  console.log('\nTesting POST /api/auth/login...');
  try {
    const logRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'testuser_backend',
      password: 'testpassword123'
    });
    console.log('Login Response:', logRes.data);
    console.log('Login - PASS');
  } catch (err) {
    console.error('Login failed:', err.response ? err.response.data : err.message);
    throw err;
  }

  // 3. Create Board (should seed default columns)
  console.log('\nTesting POST /api/boards...');
  try {
    const boardRes = await axios.post(`${BACKEND_URL}/api/boards`, {
      name: 'Integration Test Board',
      description: 'Verifying automated setup'
    }, authHeaders);
    console.log('Board Created:', boardRes.data);
    boardId = boardRes.data._id;
    
    // Get board columns
    const detailsRes = await axios.get(`${BACKEND_URL}/api/boards/${boardId}`, authHeaders);
    console.log('Board Details columns count:', detailsRes.data.columns.length);
    if (detailsRes.data.columns.length !== 3) {
      throw new Error('Default columns failed to seed. Count is not 3.');
    }
    columnId = detailsRes.data.columns[0]._id;
    console.log('Board Setup & Columns Seeding - PASS');
  } catch (err) {
    console.error('Board creation failed:', err.response ? err.response.data : err.message);
    throw err;
  }

  // 4. Create Task
  console.log('\nTesting POST /api/tasks...');
  try {
    const taskRes = await axios.post(`${BACKEND_URL}/api/tasks`, {
      boardId,
      columnId,
      title: 'Implement Express API Route Test',
      description: 'Write mongoose code and call server, configure socket controllers, test local integrations.',
      priority: 'high',
      deadline: new Date(Date.now() + 86400000)
    }, authHeaders);
    console.log('Task Created:', taskRes.data);
    taskId = taskRes.data._id;
    console.log('Task Predictions:', {
      difficulty: taskRes.data.aiDifficulty,
      predictedTime: taskRes.data.aiPredictedTime,
      risk: taskRes.data.aiRiskLevel,
      subtasksCount: taskRes.data.subtasks.length
    });
    console.log('Task Creation - PASS');
  } catch (err) {
    console.error('Task creation failed:', err.response ? err.response.data : err.message);
    throw err;
  }

  // 5. Track Focus Time on Task
  console.log('\nTesting PUT /api/tasks/:id/focus...');
  try {
    const focusRes = await axios.put(`${BACKEND_URL}/api/tasks/${taskId}/focus`, {
      seconds: 1200 // 20 minutes focus
    }, authHeaders);
    console.log('Focus Time updated task timeSpent:', focusRes.data.task.timeSpent);
    console.log('Daily analytics focus duration:', focusRes.data.analytics.focusDuration);
    console.log('Focus Tracking - PASS');
  } catch (err) {
    console.error('Focus tracking failed:', err.response ? err.response.data : err.message);
    throw err;
  }

  // 6. Complete Task (Moves to Done column & awards XP)
  console.log('\nTesting PUT /api/tasks/:id (Complete Task)...');
  try {
    const completeRes = await axios.put(`${BACKEND_URL}/api/tasks/${taskId}`, {
      status: 'done'
    }, authHeaders);
    console.log('Completion Task status:', completeRes.data.task.status);
    console.log('Gamification Result:', completeRes.data.gamification);
    if (completeRes.data.gamification.xp <= 0) {
      throw new Error('No XP awarded for task completion');
    }
    console.log('Task Completion & XP Award - PASS');
  } catch (err) {
    console.error('Task completion failed:', err.response ? err.response.data : err.message);
    throw err;
  }

  // 7. Get Recommendations
  console.log('\nTesting GET /api/analytics/recommendations...');
  try {
    const recsRes = await axios.get(`${BACKEND_URL}/api/analytics/recommendations`, authHeaders);
    console.log('Recommended Tasks length:', recsRes.data.recommended_tasks.length);
    console.log('Recommendations - PASS');
  } catch (err) {
    console.error('Recommendations failed:', err.response ? err.response.data : err.message);
    throw err;
  }

  console.log('\n=== ALL BACKEND INTEGRATION TESTS PASSED ===');
  process.exit(0);
};

(async () => {
  try {
    await startServer();
    await runTests();
  } catch (err) {
    console.error('\n=== TEST RUN FAILED ===');
    process.exit(1);
  }
})();

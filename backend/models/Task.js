const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  columnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column',
    required: true
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  deadline: {
    type: Date
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  subtasks: [{
    text: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }],
  aiDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  aiPredictedTime: {
    type: Number,
    default: 0
  },
  aiRiskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  energyRequired: {
    type: Number,
    default: 3
  },
  tags: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo'
  },
  timeSpent: {
    type: Number,
    default: 0 // Tracked in seconds
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', TaskSchema);

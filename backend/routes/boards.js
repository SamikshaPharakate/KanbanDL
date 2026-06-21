const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Board = require('../models/Board');
const Column = require('../models/Column');
const Task = require('../models/Task');

// @route    GET api/boards
// @desc     Get all user's boards
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    }).populate('owner', 'username email');
    res.json(boards);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/boards
// @desc     Create a board & auto-populate default columns
// @access   Private
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;

  try {
    const newBoard = new Board({
      name,
      description,
      owner: req.user.id
    });

    const board = await newBoard.save();

    // Create default columns: To Do, In Progress, Done
    const defaultColumns = ['To Do', 'In Progress', 'Done'];
    const columnPromises = defaultColumns.map((colName, index) => {
      const col = new Column({
        boardId: board._id,
        name: colName,
        position: index
      });
      return col.save();
    });

    await Promise.all(columnPromises);

    res.json(board);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    GET api/boards/:id
// @desc     Get single board details with populated columns and tasks
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ msg: 'Board not found' });
    }

    // Verify access
    if (board.owner.toString() !== req.user.id && !board.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find all columns for this board, sorted by position
    const columns = await Column.find({ boardId: board._id }).sort({ position: 1 });
    
    // Find all tasks for this board
    const tasks = await Task.find({ boardId: board._id });

    res.json({
      board,
      columns,
      tasks
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Board not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route    DELETE api/boards/:id
// @desc     Delete board and cascade-delete columns and tasks
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ msg: 'Board not found' });
    }

    // Only owner can delete board
    if (board.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to delete board' });
    }

    await Column.deleteMany({ boardId: board._id });
    await Task.deleteMany({ boardId: board._id });
    await board.deleteOne();

    res.json({ msg: 'Board and related columns/tasks deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// -----------------
// Columns Sub-routes
// -----------------

// @route    POST api/boards/:boardId/columns
// @desc     Add a column to a board
// @access   Private
router.post('/:boardId/columns', auth, async (req, res) => {
  const { name } = req.body;

  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ msg: 'Board not found' });
    }

    // Verify access
    if (board.owner.toString() !== req.user.id && !board.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find count to set next position
    const colCount = await Column.countDocuments({ boardId: board._id });

    const newColumn = new Column({
      boardId: board._id,
      name,
      position: colCount
    });

    const column = await newColumn.save();
    res.json(column);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    PUT api/boards/columns/:columnId
// @desc     Update a column (name, position)
// @access   Private
router.put('/columns/:columnId', auth, async (req, res) => {
  const { name, position } = req.body;

  try {
    let column = await Column.findById(req.params.columnId);
    if (!column) {
      return res.status(404).json({ msg: 'Column not found' });
    }

    // Verify authorization on the board
    const board = await Board.findById(column.boardId);
    if (board.owner.toString() !== req.user.id && !board.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (name !== undefined) column.name = name;
    if (position !== undefined) column.position = position;

    await column.save();
    res.json(column);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    DELETE api/boards/columns/:columnId
// @desc     Delete a column and cascade-delete tasks in it
// @access   Private
router.delete('/columns/:columnId', auth, async (req, res) => {
  try {
    const column = await Column.findById(req.params.columnId);
    if (!column) {
      return res.status(404).json({ msg: 'Column not found' });
    }

    const board = await Board.findById(column.boardId);
    if (board.owner.toString() !== req.user.id && !board.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Task.deleteMany({ columnId: column._id });
    await column.deleteOne();

    res.json({ msg: 'Column and related tasks deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

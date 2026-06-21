module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.id}`);

    // Join a specific Kanban board room
    socket.on('join-board', (boardId) => {
      socket.join(`board_${boardId}`);
      console.log(`Socket ${socket.id} joined room board_${boardId}`);
    });

    // Leave a specific board room
    socket.on('leave-board', (boardId) => {
      socket.leave(`board_${boardId}`);
      console.log(`Socket ${socket.id} left room board_${boardId}`);
    });

    // Broadcast card drag-and-drop actions
    socket.on('task-moved', (data) => {
      // data: { boardId, taskId, sourceColumnId, destColumnId, sourceIndex, destIndex, status }
      socket.to(`board_${data.boardId}`).emit('task-moved-update', data);
    });

    // Broadcast task creation
    socket.on('task-created', (data) => {
      // data: { boardId, task }
      socket.to(`board_${data.boardId}`).emit('task-created-update', data.task);
    });

    // Broadcast task detail updates
    socket.on('task-updated', (data) => {
      // data: { boardId, task }
      socket.to(`board_${data.boardId}`).emit('task-updated-update', data.task);
    });

    // Broadcast task deletion
    socket.on('task-deleted', (data) => {
      // data: { boardId, taskId }
      socket.to(`board_${data.boardId}`).emit('task-deleted-update', data.taskId);
    });

    // Broadcast column updates (positions, additions, etc.)
    socket.on('column-updated', (data) => {
      // data: { boardId }
      socket.to(`board_${data.boardId}`).emit('column-updated-update');
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from socket: ${socket.id}`);
    });
  });
};

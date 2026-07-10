import React, { createContext, useEffect, useState, useContext } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    let newSocket;
    if (token) {
      // Connect to Socket.io backend
      newSocket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        // Allow upgrade from polling → websocket (Render proxy compatible)
      });
      
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to socket gateway');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from socket gateway');
      });
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token]);

  const joinBoard = (boardId) => {
    if (socket) {
      socket.emit('join-board', boardId);
    }
  };

  const leaveBoard = (boardId) => {
    if (socket) {
      socket.emit('leave-board', boardId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinBoard, leaveBoard }}>
      {children}
    </SocketContext.Provider>
  );
};

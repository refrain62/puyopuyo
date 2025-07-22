import { renderHook, act, waitFor } from '@testing-library/react';
import { usePuyoGame } from './usePuyoGame';
import { io, Socket } from 'socket.io-client';

// Helper function to create a fresh mock socket for each test
const createMockSocket = (): jest.Mocked<Socket> & {
  _listeners: Map<string, Function[]>;
  trigger: (event: string, ...args: any[]) => void;
  _clearListeners: () => void;
} => {
  const listeners = new Map<string, Function[]>();
  const socket: any = { // Use 'any' temporarily for internal construction
    id: 'mock-socket-id',
    connected: true,
    disconnected: false,
    _listeners: listeners,
    trigger: (event: string, ...args: any[]) => {
      listeners.get(event)?.forEach((callback: Function) => callback(...args));
    },
    _clearListeners: () => {
      listeners.clear();
    },
  };

  // Mock the actual methods and ensure they return 'this' for chaining
  socket.on = jest.fn((event: string, callback: Function) => {
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }
    listeners.get(event)?.push(callback);
    return socket; // Return 'this' for chaining
  }) as jest.MockedFunction<any>; // Use any for simplicity with complex Socket types

  socket.emit = jest.fn() as jest.MockedFunction<any>; // Use any for simplicity
  socket.disconnect = jest.fn() as jest.MockedFunction<any>; // Use any for simplicity

  return socket as jest.Mocked<Socket> & {
    _listeners: Map<string, Function[]>;
    trigger: (event: string, ...args: any[]) => void;
    _clearListeners: () => void;
  };
};

let currentMockSocket: ReturnType<typeof createMockSocket>;

// Mock socket.io-client to always return the same mockSocket instance
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => currentMockSocket),
}));

// Mock useSocket hook to always return the same mockSocket instance
jest.mock('./useSocket', () => ({
  useSocket: jest.fn(() => currentMockSocket),
}));

describe('usePuyoGame', () => {
  beforeEach(() => {
    // Re-create the mock socket for each test to ensure a clean state
    currentMockSocket = createMockSocket();
    // Clear all mocks on the newly created socket
    currentMockSocket.emit.mockClear();
    currentMockSocket.disconnect.mockClear();
    currentMockSocket.on.mockClear();
    currentMockSocket._clearListeners();
  });

  test('should initialize game state correctly', () => {
    const { result } = renderHook(() => usePuyoGame());

    expect(result.current.gameState.score).toBe(0);
    expect(result.current.gameState.isGameOver).toBe(false);
    expect(result.current.gameState.nextPuyos.length).toBe(2);
    expect(result.current.opponentState).toBeNull();
    expect(result.current.joinedRoom).toBe(false);
    expect(result.current.roomId).toBe('');
  });

  test('should join a room and start game on socket event', async () => {
    const { result } = renderHook(() => usePuyoGame());

    act(() => {
      result.current.setRoomId('testRoom');
      result.current.handleJoinRoom();
    });

    // Expect currentMockSocket.emit to be called with joinRoom
    expect(currentMockSocket.emit).toHaveBeenCalledWith('joinRoom', 'testRoom');

    // Simulate startGame event from server
    act(() => {
      currentMockSocket.trigger('startGame');
    });
    await waitFor(() => expect(result.current.joinedRoom).toBe(true), { timeout: 2000 });

    expect(result.current.gameState.isGameOver).toBe(false);
  });

  test('should update opponent state on opponentFieldUpdate event', async () => {
    const { result } = renderHook(() => usePuyoGame());

    const mockOpponentField = [[{ color: 'red' }]];

    act(() => {
      currentMockSocket.trigger('opponentFieldUpdate', mockOpponentField);
    });
    await waitFor(() => expect(result.current.opponentState).toEqual(mockOpponentField), { timeout: 2000 });
  });

  test('should handle key presses for movement', async () => {
    const { result } = renderHook(() => usePuyoGame());

    // Simulate ArrowLeft key press
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      window.dispatchEvent(event);
    });
    expect(result.current.playerState.puyo1.x).toBe(1);

    // Simulate ArrowRight key press
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      window.dispatchEvent(event);
    });
    expect(result.current.playerState.puyo1.x).toBe(2);

    // Simulate ArrowDown key press (this will trigger dropPuyo, which can be async)
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      window.dispatchEvent(event);
    });
    await waitFor(() => expect(result.current.playerState.puyo1.y).toBeGreaterThanOrEqual(0), { timeout: 2000 });
  });

  // More tests for fixPuyo, game over, nuisance puyos, etc. will be added later
});
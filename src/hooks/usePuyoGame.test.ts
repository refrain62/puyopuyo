import { renderHook, act, waitFor } from '@testing-library/react';
import { usePuyoGame } from './usePuyoGame';
import { Socket } from 'socket.io-client';
import { useSocket } from './useSocket';

// Mock the useSocket hook
jest.mock('./useSocket');
const mockedUseSocket = useSocket as jest.Mock;

// Helper function to create a fresh mock socket for each test
const createMockSocket = (): jest.Mocked<Socket> & {
  _listeners: Map<string, Function[]>;
  trigger: (event: string, ...args: any[]) => void;
  _clearListeners: () => void;
} => {
  const listeners = new Map<string, Function[]>();
  const socket: any = {
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

  socket.on = jest.fn((event: string, callback: Function) => {
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }
    listeners.get(event)?.push(callback);
    return socket;
  });

  socket.emit = jest.fn();
  socket.disconnect = jest.fn();
  socket.off = jest.fn((event: string) => {
    listeners.delete(event);
  });

  return socket;
};

describe('usePuyoGame', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    // Create a new mock socket for each test
    mockSocket = createMockSocket();
    // Configure the mocked useSocket hook to return the new mock socket
    mockedUseSocket.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      result.current.handleJoinRoom('testRoom');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('joinRoom', 'testRoom');

    act(() => {
      mockSocket.trigger('startGame');
    });

    await waitFor(() => {
      expect(result.current.joinedRoom).toBe(true);
      expect(result.current.gameState.isGameOver).toBe(false);
    });
  });

  test('should update opponent state on opponentFieldUpdate event', async () => {
    const { result } = renderHook(() => usePuyoGame());
    const mockOpponentField = [[{ color: 'red' }]];

    act(() => {
      mockSocket.trigger('opponentFieldUpdate', mockOpponentField);
    });

    await waitFor(() => {
      expect(result.current.opponentState).toEqual(mockOpponentField);
    });
  });

  test('should handle key presses for movement', async () => {
    const { result } = renderHook(() => usePuyoGame());

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      window.dispatchEvent(event);
    });
    expect(result.current.playerState.puyo1.x).toBe(1);

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      window.dispatchEvent(event);
    });
    expect(result.current.playerState.puyo1.x).toBe(2);

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      window.dispatchEvent(event);
    });
    await waitFor(() => expect(result.current.playerState.puyo1.y).toBeGreaterThanOrEqual(0));
  });
});

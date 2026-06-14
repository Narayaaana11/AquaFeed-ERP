import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
    url?: string;
    autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    // WebSocket URL resolution:
    // - Production (Vercel): use VITE_WS_URL pointing to Render backend
    // - Development: connect directly to localhost:5000 backend
    const getWebSocketURL = () => {
        if (import.meta.env.VITE_WS_URL) {
            return import.meta.env.VITE_WS_URL as string;
        }
        if (import.meta.env.PROD) {
            // Fallback: derive WS URL from API URL if set
            return import.meta.env.VITE_API_URL as string ?? window.location.origin;
        }
        return 'http://localhost:5000';
    };

    const { url = getWebSocketURL(), autoConnect = true } = options;
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem('token');

    // Initialize socket connection
    useEffect(() => {
        if (!autoConnect) return;

        if (!token) {
            console.warn('⚠️  No authentication token found. WebSocket connection skipped.');
            return;
        }

        try {
            socketRef.current = io(url, {
                auth: {
                    token,
                },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
                transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
            });

            socketRef.current.on('connect', () => {
                console.log('✅ WebSocket connected');
                setIsConnected(true);
                setError(null);
            });

            socketRef.current.on('disconnect', () => {
                console.log('❌ WebSocket disconnected');
                setIsConnected(false);
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('❌ WebSocket connection error:', error);
                setError(error.message || 'Connection error');
            });

            socketRef.current.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                setError(typeof error === 'string' ? error : 'WebSocket error');
            });
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            setError(error instanceof Error ? error.message : 'Initialization error');
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [url, autoConnect, token]);

    // Subscribe to a channel
    const subscribe = useCallback((channel: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(`subscribe_${channel}`);
            console.log(`📡 Subscribed to ${channel}`);
        } else {
            console.warn(`⚠️  Cannot subscribe to ${channel} - WebSocket not connected`);
        }
    }, []);

    // Unsubscribe from a channel
    const unsubscribe = useCallback((channel: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(`unsubscribe_${channel}`);
            console.log(`📡 Unsubscribed from ${channel}`);
        } else {
            console.warn(`⚠️  Cannot unsubscribe from ${channel} - WebSocket not connected`);
        }
    }, []);

    // Listen to events
    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    }, []);

    // Emit events
    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        } else {
            console.warn(`⚠️  Cannot emit ${event} - WebSocket not connected`);
        }
    }, []);

    // Unsubscribe from events
    const off = useCallback((event: string) => {
        if (socketRef.current) {
            socketRef.current.off(event);
        }
    }, []);

    return {
        socket: socketRef.current,
        isConnected,
        error,
        subscribe,
        unsubscribe,
        on,
        emit,
        off,
    };
}

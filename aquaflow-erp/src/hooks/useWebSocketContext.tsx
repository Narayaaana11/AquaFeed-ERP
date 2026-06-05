import React, { createContext, useContext } from 'react';
import { useWebSocket } from './useWebSocket';

interface WebSocketContextType {
    isConnected: boolean;
    error: string | null;
    subscribe: (channel: string) => void;
    unsubscribe: (channel: string) => void;
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string) => void;
    emit: (event: string, data?: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { isConnected, error, subscribe, unsubscribe, on, off, emit } = useWebSocket();

    const contextValue: WebSocketContextType = {
        isConnected,
        error,
        subscribe,
        unsubscribe,
        on,
        off,
        emit,
    };

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocketContext() {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocketContext must be used within WebSocketProvider');
    }
    return context;
}

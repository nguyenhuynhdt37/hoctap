import { useRef, useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

interface UseWebSocketProps {
  endpoint: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  enabled?: boolean;
  role_name?: string | null;
}

export function useWebSocket({
  endpoint,
  onMessage,
  onConnect,
  onDisconnect,
  enabled = true,
  role_name,
}: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosing = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    if (!enabled || isClosing.current) return;
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('access_token');
      const baseUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://127.0.0.1:8000';
      
      // Ghép URL chính xác như web
      let wsUrl = `${baseUrl}${endpoint}`;
      const params = new URLSearchParams();
      
      if (token) params.append('access_token', token);
      if (role_name) params.append('role_name', role_name);
      
      const queryString = params.toString();
      if (queryString) {
        wsUrl += `?${queryString}`;
      }

      console.log('🔌 [WS] Connecting to:', wsUrl);
      
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('✅ [WS] Connected:', endpoint);
        setIsConnected(true);
        onConnect?.();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error('⚠️ [WS] Parse error:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('⚡ [WS] Error:', err);
      };

      socket.onclose = (event) => {
        console.log('🔴 [WS] Closed:', endpoint, event.code, event.reason);
        setIsConnected(false);
        onDisconnect?.();
        
        // Reconnect logic
        if (!isClosing.current && enabled) {
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.current = socket;
    } catch (err) {
      console.error('❌ [WS] Connection setup failed:', err);
    }
  }, [endpoint, enabled, onMessage, onConnect, onDisconnect, role_name]);

  const disconnect = useCallback(() => {
    isClosing.current = true;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      isClosing.current = false;
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  const sendMessage = useCallback((data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
      return true;
    } else {
      console.warn('⚠️ [WS] Cannot send message, socket not open');
      return false;
    }
  }, []);

  return {
    sendMessage,
    reconnect: connect,
    disconnect,
    isConnected,
  };
}

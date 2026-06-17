import { useRef, useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

interface UseWebSocketProps {
  endpoint: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: (code?: number, reason?: string) => void;
  enabled?: boolean;
  role_name?: string | null;
}

function resolveWebSocketBaseUrl() {
  const explicitWsUrl = process.env.EXPO_PUBLIC_WS_URL;
  if (explicitWsUrl) return explicitWsUrl.replace(/\/$/, '');

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl
      .replace(/\/api\/v1\/?$/, '')
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://')
      .replace(/\/$/, '');
  }

  return 'ws://127.0.0.1:8000';
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
  const isConnecting = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  // Latest ref pattern to avoid recreation of connect callback and effect loops
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const endpointRef = useRef(endpoint);
  const enabledRef = useRef(enabled);
  const roleNameRef = useRef(role_name);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    endpointRef.current = endpoint;
    enabledRef.current = enabled;
    roleNameRef.current = role_name;
  });

  const connect = useCallback(async () => {
    const currentEnabled = enabledRef.current;
    if (!currentEnabled || isClosing.current) return;
    if (isConnecting.current) return;
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    isConnecting.current = true;
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const baseUrl = resolveWebSocketBaseUrl();

      let wsUrl = `${baseUrl}${endpointRef.current}`;
      const params = new URLSearchParams();

      if (token) params.append('access_token', token);
      if (roleNameRef.current) params.append('role_name', roleNameRef.current);

      const queryString = params.toString();
      if (queryString) {
        wsUrl += `?${queryString}`;
      }

      console.log('🔌 [WS] Connecting to:', wsUrl);

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (ws.current !== socket) return;
        console.log('✅ [WS] Connected:', endpointRef.current);
        setIsConnected(true);
        onConnectRef.current?.();
      };

      socket.onmessage = (event) => {
        if (ws.current !== socket) return;
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (err) {
          console.error('⚠️ [WS] Parse error:', err);
        }
      };

      socket.onerror = (err) => {
        if (ws.current !== socket) return;
        console.error('⚡ [WS] Error:', err);
      };

      socket.onclose = (event) => {
        console.log('🔴 [WS] Closed:', endpointRef.current, event.code, event.reason);

        // Only handle close events for the active socket
        if (ws.current !== socket) {
          return;
        }

        setIsConnected(false);
        onDisconnectRef.current?.(event.code, event.reason);

        // Reconnect only on abnormal closes. Code 1000 is a clean server close.
        if (!isClosing.current && enabledRef.current && event.code !== 1000 && event.code !== 1008) {
          if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
          }
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.current = socket;
    } catch (err) {
      console.error('❌ [WS] Connection setup failed:', err);
    } finally {
      isConnecting.current = false;
    }
  }, []);

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

  // Handle changes to endpoint or role_name by reconnecting
  const lastEndpoint = useRef(endpoint);
  const lastRoleName = useRef(role_name);

  useEffect(() => {
    if (endpoint !== lastEndpoint.current || role_name !== lastRoleName.current) {
      lastEndpoint.current = endpoint;
      lastRoleName.current = role_name;
      if (enabled) {
        disconnect();
        isClosing.current = false;
        connect();
      }
    }
  }, [endpoint, role_name, enabled, connect, disconnect]);

  const sendMessage = useCallback((data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
      return true;
    }

    return false;
  }, []);

  return {
    sendMessage,
    reconnect: connect,
    disconnect,
    isConnected,
  };
}

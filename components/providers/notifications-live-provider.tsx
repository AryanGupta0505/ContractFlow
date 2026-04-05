"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function NotificationsLiveProvider() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;

    const refreshNotifications = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);

    const connect = () => {
      if (closed) {
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/api/notifications/ws`);

      socket.onmessage = () => {
        void refreshNotifications();
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (closed) {
          return;
        }

        reconnectTimer = window.setTimeout(connect, 2_000);
      };
    };

    connect();

    return () => {
      closed = true;

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }

      socket?.close();
    };
  }, [queryClient, session?.user?.id, status]);

  return null;
}

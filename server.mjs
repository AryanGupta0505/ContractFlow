import "dotenv/config";
import http from "node:http";
import { parse } from "node:url";

import next from "next";
import { getToken } from "next-auth/jwt";
import pg from "pg";
import { WebSocket, WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production" && !process.argv.includes("--prod");
const hostname = dev
  ? process.env.HOSTNAME || "127.0.0.1"
  : process.env.BIND_HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const browserHostname = hostname === "0.0.0.0" ? "localhost" : hostname;
const authSecret =
  process.env.NEXTAUTH_SECRET ||
  (dev ? "contractflow-dev-secret-change-this-before-production" : undefined);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const { Client } = pg;

function createRealtimeClient(connectionString) {
  if (!connectionString) {
    return null;
  }

  const parsedUrl = new URL(connectionString);
  parsedUrl.searchParams.delete("sslmode");
  parsedUrl.searchParams.delete("uselibpqcompat");

  return new Client({
    connectionString: parsedUrl.toString(),
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

app.prepare().then(async () => {
  const handleUpgrade = app.getUpgradeHandler();
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });
  const connections = new Map();

  wss.on("connection", (socket, context) => {
    connections.set(socket, context);

    socket.on("close", () => {
      connections.delete(socket);
    });
  });

  const broadcastNotificationEvent = (event) => {
    const payload = JSON.stringify(event);

    for (const [socket, connection] of connections.entries()) {
      if (socket.readyState !== WebSocket.OPEN) {
        continue;
      }

      if (event.organizationId && connection.organizationId !== event.organizationId) {
        continue;
      }

      if (
        Array.isArray(event.userIds) &&
        event.userIds.length > 0 &&
        !event.userIds.includes(connection.userId)
      ) {
        continue;
      }

      socket.send(payload);
    }
  };

  let realtimeClient = createRealtimeClient(databaseUrl);

  if (realtimeClient) {
    try {
      await realtimeClient.connect();
      await realtimeClient.query("LISTEN notifications_live");
      realtimeClient.on("notification", (message) => {
        if (!message.payload) {
          return;
        }

        try {
          broadcastNotificationEvent(JSON.parse(message.payload));
        } catch {
          return;
        }
      });
      realtimeClient.on("error", () => null);
    } catch (error) {
      console.warn(
        "Realtime notifications listener could not connect. Continuing without live updates.",
        error instanceof Error ? error.message : error,
      );
      await realtimeClient.end().catch(() => null);
      realtimeClient = null;
    }
  }

  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = parse(req.url || "", true);

    if (pathname !== "/api/notifications/ws") {
      handleUpgrade(req, socket, head);
      return;
    }

    try {
      const token = await getToken({ req, secret: authSecret });

      if (!token?.id) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, {
          userId: String(token.id),
          organizationId:
            typeof token.organizationId === "string" ? token.organizationId : null,
        });
      });
    } catch {
      socket.destroy();
    }
  });

  const shutdown = () => {
    for (const socket of connections.keys()) {
      socket.close();
    }

    Promise.resolve(realtimeClient?.end())
      .catch(() => null)
      .finally(() => {
        server.close(() => {
          process.exit(0);
        });
      });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${browserHostname}:${port}`);
  });
}).catch((error) => {
  console.error("Failed to start ContractFlow server.", error);
  process.exit(1);
});

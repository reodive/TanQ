import { NextRequest } from "next/server";
import { getAuthContextFromRequest } from "@/lib/auth";
import { addNotificationListener, removeNotificationListener } from "@/lib/realtime/notifications";
import type { RealtimeNotification } from "@/lib/realtime/types";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const userId = ctx.user.id;
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (event: RealtimeNotification) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      push({ type: "connected", timestamp: new Date().toISOString() });
      addNotificationListener(userId, push);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
          cleanup();
        }
      }, 30000);

      const abortController = () => {
        removeNotificationListener(userId, push);
        clearInterval(heartbeat);
      };

      req.signal.addEventListener("abort", abortController);
      cleanup = () => {
        abortController();
        req.signal.removeEventListener("abort", abortController);
        cleanup = () => {};
      };
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}

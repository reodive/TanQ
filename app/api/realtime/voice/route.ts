export const runtime = "edge";

type EdgeWebSocket = WebSocket & { accept(): void };

const rooms = new Map<
  string,
  Map<
    string,
    {
      socket: EdgeWebSocket;
      meta?: { userId: string; name: string };
    }
  >
>();

function getRoom(roomId: string) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  return room;
}

function cleanupRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (room && room.size === 0) {
    rooms.delete(roomId);
  }
}

function broadcast(roomId: string, payload: Record<string, unknown>, excludePeer?: string) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }
  const data = JSON.stringify(payload);
  room.forEach(({ socket }, peerId) => {
    if (peerId === excludePeer) {
      return;
    }
    try {
      socket.send(data);
    } catch (err) {
      console.error("Failed to send websocket message", err);
    }
  });
}

function serializePeers(room: Map<string, { socket: EdgeWebSocket; meta?: { userId: string; name: string } }>, omitPeer?: string) {
  const peers: Array<{ peerId: string; meta?: { userId: string; name: string } }> = [];
  room.forEach((participant, peerId) => {
    if (peerId === omitPeer) {
      return;
    }
    peers.push({ peerId, meta: participant.meta });
  });
  return peers;
}

type WebSocketResponseInit = ResponseInit & { webSocket: WebSocket };

export async function GET(request: Request) {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("room");
  if (!roomId) {
    return new Response("Missing room identifier", { status: 400 });
  }

  const globalWithPair = globalThis as typeof globalThis & {
    WebSocketPair?: new () => { 0: EdgeWebSocket; 1: EdgeWebSocket };
  };

  const Pair = globalWithPair.WebSocketPair;
  if (!Pair) {
    return new Response("WebSocket not supported", { status: 500 });
  }

  const pair = new Pair();
  const [client, server] = [pair[0], pair[1]];

  handleConnection(server, roomId);

  return new Response(null, { status: 101, webSocket: client } as WebSocketResponseInit);
}

function handleConnection(socket: EdgeWebSocket, roomId: string) {
  const peerId = crypto.randomUUID();
  const room = getRoom(roomId);

  socket.accept();

  room.set(peerId, { socket });

  socket.send(
    JSON.stringify({
      type: "init",
      peerId,
      peers: serializePeers(room, peerId)
    })
  );

  broadcast(roomId, { type: "peer-join", peerId }, peerId);

  socket.addEventListener("message", (event) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof event.data === "string" ? event.data : "" + event.data);
    } catch (err) {
      console.warn("Ignoring invalid websocket payload", err);
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const data = parsed as Record<string, unknown> & { type?: unknown };
    if (typeof data.type !== "string") {
      return;
    }

    const participant = getRoom(roomId).get(peerId);
    if (!participant) {
      return;
    }

    switch (data.type) {
      case "identity": {
        if (data.userId && data.name) {
          participant.meta = { userId: String(data.userId), name: String(data.name) };
          broadcast(roomId, { type: "peer-info", peerId, meta: participant.meta }, peerId);
        }
        break;
      }
      case "offer":
      case "answer":
      case "ice-candidate": {
        const target = typeof data.target === "string" ? data.target : undefined;
        if (!target) {
          return;
        }
        const roomState = getRoom(roomId);
        const targetParticipant = roomState.get(target);
        if (!targetParticipant) {
          return;
        }
        try {
          targetParticipant.socket.send(
            JSON.stringify({
              ...data,
              from: peerId
            })
          );
        } catch (err) {
          console.error("Failed to forward signal", err);
        }
        break;
      }
      case "hangup": {
        broadcast(roomId, { type: "peer-leave", peerId }, peerId);
        room.delete(peerId);
        try {
          socket.close();
        } catch (err) {
          console.error("Failed to close socket on hangup", err);
        }
        cleanupRoom(roomId);
        break;
      }
      default:
        break;
    }
  });

  const closeHandler = () => {
    const roomState = getRoom(roomId);
    if (roomState.has(peerId)) {
      roomState.delete(peerId);
      broadcast(roomId, { type: "peer-leave", peerId }, peerId);
    }
    cleanupRoom(roomId);
  };

  socket.addEventListener("close", closeHandler);
  socket.addEventListener("error", closeHandler);
}

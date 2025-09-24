"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

type VoiceRoomClientProps = {
  roomSlug: string;
  user: { id: string; name: string };
  members: Array<{ id: string; name: string }>;
};

type ParticipantMeta = {
  name?: string;
  userId?: string;
};

type SignalMessage =
  | { type: "init"; peerId: string; peers: Array<{ peerId: string; meta?: ParticipantMeta }> }
  | { type: "peer-join"; peerId: string; meta?: ParticipantMeta }
  | { type: "peer-info"; peerId: string; meta?: ParticipantMeta }
  | { type: "peer-leave"; peerId: string }
  | { type: "offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; from: string; candidate: RTCIceCandidateInit };

export default function VoiceRoomClient({ roomSlug, user, members }: VoiceRoomClientProps) {
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const participantsRef = useRef<Map<string, ParticipantMeta>>(new Map());
  const [remotePeers, setRemotePeers] = useState<Array<{ peerId: string; stream: MediaStream }>>([]);
  const [participants, setParticipants] = useState<Record<string, ParticipantMeta>>({});
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "error">("connecting");
  const [selfPeerId, setSelfPeerId] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);

  const memberLookup = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);

  const sendMessage = useCallback((payload: Record<string, unknown>) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }, []);

  const updateParticipantsState = useCallback(() => {
    const snapshot: Record<string, ParticipantMeta> = {};
    participantsRef.current.forEach((meta, peerId) => {
      snapshot[peerId] = meta;
    });
    setParticipants(snapshot);
  }, []);

  const syncRemoteStreams = useCallback(() => {
    const list = Array.from(remoteStreamsRef.current.entries()).map(([peerId, stream]) => ({
      peerId,
      stream
    }));
    setRemotePeers(list);
  }, []);

  const getOrCreatePeerConnection = useCallback(
    (peerId: string) => {
      const existing = peerConnectionsRef.current.get(peerId);
      if (existing) {
        return existing;
      }
      const connection = new RTCPeerConnection(ICE_SERVERS);

      connection.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({ type: "ice-candidate", target: peerId, candidate: event.candidate });
        }
      };

      connection.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        remoteStreamsRef.current.set(peerId, stream);
        syncRemoteStreams();
      };

      const localStream = localStreamRef.current;
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          connection.addTrack(track, localStream);
        });
      }

      peerConnectionsRef.current.set(peerId, connection);
      return connection;
    },
    [sendMessage, syncRemoteStreams]
  );

  const handlePeerLeave = useCallback(
    (peerId: string) => {
      const connection = peerConnectionsRef.current.get(peerId);
      if (connection) {
        connection.close();
        peerConnectionsRef.current.delete(peerId);
      }
      const stream = remoteStreamsRef.current.get(peerId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        remoteStreamsRef.current.delete(peerId);
      }
      participantsRef.current.delete(peerId);
      updateParticipantsState();
      syncRemoteStreams();
    },
    [syncRemoteStreams, updateParticipantsState]
  );

  useEffect(() => {
    members.forEach((member) => {
      participantsRef.current.set(member.id, { name: member.name, userId: member.id });
    });
    updateParticipantsState();
  }, [members, updateParticipantsState]);

  useEffect(() => {
    let isCancelled = false;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = micEnabled;
        });
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
          localAudioRef.current.muted = true;
          void localAudioRef.current.play().catch(() => undefined);
        }

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const socket = new WebSocket(`${protocol}://${window.location.host}/api/realtime/voice?room=${encodeURIComponent(roomSlug)}`);
        wsRef.current = socket;

        socket.addEventListener("open", () => {
          setConnectionState("connected");
        });

        socket.addEventListener("message", async (event) => {
          let payload: SignalMessage | null = null;
          try {
            payload = JSON.parse(event.data as string) as SignalMessage;
          } catch (err) {
            console.warn("無効なシグナリングメッセージを無視しました", err);
            return;
          }
          if (!payload) return;

      const resolveMeta = (meta?: ParticipantMeta): ParticipantMeta => {
        if (!meta || meta.name) {
          return meta ?? {};
        }
        const fallbackName = meta.userId ? memberLookup.get(meta.userId) : undefined;
        return { ...meta, name: fallbackName };
      };

      switch (payload.type) {
        case "init": {
          setSelfPeerId(payload.peerId);
          participantsRef.current.set(payload.peerId, { name: user.name, userId: user.id });
          payload.peers.forEach((peer) => {
            participantsRef.current.set(peer.peerId, resolveMeta(peer.meta));
          });
          updateParticipantsState();
              sendMessage({ type: "identity", userId: user.id, name: user.name });
              for (const peer of payload.peers) {
                const connection = getOrCreatePeerConnection(peer.peerId);
                try {
                  const offer = await connection.createOffer();
                  await connection.setLocalDescription(offer);
                  sendMessage({ type: "offer", target: peer.peerId, sdp: offer });
                } catch (err) {
                  console.error("Failed to create offer", err);
                }
              }
              break;
        }
        case "peer-join": {
          participantsRef.current.set(payload.peerId, resolveMeta(payload.meta));
          updateParticipantsState();
          const connection = getOrCreatePeerConnection(payload.peerId);
              try {
                const offer = await connection.createOffer();
                await connection.setLocalDescription(offer);
                sendMessage({ type: "offer", target: payload.peerId, sdp: offer });
              } catch (err) {
                console.error("Failed to negotiate with new peer", err);
              }
              break;
        }
        case "peer-info": {
          participantsRef.current.set(payload.peerId, resolveMeta(payload.meta));
          updateParticipantsState();
          break;
            }
            case "peer-leave": {
              handlePeerLeave(payload.peerId);
              break;
            }
            case "offer": {
              if (!payload.from) return;
              const connection = getOrCreatePeerConnection(payload.from);
              try {
                await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                sendMessage({ type: "answer", target: payload.from, sdp: answer });
              } catch (err) {
                console.error("Failed to handle offer", err);
              }
              break;
            }
            case "answer": {
              if (!payload.from) return;
              const connection = getOrCreatePeerConnection(payload.from);
              try {
                await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              } catch (err) {
                console.error("Failed to handle answer", err);
              }
              break;
            }
            case "ice-candidate": {
              if (!payload.from || !payload.candidate) return;
              const connection = peerConnectionsRef.current.get(payload.from);
              if (!connection) return;
              try {
                await connection.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (err) {
                console.error("Failed to add ICE candidate", err);
              }
              break;
            }
            default:
              break;
          }
        });

        socket.addEventListener("close", () => {
          if (!isCancelled) {
            setConnectionState("error");
          }
        });
        socket.addEventListener("error", () => {
          if (!isCancelled) {
            setConnectionState("error");
          }
        });
      } catch (err) {
        if (!isCancelled) {
          console.error("マイクの初期化に失敗しました", err);
          setConnectionState("error");
        }
      }
    }

    setup();

    const connectionSnapshot = peerConnectionsRef.current;
    const remoteStreamsSnapshot = remoteStreamsRef.current;
    const socketSnapshot = wsRef.current;

    return () => {
      isCancelled = true;
      socketSnapshot?.close();
      connectionSnapshot.forEach((connection) => connection.close());
      connectionSnapshot.clear();
      remoteStreamsSnapshot.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      remoteStreamsSnapshot.clear();
      const localStream = localStreamRef.current;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      wsRef.current = null;
    };
  }, [
    getOrCreatePeerConnection,
    handlePeerLeave,
    localStreamRef,
    memberLookup,
    micEnabled,
    participantsRef,
    peerConnectionsRef,
    remoteStreamsRef,
    roomSlug,
    sendMessage,
    setConnectionState,
    updateParticipantsState,
    user.id,
    user.name,
    wsRef
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sendMessage({ type: "hangup" });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sendMessage]);

  const remoteStreamMap = useMemo(() => new Map(remotePeers.map((peer) => [peer.peerId, peer.stream])), [remotePeers]);
  const remoteParticipantEntries = useMemo(
    () =>
      Object.entries(participants).filter(([peerId]) => {
        if (!selfPeerId) return true;
        return peerId !== selfPeerId;
      }),
    [participants, selfPeerId]
  );

  const toggleMic = useCallback(() => {
    const next = !micEnabled;
    setMicEnabled(next);
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
    }
  }, [micEnabled]);

  const leaveRoom = useCallback(() => {
    sendMessage({ type: "hangup" });
    wsRef.current?.close();
    router.push("/voice");
  }, [router, sendMessage]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          接続状態: {
            connectionState === "connecting"
              ? "接続中"
              : connectionState === "connected"
              ? "接続済み"
              : "切断"
          }
        </div>
        <div className="flex gap-2">
          <Button variant={micEnabled ? "primary" : "secondary"} onClick={toggleMic} type="button">
            {micEnabled ? "マイクをミュート" : "マイクをオン"}
          </Button>
          <Button variant="ghost" type="button" onClick={leaveRoom}>
            退出
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800">あなた ({user.name})</p>
          <audio ref={localAudioRef} autoPlay playsInline muted className="mt-3 w-full" />
          <p className="mt-2 text-xs text-slate-500">マイクの状態: {micEnabled ? "オン" : "ミュート"}</p>
        </div>
        {remoteParticipantEntries.length === 0 && (
          <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
            他の参加者を待機中です。
          </div>
        )}
        {remoteParticipantEntries.map(([peerId, meta]) => {
          const stream = remoteStreamMap.get(peerId);
          return (
            <div key={peerId} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">{meta.name ?? "参加者"}</p>
              <audio
                key={`${peerId}-${stream ? stream.id : "silent"}`}
                autoPlay
                playsInline
                controls={false}
                className="mt-3 w-full"
                ref={(element) => {
                  if (element && stream) {
                    element.srcObject = stream;
                    void element.play().catch(() => undefined);
                  }
                }}
              />
              {!stream && <p className="mt-2 text-xs text-slate-500">接続準備中...</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

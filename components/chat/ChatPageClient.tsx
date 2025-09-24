"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChatBubbleBottomCenterTextIcon,
  UserGroupIcon,
  UserIcon,
  PaperAirplaneIcon,
  PlusCircleIcon
} from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CurrentUser = {
  id: string;
  name: string;
  role: string;
};

type RoomMembership = {
  id: string;
  autoJoined: boolean;
  createdAt: string;
};

type Room = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  grade: string | null;
  tags: string[];
  createdAt: string;
  membership: RoomMembership | null;
};

type Participant = {
  id: string;
  name: string;
  role: string;
};

type Conversation = {
  id: string;
  userAId: string;
  userBId: string;
  updatedAt: string;
  otherParticipant: Participant;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: Participant;
};

type Candidate = Participant & {
  grade?: string | null;
};

type Props = {
  currentUser: CurrentUser;
  rooms: Room[];
  conversations: Conversation[];
  dmCandidates: Candidate[];
  canCreateRooms: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { message: string };
};

type TabKey = "rooms" | "dm";

export default function ChatPageClient({
  currentUser,
  rooms: initialRooms,
  conversations: initialConversations,
  dmCandidates,
  canCreateRooms
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("rooms");
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRooms[0]?.id ?? null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [roomMessages, setRoomMessages] = useState<Record<string, Message[]>>({});
  const [dmMessages, setDmMessages] = useState<Record<string, Message[]>>({});
  const [loadingRoomMessages, setLoadingRoomMessages] = useState(false);
  const [sendingRoomMessage, setSendingRoomMessage] = useState(false);
  const [loadingDmMessages, setLoadingDmMessages] = useState(false);
  const [sendingDmMessage, setSendingDmMessage] = useState(false);
  const [roomInput, setRoomInput] = useState("");
  const [dmInput, setDmInput] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(dmCandidates[0]?.id ?? "");
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [roomFormLoading, setRoomFormLoading] = useState(false);
  const [roomFormError, setRoomFormError] = useState<string | null>(null);

  const roomMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const dmMessagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    roomMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages, selectedRoomId]);

  useEffect(() => {
    dmMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages, selectedConversationId]);

  const fetchRoomMessages = useCallback(async (roomId: string) => {
    setLoadingRoomMessages(true);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`);
      const json = (await res.json()) as ApiResponse<{ messages: Message[] }>;
      const payload = json.data;
      if (!res.ok || !json.success || !payload) {
        throw new Error(json.error?.message ?? "メッセージの取得に失敗しました");
      }
      setRoomMessages((prev) => ({ ...prev, [roomId]: payload.messages }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoomMessages(false);
    }
  }, []);

  const fetchDmMessages = useCallback(async (conversationId: string) => {
    setLoadingDmMessages(true);
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      const json = (await res.json()) as ApiResponse<{ messages: Message[] }>;
      const payload = json.data;
      if (!res.ok || !json.success || !payload) {
        throw new Error(json.error?.message ?? "メッセージの取得に失敗しました");
      }
      setDmMessages((prev) => ({ ...prev, [conversationId]: payload.messages }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDmMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoomId && !roomMessages[selectedRoomId] && !loadingRoomMessages) {
      void fetchRoomMessages(selectedRoomId);
    }
  }, [selectedRoomId, roomMessages, loadingRoomMessages, fetchRoomMessages]);

  useEffect(() => {
    if (selectedConversationId && !dmMessages[selectedConversationId] && !loadingDmMessages) {
      void fetchDmMessages(selectedConversationId);
    }
  }, [selectedConversationId, dmMessages, loadingDmMessages, fetchDmMessages]);

  const handleSendRoomMessage = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!selectedRoomId || !roomInput.trim()) return;
      setSendingRoomMessage(true);
      try {
        const res = await fetch(`/api/chat/rooms/${selectedRoomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: roomInput.trim() })
        });
        const json = (await res.json()) as ApiResponse<{ message: Message }>;
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "メッセージの送信に失敗しました");
        }
        const message = json.data.message;
        setRoomMessages((prev) => {
          const existing = prev[selectedRoomId] ?? [];
          return { ...prev, [selectedRoomId]: [...existing, message] };
        });
        setRoomInput("");
      } catch (err) {
        console.error(err);
      } finally {
        setSendingRoomMessage(false);
      }
    },
    [roomInput, selectedRoomId]
  );

  const handleSendDmMessage = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!selectedConversationId || !dmInput.trim()) return;
      setSendingDmMessage(true);
      try {
        const res = await fetch(`/api/chat/conversations/${selectedConversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: dmInput.trim() })
        });
        const json = (await res.json()) as ApiResponse<{ message: Message }>;
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "メッセージの送信に失敗しました");
        }
        const message = json.data.message;
        setDmMessages((prev) => {
          const existing = prev[selectedConversationId] ?? [];
          return { ...prev, [selectedConversationId]: [...existing, message] };
        });
        setDmInput("");
        setConversations((prev) => {
          const updated = prev.map((conversation) =>
            conversation.id === selectedConversationId
              ? { ...conversation, updatedAt: message.createdAt }
              : conversation
          );
          return [...updated].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSendingDmMessage(false);
      }
    },
    [dmInput, selectedConversationId]
  );

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const handleStartConversation = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setConversationError(null);
      if (!selectedCandidateId) {
        setConversationError("ユーザーを選択してください");
        return;
      }
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: selectedCandidateId })
        });
        const json = (await res.json()) as ApiResponse<{ conversation: Conversation }>;
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "DMの開始に失敗しました");
        }
        const conversation = json.data.conversation;
        setConversations((prev) => {
          const others = prev.filter((c) => c.id !== conversation.id);
          const merged = [conversation, ...others].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
          return merged;
        });
        setSelectedConversationId(conversation.id);
        setDmMessages((prev) => ({ ...prev, [conversation.id]: [] }));
        await fetchDmMessages(conversation.id);
      } catch (err) {
        setConversationError(err instanceof Error ? err.message : "DMの開始に失敗しました");
      }
    },
    [fetchDmMessages, selectedCandidateId]
  );

  const handleCreateRoom = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canCreateRooms) return;
      setRoomFormError(null);
      setRoomFormLoading(true);
      const formData = new FormData(event.currentTarget);
      const name = (formData.get("name") as string | null)?.trim();
      const description = (formData.get("description") as string | null)?.trim();
      const grade = (formData.get("grade") as string | null)?.trim();
      const tagsInput = (formData.get("tags") as string | null)?.trim();
      const slug = (formData.get("slug") as string | null)?.trim();
      if (!name) {
        setRoomFormError("部屋名を入力してください");
        setRoomFormLoading(false);
        return;
      }
      const payload = {
        name,
        slug: slug || undefined,
        description: description || undefined,
        grade: grade || undefined,
        tags: tagsInput
          ? tagsInput
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined
      };
      try {
        const res = await fetch("/api/chat/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = (await res.json()) as ApiResponse<{ room: Room }>;
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "チャットルームの作成に失敗しました");
        }
        const room = json.data.room;
        setRooms((prev) => [room, ...prev]);
        setSelectedRoomId(room.id);
        event.currentTarget.reset();
        setRoomFormOpen(false);
      } catch (err) {
        setRoomFormError(err instanceof Error ? err.message : "チャットルームの作成に失敗しました");
      } finally {
        setRoomFormLoading(false);
      }
    },
    [canCreateRooms]
  );

  const renderMessage = useCallback(
    (message: Message) => {
      const isOwn = message.sender.id === currentUser.id;
      return (
        <div key={message.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}> 
          <div
            className={cn(
              "max-w-md rounded-2xl px-4 py-2 text-sm",
              isOwn ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
            )}
          >
            {!isOwn && <p className="mb-1 text-xs font-semibold text-slate-500">{message.sender.name}</p>}
            <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
            <p className={cn("mt-2 text-[10px]", isOwn ? "text-white/70" : "text-slate-500/80")}>{formatTimestamp(message.createdAt)}</p>
          </div>
        </div>
      );
    },
    [currentUser.id]
  );

  const roomTagLine = useMemo(() => {
    if (!selectedRoom) return null;
    const items: string[] = [];
    if (selectedRoom.grade) items.push(`対象: ${selectedRoom.grade}`);
    if (selectedRoom.tags?.length) items.push(`タグ: ${selectedRoom.tags.join(", ")}`);
    if (selectedRoom.membership?.autoJoined) items.push("自動参加");
    return items.join(" / ");
  }, [selectedRoom]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">チャット</h1>
          <p className="text-sm text-slate-500">
            学校・学年・興味タグに合わせたグループチャットと、個別のダイレクトメッセージでやり取りできます。
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "rooms" ? "primary" : "outline"}
            onClick={() => setActiveTab("rooms")}
          >
            <UserGroupIcon className="mr-2 h-4 w-4" aria-hidden />
            チャットルーム
          </Button>
          <Button
            variant={activeTab === "dm" ? "primary" : "outline"}
            onClick={() => setActiveTab("dm")}
          >
            <ChatBubbleBottomCenterTextIcon className="mr-2 h-4 w-4" aria-hidden />
            DM
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="space-y-6">
          {activeTab === "rooms" ? (
            <Card
              title={
                <span className="flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5 text-brand-600" aria-hidden />
                  参加中のルーム
                </span>
              }
              action={
                canCreateRooms && (
                  <Button variant="ghost" size="sm" onClick={() => setRoomFormOpen((prev) => !prev)}>
                    <PlusCircleIcon className="mr-1 h-4 w-4" aria-hidden />
                    新規作成
                  </Button>
                )
              }
            >
              {canCreateRooms && roomFormOpen && (
                <form className="space-y-3 border-b border-slate-200 pb-4" onSubmit={handleCreateRoom}>
                  <Input name="name" placeholder="部屋名" required disabled={roomFormLoading} />
                  <Input name="slug" placeholder="スラッグ（任意）" disabled={roomFormLoading} />
                  <Input name="grade" placeholder="対象学年（任意）" disabled={roomFormLoading} />
                  <Input name="tags" placeholder="タグ（カンマ区切り・任意）" disabled={roomFormLoading} />
                  <Textarea name="description" placeholder="説明（任意）" rows={3} disabled={roomFormLoading} />
                  {roomFormError && <p className="text-xs text-rose-500">{roomFormError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRoomFormOpen(false)} disabled={roomFormLoading}>
                      キャンセル
                    </Button>
                    <Button type="submit" size="sm" disabled={roomFormLoading}>
                      {roomFormLoading ? "作成中..." : "作成"}
                    </Button>
                  </div>
                </form>
              )}
              <ul className="space-y-2">
                {rooms.length === 0 && <p className="text-sm text-slate-500">参加中のチャットルームはありません。</p>}
                {rooms.map((room) => (
                  <li key={room.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setActiveTab("rooms");
                      }}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left transition",
                        selectedRoomId === room.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <p className="font-medium">{room.name}</p>
                      <p className="text-xs text-slate-500">
                        {room.membership?.autoJoined ? "自動参加" : "手動参加"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card
              title={
                <span className="flex items-center gap-2">
                  <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-brand-600" aria-hidden />
                  ダイレクトメッセージ
                </span>
              }
            >
              <form className="space-y-2 border-b border-slate-200 pb-4" onSubmit={handleStartConversation}>
                <label className="text-xs font-semibold text-slate-500" htmlFor="dm-partner">
                  新しいDMを開始
                </label>
                <select
                  id="dm-partner"
                  name="participant"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  value={selectedCandidateId}
                  onChange={(event) => setSelectedCandidateId(event.target.value)}
                >
                  <option value="">ユーザーを選択</option>
                  {dmCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}（{candidate.role}）
                    </option>
                  ))}
                </select>
                {conversationError && <p className="text-xs text-rose-500">{conversationError}</p>}
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    DMを開始
                  </Button>
                </div>
              </form>
              <ul className="space-y-2 pt-4">
                {conversations.length === 0 && <p className="text-sm text-slate-500">まだDMはありません。</p>}
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConversationId(conversation.id);
                        setActiveTab("dm");
                      }}
                      className={cn(
                        "flex w-full flex-col rounded-lg border px-3 py-2 text-left transition",
                        selectedConversationId === conversation.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <span className="font-medium">{conversation.otherParticipant.name}</span>
                      <span className="text-xs text-slate-500">{formatTimestamp(conversation.updatedAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>

        <main>
          {activeTab === "rooms" ? (
            <Card
              title={
                selectedRoom ? (
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">{selectedRoom.name}</span>
                    {roomTagLine && <span className="text-xs text-slate-500">{roomTagLine}</span>}
                  </div>
                ) : (
                  "チャットルーム"
                )
              }
              className="h-full"
            >
              {selectedRoom ? (
                <div className="flex h-[600px] flex-col">
                  <div className="flex-1 overflow-y-auto space-y-3 rounded-lg bg-slate-50 p-4">
                    {loadingRoomMessages && !roomMessages[selectedRoom.id] ? (
                      <p className="text-sm text-slate-500">読み込み中...</p>
                    ) : roomMessages[selectedRoom.id]?.length ? (
                      roomMessages[selectedRoom.id]!.map(renderMessage)
                    ) : (
                      <p className="text-sm text-slate-500">まだメッセージはありません。最初のメッセージを送ってみましょう。</p>
                    )}
                    <div ref={roomMessagesEndRef} />
                  </div>
                  <form className="mt-4 space-y-3" onSubmit={handleSendRoomMessage}>
                    <Textarea
                      value={roomInput}
                      onChange={(event) => setRoomInput(event.target.value)}
                      placeholder="メッセージを入力"
                      rows={3}
                      disabled={sendingRoomMessage}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={sendingRoomMessage || !roomInput.trim()}>
                        <PaperAirplaneIcon className="mr-2 h-4 w-4" aria-hidden />
                        {sendingRoomMessage ? "送信中..." : "送信"}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-sm text-slate-500">
                  参加中のチャットルームから選択してください。
                </div>
              )}
            </Card>
          ) : (
            <Card
              title={
                selectedConversation ? (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-brand-600" aria-hidden />
                    <div>
                      <p className="font-semibold text-slate-800">{selectedConversation.otherParticipant.name}</p>
                      <p className="text-xs text-slate-500">{selectedConversation.otherParticipant.role}</p>
                    </div>
                  </div>
                ) : (
                  "ダイレクトメッセージ"
                )
              }
              className="h-full"
            >
              {selectedConversation ? (
                <div className="flex h-[600px] flex-col">
                  <div className="flex-1 overflow-y-auto space-y-3 rounded-lg bg-slate-50 p-4">
                    {loadingDmMessages && !dmMessages[selectedConversation.id] ? (
                      <p className="text-sm text-slate-500">読み込み中...</p>
                    ) : dmMessages[selectedConversation.id]?.length ? (
                      dmMessages[selectedConversation.id]!.map(renderMessage)
                    ) : (
                      <p className="text-sm text-slate-500">まだメッセージはありません。最初のメッセージを送ってみましょう。</p>
                    )}
                    <div ref={dmMessagesEndRef} />
                  </div>
                  <form className="mt-4 space-y-3" onSubmit={handleSendDmMessage}>
                    <Textarea
                      value={dmInput}
                      onChange={(event) => setDmInput(event.target.value)}
                      placeholder="メッセージを入力"
                      rows={3}
                      disabled={sendingDmMessage}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={sendingDmMessage || !dmInput.trim()}>
                        <PaperAirplaneIcon className="mr-2 h-4 w-4" aria-hidden />
                        {sendingDmMessage ? "送信中..." : "送信"}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-sm text-slate-500">
                  DMしたい相手を選択してください。
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type CreateVoiceRoomFormProps = {
  defaultSchoolId?: string | null;
};

export default function CreateVoiceRoomForm({ defaultSchoolId }: CreateVoiceRoomFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [grade, setGrade] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10),
    [tagsInput]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: Record<string, unknown> = {
      name,
      description: description || undefined,
      grade: grade || undefined,
      tags
    };
    if (defaultSchoolId) {
      payload.schoolId = defaultSchoolId;
    }

    const response = await fetch("/api/chat/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const message = result?.error?.message ?? "ルームの作成に失敗しました";
      setErrorMessage(message);
      setIsSubmitting(false);
      return;
    }

    setName("");
    setDescription("");
    setGrade("");
    setTagsInput("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="room-name">
          ルーム名
        </label>
        <Input
          id="room-name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例: 高校2年 探究プロジェクトMTG"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="room-description">
          説明 (任意)
        </label>
        <Textarea
          id="room-description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="ルームの使い方や参加対象を記載できます"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="room-grade">
            対象学年 (任意)
          </label>
          <Input
            id="room-grade"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            placeholder="例: 高2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="room-tags">
            タグ (カンマ区切り / 最大10件)
          </label>
          <Input
            id="room-tags"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="例: 探究,文系"
          />
          {tags.length > 0 && (
            <p className="text-xs text-slate-500">設定中: {tags.join(", ")}</p>
          )}
        </div>
      </div>
      {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "作成中..." : "ルームを作成"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useTransition } from "react";
import { deleteAccountAction } from "./actions";
import { Button } from "@/components/ui/button";

type DeleteAccountButtonProps = {
  userId: string;
  schoolId?: string;
  disabled?: boolean;
};

export function DeleteAccountButton({ userId, schoolId, disabled }: DeleteAccountButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (disabled) return;
    const confirmed = window.confirm("このアカウントを削除しますか？");
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteAccountAction({ userId, schoolId });
      if (result.status === "error" && result.message) {
        alert(result.message);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      onClick={handleClick}
      disabled={disabled || isPending}
    >
      {isPending ? "削除中..." : "削除"}
    </Button>
  );
}

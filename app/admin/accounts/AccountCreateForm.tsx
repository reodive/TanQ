"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { accountInitialState, createAccountAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/labels";

type SchoolOption = {
  id: string;
  name: string;
};

type AccountCreateFormProps = {
  schoolOptions: SchoolOption[];
  defaultSchoolId?: string;
};

const roleOptions = [
  { value: "student", label: ROLE_LABELS.student },
  { value: "responder", label: ROLE_LABELS.responder },
  { value: "schoolAdmin", label: ROLE_LABELS.schoolAdmin },
  { value: "sysAdmin", label: ROLE_LABELS.sysAdmin }
];

export function AccountCreateForm({ schoolOptions, defaultSchoolId }: AccountCreateFormProps) {
  const [state, formAction] = useFormState(createAccountAction, accountInitialState);

  useEffect(() => {
    if (state.status === "success") {
      const form = document.getElementById("account-create-form") as HTMLFormElement | null;
      form?.reset();
      if (defaultSchoolId) {
        const select = form?.querySelector("select[name=schoolId]") as HTMLSelectElement | null;
        if (select) {
          select.value = defaultSchoolId;
        }
      }
    }
  }, [state.status, defaultSchoolId]);

  return (
    <form id="account-create-form" className="space-y-4" action={formAction}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>氏名</span>
          <Input name="name" placeholder="山田 太郎" required aria-required="true" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>メールアドレス</span>
          <Input
            name="email"
            type="email"
            placeholder="tanq-admin@example.jp"
            required
            aria-required="true"
            autoComplete="off"
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>役割</span>
          <select
            name="role"
            defaultValue="student"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            aria-required="true"
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>所属学校</span>
          <select
            name="schoolId"
            defaultValue={defaultSchoolId ?? ""}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">（未設定）</option>
            {schoolOptions.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span>初期パスワード（任意）</span>
        <Input
          name="password"
          type="text"
          placeholder="未入力の場合は自動で生成します"
          minLength={8}
          autoComplete="off"
        />
      </label>
      {state.status !== "idle" && state.message && (
        <p
          className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-600"}`}
          role={state.status === "error" ? "alert" : undefined}
        >
          {state.message}
        </p>
      )}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="admin-account-submit">
      {pending ? "作成中..." : "アカウントを作成"}
    </Button>
  );
}

"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getCurrentUser } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { z } from "zod";

export type AccountActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const createAccountSchema = z.object({
  schoolId: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  name: z.string().min(1, "氏名は必須です"),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  role: z.enum(["student", "responder", "schoolAdmin", "sysAdmin"]),
  password: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined))
    .refine((value) => !value || value.length >= 8, {
      message: "パスワードは8文字以上で入力してください"
    })
});

const deleteAccountSchema = z.object({
  userId: z.string().uuid("ユーザーIDが正しくありません"),
  schoolId: z.string().optional()
});

export const accountInitialState: AccountActionState = { status: "idle" };

function createRandomPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 12; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    result += alphabet[index];
  }
  return `TanQ-${result}`;
}

export async function createAccountAction(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "sysAdmin") {
    return { status: "error", message: "権限がありません" };
  }

  const parsed = createAccountSchema.safeParse({
    schoolId: formData.get("schoolId")?.toString(),
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "",
    password: formData.get("password")?.toString()
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "入力内容を確認してください";
    return { status: "error", message: firstError };
  }

  const { schoolId, name, email, role, password } = parsed.data;

  if (role !== "sysAdmin" && !schoolId) {
    return { status: "error", message: "学校を選択してください" };
  }

  const actualPassword = password ?? createRandomPassword();
  const passwordHash = await hashPassword(actualPassword);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        schoolId: role === "sysAdmin" ? null : schoolId,
        wallet: { create: {} }
      }
    });

    if (schoolId) {
      await revalidatePath(`/admin/schools/${schoolId}`);
    }
    revalidatePath("/admin/accounts");

    const note = password
      ? "指定したパスワードでログインできます"
      : `仮パスワード: ${actualPassword}`;

    return {
      status: "success",
      message: `${user.name}さんのアカウントを作成しました。${note}`
    };
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      return { status: "error", message: "このメールアドレスは既に登録されています" };
    }
    console.error("createAccountAction error", err);
    return { status: "error", message: "アカウントの作成に失敗しました" };
  }
}

export async function deleteAccountAction(input: {
  userId: string;
  schoolId?: string;
}): Promise<AccountActionState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "sysAdmin") {
    return { status: "error", message: "権限がありません" };
  }

  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "リクエストが正しくありません";
    return { status: "error", message: firstError };
  }

  if (parsed.data.userId === admin.id) {
    return { status: "error", message: "自分自身のアカウントは削除できません" };
  }

  try {
    await prisma.user.delete({ where: { id: parsed.data.userId } });
    if (parsed.data.schoolId) {
      await revalidatePath(`/admin/schools/${parsed.data.schoolId}`);
    }
    revalidatePath("/admin/accounts");
    return { status: "success", message: "アカウントを削除しました" };
  } catch (err) {
    console.error("deleteAccountAction error", err);
    return { status: "error", message: "アカウントの削除に失敗しました" };
  }
}

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-4xl font-semibold text-brand-700">
        探究学習を加速する TanQ MVP
      </h1>
      <p className="max-w-2xl text-lg text-slate-600">
        TanQ は生徒とメンターが質問・回答・レビューを通じて学びを深めるためのオンラインキャンパスです。質問を投稿し、フォーラムで知見を共有しながら探究プロジェクトを前に進めましょう。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/auth/login"
          className="rounded-md bg-brand-600 px-6 py-3 text-white shadow hover:bg-brand-700"
        >
          ログイン
        </Link>
        <Link
          href="/auth/register"
          className="rounded-md border border-brand-600 px-6 py-3 text-brand-600 shadow hover:bg-brand-50"
        >
          新規登録
        </Link>
      </div>
    </main>
  );
}

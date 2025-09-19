import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-4xl font-semibold text-brand-700">
        ?????? MVP
      </h1>
      <p className="max-w-2xl text-lg text-slate-600">
        ??????????????????????????????????????????????????????
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/auth/login"
          className="rounded-md bg-brand-600 px-6 py-3 text-white shadow hover:bg-brand-700"
        >
          ????
        </Link>
        <Link
          href="/auth/register"
          className="rounded-md border border-brand-600 px-6 py-3 text-brand-600 shadow hover:bg-brand-50"
        >
          ????
        </Link>
      </div>
    </main>
  );
}

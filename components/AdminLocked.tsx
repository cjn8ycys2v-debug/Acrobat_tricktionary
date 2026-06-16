import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function AdminLocked({ reason }: { reason: string }) {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-4 py-12">
      <section className="rounded border border-ink/10 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded bg-coral/12 text-coral">
          <LockKeyhole aria-hidden className="size-6" />
        </div>
        <h1 className="text-2xl font-black text-ink">管理者ログインが必要です</h1>
        <p className="mt-3 text-sm leading-6 text-graphite/76">
          Supabase Authでadminロールが確認できなかったため、管理画面を表示できません。理由: {reason}
        </p>
        <Link href="/tricks" className="mt-6 inline-flex h-10 items-center rounded bg-pine px-4 text-sm font-black text-white">
          技図鑑に戻る
        </Link>
      </section>
    </main>
  );
}

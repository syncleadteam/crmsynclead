import { LoginForm } from "@/app/login/login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-sm rounded-2xl border bg-card/80 p-6 shadow-[0_20px_80px_-40px_var(--primary)] backdrop-blur">
        <div className="mb-6">
          <Image src="/synclead-logo.png" alt="SyncLead" width={150} height={57} priority className="h-auto w-36" />
          <h1 className="mt-6 text-xl font-semibold">Central SyncLead</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse sua operacao de automacoes.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}

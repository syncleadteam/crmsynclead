import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-10">
      <section className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">AI-Native CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse sua conta operacional.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}

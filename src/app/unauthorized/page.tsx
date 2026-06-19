import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-10">
      <section className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">403</p>
        <h1 className="mt-2 text-xl font-semibold">Acesso nao autorizado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu papel atual nao permite acessar esta area do CRM.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/login">Voltar ao login</Link>
        </Button>
      </section>
    </main>
  );
}

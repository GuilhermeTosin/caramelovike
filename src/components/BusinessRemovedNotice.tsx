import { ArrowLeft, Search, Store } from "lucide-react";

export default function BusinessRemovedNotice() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-12 text-foreground">
      <section
        aria-labelledby="business-removed-title"
        className="w-full max-w-xl rounded-2xl border border-border bg-card p-7 text-center shadow-sm sm:p-10"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Store className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Página indisponível</p>
        <h1 id="business-removed-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Este negócio foi removido
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
          Este endereço foi aposentado e não será direcionado para outro negócio.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href="/negocios"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Store className="h-4 w-4" aria-hidden="true" />
            Explorar negócios
          </a>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao início
          </a>
          <a
            href="/buscar"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Buscar
          </a>
        </div>
      </section>
    </main>
  );
}

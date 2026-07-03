export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-salvia-200 border-t-[#1E3A5F]" />
      <p className="text-sm text-salvia-500">Cargando…</p>
    </main>
  );
}

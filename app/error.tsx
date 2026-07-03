'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E3A5F] text-xl font-bold text-white shadow-card">GC</div>
      <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">No se pudo cargar la información.</h1>
      <p className="text-salvia-700">
        {error?.message || 'Ocurrió un error al conectar con la fuente de datos (Google Apps Script).'}
      </p>
      <p className="text-xs text-salvia-500">
        Verifica que las variables de entorno GASTROCORE_API_URL y GASTROCORE_API_TOKEN estén configuradas correctamente en el servidor (Vercel → Settings → Environment Variables).
      </p>
      <button
        onClick={() => reset()}
        className="mt-2 rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16283F]"
      >
        Reintentar
      </button>
    </main>
  );
}

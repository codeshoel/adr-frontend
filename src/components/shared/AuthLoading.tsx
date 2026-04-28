export function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-navy-500">
      <div className="text-center">
        <div className="inline-flex items-center gap-3 text-white">
          <span className="w-2 h-2 rounded-full bg-amber-adr animate-pulse" />
          <p className="text-xs uppercase tracking-widest font-bold">Authenticating…</p>
        </div>
      </div>
    </div>
  );
}

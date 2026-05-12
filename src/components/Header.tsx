export const Header = () => {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img
            src="/logo-placeholder.svg"
            alt="Example"
            className="h-8 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-slate-500">Portal de cliente</span>
            <h1 className="text-lg font-semibold text-slate-900">Prerregistro de Reembolso</h1>
          </div>
        </div>
      </div>
    </header>
  );
};

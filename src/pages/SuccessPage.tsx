import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useChat } from "../state/ChatContext";

export const SuccessPage = () => {
  const { steps, resetFlow } = useChat();
  const navigate = useNavigate();

  const handleRestart = () => {
    resetFlow();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Prerregistro completado</h2>
          <p className="mt-2 text-sm text-slate-700">
            Hemos recibido y validado correctamente todos los documentos requeridos para tu prerregistro
            de reembolso.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-800">Resumen de pasos</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {steps.map((step) => (
              <li key={step.id} className="flex items-center justify-between">
                <span>{step.title}</span>
                <span className="text-xs text-success">Completado</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => {
                // Placeholder de descarga
                alert("Descarga de comprobante no implementada en esta demo.");
              }}
            >
              Descargar comprobante
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={handleRestart}
            >
              Reiniciar trámite
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => navigate("/")}
            >
              Volver al chat
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

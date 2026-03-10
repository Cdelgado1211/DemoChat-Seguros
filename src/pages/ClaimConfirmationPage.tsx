import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useChat } from "../state/ChatContext";

interface ClaimLocationState {
  claimNumber?: string | null;
  email?: string;
}

export const ClaimConfirmationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetFlow } = useChat();

  const state = (location.state as ClaimLocationState) || {};
  const claimNumber = state.claimNumber;
  const email = state.email;

  const handleNewClaim = () => {
    resetFlow();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Solicitud enviada</h2>
          <p className="mt-2 text-sm text-slate-700">
            Tu solicitud de reembolso se envió correctamente.
          </p>
          {claimNumber && (
            <p className="mt-3 text-sm text-slate-900">
              Número de registro:{" "}
              <span className="font-semibold text-primary">{claimNumber}</span>
            </p>
          )}
          {email && (
            <p className="mt-1 text-sm text-slate-700">
              Enviaremos la confirmación y actualizaciones al correo:{" "}
              <span className="font-medium">{email}</span>.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={handleNewClaim}
            >
              Iniciar nuevo trámite
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => navigate("/")}
            >
              Volver al inicio
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

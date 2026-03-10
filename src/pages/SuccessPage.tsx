import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useChat } from "../state/ChatContext";
import { useState } from "react";
import { submitClaim } from "../services/submitClaimApi";

export const SuccessPage = () => {
  const { steps, resetFlow, completedDocuments } = useChat();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRestart = () => {
    resetFlow();
    navigate("/");
  };

  const handleSubmitClaim = async () => {
    setResultMessage(null);
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMessage("Ingresa un correo electrónico válido para continuar.");
      return;
    }

    const docsEntries = Object.entries(completedDocuments).filter(
      ([, doc]) => doc && doc.base64 && doc.filename
    ) as [string, { filename: string; base64: string }][];

    if (docsEntries.length === 0) {
      setErrorMessage("No se encontraron documentos válidos para enviar.");
      return;
    }

    const documents = docsEntries.reduce(
      (acc, [stepId, doc]) => {
        acc[stepId] = { filename: doc.filename, base64: doc.base64 };
        return acc;
      },
      {} as Record<string, { filename: string; base64: string }>
    );

    try {
      setSending(true);
      const resp = await submitClaim({
        email: trimmedEmail,
        documents
      });

      if (resp.success) {
        const claimNumber = resp.claimNumber ?? null;
        navigate("/claim-confirmation", {
          state: {
            claimNumber,
            email: trimmedEmail
          }
        });
      } else {
        setErrorMessage(
          resp.message ??
            "Ocurrió un problema al enviar tu solicitud de reembolso. Inténtalo de nuevo más tarde."
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el servicio de envío de documentos."
      );
    } finally {
      setSending(false);
    }
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
          <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm">
            <h4 className="font-semibold text-slate-900">Enviar tu registro a Allianz</h4>
            <p className="mt-1 text-slate-700">
              Para concluir, indica el correo donde quieras recibir confirmaciones del trámite y
              enviaremos los documentos a DANA.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleSubmitClaim}
                disabled={sending}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
            {errorMessage && (
              <p className="mt-2 text-xs text-danger" role="alert">
                {errorMessage}
              </p>
            )}
            {resultMessage && !errorMessage && (
              <p className="mt-2 text-xs text-success">{resultMessage}</p>
            )}
          </div>
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

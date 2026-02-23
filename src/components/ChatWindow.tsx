import { FormEvent, useRef, useState, KeyboardEvent, useEffect } from "react";
import { useChat } from "../state/ChatContext";
import { MessageBubble } from "./MessageBubble";
import { FileCard } from "./FileCard";

export const ChatWindow = () => {
  const {
    messages,
    uploads,
    uploadsHistory,
    activeStep,
    activeStepId,
    sendUserMessage,
    sendUserMessageWithFile,
    flowStarted,
    startReembolsoFlow,
    chooseOtherTopic,
    isBotTyping
  } = useChat();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const submitMessage = async () => {
    setFileError(null);

    if (!text.trim() && !file) {
      return;
    }

    if (file) {
      if (!activeStep || !activeStepId) {
        setFileError("No hay un paso activo para adjuntar el documento.");
        return;
      }

      if (!activeStep.acceptedMimeTypes.includes(file.type)) {
        setFileError("El tipo de archivo no es válido para este paso.");
        return;
      }

      const maxSizeMB = activeStep.maxSizeMB;
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setFileError(`El archivo supera el tamaño máximo permitido (${maxSizeMB} MB).`);
        return;
      }

      await sendUserMessageWithFile(text || null, file);
    } else if (text.trim()) {
      sendUserMessage(text);
    }

    setText("");
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitMessage();
  };

  const handleTextareaKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await submitMessage();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const uploadItems = uploadsHistory;

  const isValidating = uploadItems.some(
    (u) => u.status === "uploading" || u.status === "validating"
  );

  const timeline = [
    ...messages.map((m) => ({
      kind: "message" as const,
      createdAt: m.createdAt,
      message: m
    })),
    ...uploadItems.map((u) => ({
      kind: "upload" as const,
      createdAt: u.createdAt,
      upload: u
    }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length, isBotTyping]);

  return (
    <section
      aria-label="Conversación de chat para prerregistro de reembolso"
      className="flex flex-1 min-h-0 flex-col bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100"
    >
      <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-4">
        <div className="mx-auto flex h-full max-w-2xl flex-col space-y-3">
          {timeline.map((item) =>
            item.kind === "message" ? (
              <MessageBubble key={item.message.id} message={item.message} />
            ) : (
              <div
                key={`upload-${item.upload.stepId}-${item.upload.createdAt}`}
                className="flex justify-end"
              >
                <div className="max-w-[72%]">
                  <FileCard upload={item.upload} />
                </div>
              </div>
            )
          )}
          <div ref={bottomRef} />
          {isBotTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-[11px] text-slate-500 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                <span>El asistente está escribiendo…</span>
              </div>
            </div>
          )}
          {!flowStarted && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startReembolsoFlow}
                className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Reembolsos
              </button>
              <button
                type="button"
                onClick={chooseOtherTopic}
                className="inline-flex items-center rounded-full border border-border bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Otro
              </button>
            </div>
          )}
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-surface/95 px-3 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="user-message" className="sr-only">
              Escribe tu mensaje
            </label>
            <textarea
              id="user-message"
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder={
                !flowStarted
                  ? "Elige una opción para comenzar…"
                  : isValidating
                  ? "Estamos validando tu documento… espera un momento."
                  : "Escribe un mensaje para el asistente…"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={flowStarted && !isValidating ? handleTextareaKeyDown : undefined}
              disabled={!flowStarted || isValidating}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Adjuntar documento para validación"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!flowStarted || isValidating}
              >
                Adjuntar
              </button>
              {file && (
                <span className="truncate text-xs text-slate-600" aria-live="polite">
                  {file.name}
                </span>
              )}
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!flowStarted || isValidating}
            >
              Enviar
            </button>
          </div>
        </div>
        {fileError && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {fileError}
          </p>
        )}
        {isValidating && !fileError && (
          <p className="mt-1 text-xs text-slate-500">
            Estoy terminando de revisar tu documento, en cuanto finalice podrás continuar chateando.
          </p>
        )}
      </form>
    </section>
  );
};

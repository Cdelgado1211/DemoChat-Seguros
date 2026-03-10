import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { ProgressMobile } from "../components/ProgressMobile";
import { ChatWindow } from "../components/ChatWindow";
import { useChat } from "../state/ChatContext";

export const ChatFlowPage = () => {
  const { steps, activeStepId, autoRedirectToSuccess, setAutoRedirectToSuccess } = useChat();
  const navigate = useNavigate();

  useEffect(() => {
    // Consideramos que el flujo termina cuando TODOS los documentos
    // (obligatorios u opcionales) han sido resueltos, es decir, están en "done".
    // Los opcionales pueden marcarse como "done" ya sea subiendo archivo
    // o usando el botón "Omitir este documento".
    const allDone = steps.length > 0 && steps.every((s) => s.status === "done");
    if (allDone && autoRedirectToSuccess) {
      setAutoRedirectToSuccess(false);
      navigate("/success");
    }
  }, [steps, autoRedirectToSuccess, navigate, setAutoRedirectToSuccess]);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <ProgressMobile steps={steps} activeStepId={activeStepId} />
      <main className="flex flex-1 min-h-0 flex-col">
        <ChatWindow />
      </main>
    </div>
  );
};

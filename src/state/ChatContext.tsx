import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { ChatContextValue, ChatMessage } from "../types/chat";
import { chatReducer, initialChatState } from "./chatReducer";
import { buildInitialStepsState } from "../lib/stepsConfig";
import {
  getBotIntro,
  getBotMessageOnValidationFail,
  getBotMessageOnValidationOk,
  getBotPromptForStep,
  getBotReplyToUserMessage,
  splitBotTextIntoBubbles
} from "../lib/bot";
import { getOrCreateConversationId, clearConversationId } from "../lib/storage";
import { validateDocument } from "../services/validationApi";

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const createMessage = (sender: "bot" | "user", text: string, stepId?: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  sender,
  text,
  createdAt: new Date().toISOString(),
  stepId
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const setBotTyping = (typing: boolean) => {
    dispatch({ type: "SET_BOT_TYPING", payload: { typing } });
  };

  const pushMessage = (message: ChatMessage) => {
    dispatch({ type: "SEND_MESSAGE", payload: { message } });
  };

  const sendBotChunksSequentially = async (text: string, stepId?: string) => {
    const chunks = splitBotTextIntoBubbles(text);
    if (!chunks.length) return;

    setBotTyping(true);
    for (const chunk of chunks) {
      // pequeña pausa para simular que el bot está escribiendo
      // y no saturar al usuario con muchos mensajes a la vez
      await new Promise((resolve) => setTimeout(resolve, 600));
      pushMessage(createMessage("bot", chunk, stepId));
    }
    setBotTyping(false);
  };

  useEffect(() => {
    const steps = buildInitialStepsState();
    const conversationId = getOrCreateConversationId();

    const introMessages: ChatMessage[] = [];
    // mensaje de intro inicial se envía completo sin delay
    splitBotTextIntoBubbles(getBotIntro()).forEach((chunk) => {
      introMessages.push(createMessage("bot", chunk));
    });

    dispatch({
      type: "INIT",
      payload: { steps, conversationId, introMessages }
    });
  }, []);

  const activeStep = useMemo(
    () => state.steps.find((s) => s.id === state.activeStepId),
    [state.steps, state.activeStepId]
  );

  const startReembolsoFlow = () => {
    if (state.flowStarted) return;
    const firstStep = state.steps[0];

    // Registrar elección del usuario como mensaje
    const userChoice = createMessage("user", "Reembolsos", firstStep?.id);
    pushMessage(userChoice);

    dispatch({ type: "START_FLOW", payload: { topic: "reembolso" } });

    if (firstStep) {
      void sendBotChunksSequentially(getBotPromptForStep(firstStep), firstStep.id);
    }
  };

  const chooseOtherTopic = () => {
    if (state.flowStarted) return;
    const firstStep = state.steps[0];
    const userChoice = createMessage("user", "Otro", firstStep?.id);
    pushMessage(userChoice);

    const reply =
      'Todavía no se han configurado más intenciones en este asistente, pero estamos trabajando en ello. Por ahora solo puedo ayudarte con el prerregistro de reembolsos médicos.';

    void sendBotChunksSequentially(reply);
  };

  const sendUserMessage = (text: string) => {
    if (!state.flowStarted) return;
    if (!text.trim()) return;

    // Evitar que se envíen mensajes mientras un documento está en validación
    const isValidating = Object.values(state.uploads).some(
      (u) => u && (u.status === "uploading" || u.status === "validating")
    );
    if (isValidating) return;

    const msg = createMessage("user", text, state.activeStepId ?? undefined);
    pushMessage(msg);

    if (activeStep) {
      void sendBotChunksSequentially(getBotReplyToUserMessage(activeStep), activeStep.id);
    }
  };

  const sendUserMessageWithFile = async (text: string | null, file: File) => {
    // Evitar que se carguen nuevos documentos mientras uno está en validación
    const isValidating = Object.values(state.uploads).some(
      (u) => u && (u.status === "uploading" || u.status === "validating")
    );
    if (isValidating) return;

    if (!activeStep || activeStep.id !== state.activeStepId) {
      const warning = createMessage(
        "bot",
        "Solo puedes adjuntar documentos para el paso actual. Revisa el panel de progreso.",
        state.activeStepId ?? undefined
      );
      pushMessage(warning);
      return;
    }

    if (text && text.trim()) {
      const msg = createMessage("user", text, state.activeStepId ?? undefined);
      pushMessage(msg);
    }

    const upload = {
      stepId: activeStep.id,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      status: "idle" as const,
      createdAt: new Date().toISOString()
    };

    dispatch({ type: "ATTACH_FILE", payload: { upload } });
    dispatch({ type: "UPLOAD_STARTED", payload: { stepId: activeStep.id } });
    dispatch({ type: "VALIDATION_STARTED", payload: { stepId: activeStep.id } });

    const validatingMsg =
      "Estoy validando tu documento. Esto puede tardar unos segundos…";
    void sendBotChunksSequentially(validatingMsg, activeStep.id);

    try {
      const response = await validateDocument(
        activeStep.id,
        file,
        state.conversationId,
        text ?? undefined
      );

      if (response.ok) {
        dispatch({ type: "VALIDATION_OK", payload: { stepId: activeStep.id, response } });
        const okText = getBotMessageOnValidationOk(activeStep);
        await sendBotChunksSequentially(okText, activeStep.id);

        const currentIndex = state.steps.findIndex((s) => s.id === activeStep.id);
        const nextStep = state.steps.find((_, idx) => idx > currentIndex);

        if (nextStep) {
          dispatch({ type: "NEXT_STEP" });
          const nextPrompt = getBotPromptForStep(nextStep);
          await sendBotChunksSequentially(nextPrompt, nextStep.id);
        }
      } else {
        dispatch({
          type: "VALIDATION_FAIL",
          payload: {
            stepId: activeStep.id,
            issues: response.issues
          }
        });
        const failText = getBotMessageOnValidationFail(activeStep, response.issues);
        await sendBotChunksSequentially(failText, activeStep.id);
      }
    } catch (error) {
      dispatch({
        type: "VALIDATION_FAIL",
        payload: {
          stepId: activeStep.id,
          issues: [],
          errorMessage:
            error instanceof Error
              ? error.message
              : "Ocurrió un error al validar el documento. Inténtalo de nuevo."
        }
      });
      const friendly = createMessage(
        "bot",
        "Tuvimos un problema al validar tu documento (posible error de red o tiempo de espera). Por favor inténtalo nuevamente.",
        activeStep.id
      );
      pushMessage(friendly);
    }
  };

  const resetFlow = () => {
    clearConversationId();
    window.location.reload();
  };

  const value: ChatContextValue = {
    ...state,
    sendUserMessage,
    sendUserMessageWithFile,
    resetFlow,
    activeStep,
    startReembolsoFlow,
    chooseOtherTopic
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextValue => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat debe usarse dentro de ChatProvider");
  }
  return ctx;
};

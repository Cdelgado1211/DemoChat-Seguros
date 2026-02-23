import type { ChatAction, ChatState, UploadInfo } from "../types/chat";

const updateLastUploadForStep = (
  history: UploadInfo[],
  stepId: string,
  patch: Partial<UploadInfo>
): UploadInfo[] => {
  const idx = [...history].reverse().findIndex((u) => u.stepId === stepId);
  if (idx === -1) return history;
  const realIndex = history.length - 1 - idx;
  const updated = [...history];
  updated[realIndex] = { ...updated[realIndex], ...patch };
  return updated;
};

export const initialChatState: ChatState = {
  steps: [],
  activeStepId: null,
  messages: [],
  uploads: {},
  conversationId: "",
  flowStarted: false,
  topic: null,
  isBotTyping: false,
  uploadsHistory: []
};

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "INIT": {
      return {
        ...state,
        steps: action.payload.steps,
        activeStepId: action.payload.steps[0]?.id ?? null,
        messages: action.payload.introMessages,
        uploads: {},
        uploadsHistory: [],
        conversationId: action.payload.conversationId
      };
    }
    case "SEND_MESSAGE": {
      return {
        ...state,
        messages: [...state.messages, action.payload.message]
      };
    }
    case "ATTACH_FILE": {
      const upload = action.payload.upload;
      return {
        ...state,
        uploads: {
          ...state.uploads,
          [upload.stepId]: upload
        },
        uploadsHistory: [...state.uploadsHistory, upload]
      };
    }
    case "UPLOAD_STARTED": {
      const current = state.uploads[action.payload.stepId];
      if (!current) return state;
      return {
        ...state,
        uploads: {
          ...state.uploads,
          [action.payload.stepId]: {
            ...current,
            status: "uploading",
            errorMessage: undefined
          }
        },
        uploadsHistory: updateLastUploadForStep(state.uploadsHistory, action.payload.stepId, {
          status: "uploading",
          errorMessage: undefined
        })
      };
    }
    case "UPLOAD_DONE": {
      const current = state.uploads[action.payload.stepId];
      if (!current) return state;
      return {
        ...state,
        uploads: {
          ...state.uploads,
          [action.payload.stepId]: {
            ...current,
            status: "idle"
          }
        },
        uploadsHistory: updateLastUploadForStep(state.uploadsHistory, action.payload.stepId, {
          status: "idle"
        })
      };
    }
    case "VALIDATION_STARTED": {
      const current = state.uploads[action.payload.stepId];
      if (!current) return state;
      return {
        ...state,
        uploads: {
          ...state.uploads,
          [action.payload.stepId]: {
            ...current,
            status: "validating",
            errorMessage: undefined
          }
        },
        uploadsHistory: updateLastUploadForStep(state.uploadsHistory, action.payload.stepId, {
          status: "validating",
          errorMessage: undefined
        })
      };
    }
    case "VALIDATION_OK": {
      const current = state.uploads[action.payload.stepId];
      const updatedSteps = state.steps.map((s) =>
        s.id === action.payload.stepId ? { ...s, status: "done" } : s
      );
      return {
        ...state,
        steps: updatedSteps,
        uploads: {
          ...state.uploads,
          [action.payload.stepId]: current
            ? {
                ...current,
                status: "ok",
                confidence: action.payload.response.confidence,
                issues: action.payload.response.issues,
                extracted: action.payload.response.extracted
              }
            : current
        },
        uploadsHistory: updateLastUploadForStep(state.uploadsHistory, action.payload.stepId, {
          status: "ok",
          confidence: action.payload.response.confidence,
          issues: action.payload.response.issues,
          extracted: action.payload.response.extracted
        })
      };
    }
    case "VALIDATION_FAIL": {
      const current = state.uploads[action.payload.stepId];
      const updatedSteps = state.steps.map((s) =>
        s.id === action.payload.stepId ? { ...s, status: "error" } : s
      );
      return {
        ...state,
        steps: updatedSteps,
        uploads: {
          ...state.uploads,
          [action.payload.stepId]: current
            ? {
                ...current,
                status: "error",
                errorMessage: action.payload.errorMessage,
                issues: action.payload.issues
              }
            : current
        },
        uploadsHistory: updateLastUploadForStep(state.uploadsHistory, action.payload.stepId, {
          status: "error",
          errorMessage: action.payload.errorMessage,
          issues: action.payload.issues
        })
      };
    }
    case "NEXT_STEP": {
      const currentIndex = state.steps.findIndex((s) => s.id === state.activeStepId);
      if (currentIndex === -1) return state;

      const nextIndex = state.steps.findIndex((s, idx) => idx > currentIndex && s.status !== "done");

      const updatedSteps = state.steps.map((s, idx) => {
        if (idx === currentIndex && s.status === "done") {
          return s;
        }
        if (idx === nextIndex) {
          return { ...s, status: "active" };
        }
        return s;
      });

      return {
        ...state,
        steps: updatedSteps,
        activeStepId: nextIndex >= 0 ? state.steps[nextIndex].id : state.activeStepId
      };
    }
    case "RESET_STEP_FILE": {
      const uploads = { ...state.uploads };
      delete uploads[action.payload.stepId];
      return {
        ...state,
        uploads
      };
    }
    case "START_FLOW": {
      return {
        ...state,
        flowStarted: true,
        topic: action.payload.topic
      };
    }
    case "SET_BOT_TYPING": {
      return {
        ...state,
        isBotTyping: action.payload.typing
      };
    }
    default:
      return state;
  }
};

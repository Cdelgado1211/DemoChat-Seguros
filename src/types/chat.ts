import type { StepState } from "./steps";
import type { ValidationIssue, ValidationResponse } from "../services/validationApi";

export type Sender = "bot" | "user";

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  createdAt: string;
  stepId?: string;
}

export type UploadStatus = "idle" | "uploading" | "validating" | "ok" | "error";

export interface UploadInfo {
  stepId: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  status: UploadStatus;
  createdAt: string;
  errorMessage?: string;
  issues?: ValidationIssue[];
  confidence?: number;
  extracted?: ValidationResponse["extracted"];
}

export interface ChatState {
  steps: StepState[];
  activeStepId: string | null;
  messages: ChatMessage[];
  uploads: Record<string, UploadInfo | undefined>;
  uploadsHistory: UploadInfo[];
  conversationId: string;
  flowStarted: boolean;
  topic: "reembolso" | "otro" | null;
  isBotTyping: boolean;
}

export type ChatAction =
  | { type: "INIT"; payload: { steps: StepState[]; conversationId: string; introMessages: ChatMessage[] } }
  | { type: "SEND_MESSAGE"; payload: { message: ChatMessage } }
  | { type: "ATTACH_FILE"; payload: { upload: UploadInfo } }
  | { type: "UPLOAD_STARTED"; payload: { stepId: string } }
  | { type: "UPLOAD_DONE"; payload: { stepId: string } }
  | { type: "VALIDATION_STARTED"; payload: { stepId: string } }
  | { type: "VALIDATION_OK"; payload: { stepId: string; response: ValidationResponse } }
  | { type: "VALIDATION_FAIL"; payload: { stepId: string; issues: ValidationIssue[]; errorMessage?: string } }
  | { type: "NEXT_STEP" }
  | { type: "RESET_STEP_FILE"; payload: { stepId: string } }
  | { type: "START_FLOW"; payload: { topic: "reembolso" | "otro" } }
  | { type: "SET_BOT_TYPING"; payload: { typing: boolean } };

export interface ChatContextValue extends ChatState {
  sendUserMessage: (text: string) => void;
  sendUserMessageWithFile: (text: string | null, file: File) => void;
  resetFlow: () => void;
  activeStep: StepState | undefined;
  startReembolsoFlow: () => void;
  chooseOtherTopic: () => void;
}

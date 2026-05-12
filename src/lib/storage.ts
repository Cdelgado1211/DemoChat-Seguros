const CONVERSATION_KEY = "example_chat_conversation_id";

export const getOrCreateConversationId = (): string => {
  const existing = window.localStorage.getItem(CONVERSATION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(CONVERSATION_KEY, id);
  return id;
};

export const clearConversationId = () => {
  window.localStorage.removeItem(CONVERSATION_KEY);
};


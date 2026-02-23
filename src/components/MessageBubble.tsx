import type { ChatMessage } from "../types/chat";

interface Props {
  message: ChatMessage;
}

const renderTextWithBold = (text: string) => {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, lineIndex) => {
        const parts = line.split("**");
        return (
          <span key={`line-${lineIndex}`}>
            {parts.map((part, idx) =>
              idx % 2 === 1 ? (
                <strong key={`bold-${lineIndex}-${idx}`}>{part}</strong>
              ) : (
                <span key={`text-${lineIndex}-${idx}`}>{part}</span>
              )
            )}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
};

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isBot = message.sender === "bot";

  return (
    <div
      className={[
        "flex w-full gap-2",
        isBot ? "justify-start" : "justify-end"
      ].join(" ")}
    >
      {isBot && (
        <div
          className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
          aria-hidden="true"
        >
          A
        </div>
      )}
      <div
        className={[
          "max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm transition-colors",
          isBot ? "bg-white text-slate-900" : "bg-primary text-white"
        ].join(" ")}
      >
        <p>{renderTextWithBold(message.text)}</p>
        <span className="mt-1 block text-[10px] text-slate-400">
          {new Date(message.createdAt).toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </span>
      </div>
    </div>
  );
};

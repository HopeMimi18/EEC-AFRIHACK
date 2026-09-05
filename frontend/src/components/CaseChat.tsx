import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  LoaderCircle,
  MessageCircle,
  Send,
} from "lucide-react";

import {
  getCaseMessages,
  listCases,
  sendCaseMessage,
  type AuthSession,
  type CaseMessage,
} from "../lib/api";

import "./CaseChat.css";


type Props = {
  session: AuthSession;
  caseId?: string | null;
  title?: string;
  compact?: boolean;
};


function formatMessageTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}


export default function CaseChat({
  session,
  caseId,
  title = "Case communication",
  compact = false,
}: Props) {
  const [
    activeCaseId,
    setActiveCaseId,
  ] = useState<string | null>(
    caseId ?? null
  );

  const [
    messages,
    setMessages,
  ] = useState<CaseMessage[]>([]);

  const [
    draft,
    setDraft,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    if (caseId) {
      setActiveCaseId(caseId);
      return;
    }

    let cancelled = false;

    async function findLatestCase() {
      try {
        const cases =
          await listCases(
            session.access_token
          );

        if (
          !cancelled &&
          cases.length
        ) {
          setActiveCaseId(
            cases[0].case_id
          );
        }

        if (
          !cancelled &&
          !cases.length
        ) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not find a case."
          );
          setLoading(false);
        }
      }
    }

    void findLatestCase();

    return () => {
      cancelled = true;
    };
  }, [
    caseId,
    session.access_token,
  ]);

  useEffect(() => {
    if (!activeCaseId) {
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const nextMessages =
          await getCaseMessages(
            activeCaseId!,
            session.access_token
          );

        if (!cancelled) {
          setMessages(
            nextMessages
          );
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load messages."
          );
          setLoading(false);
        }
      }
    }

    void refresh();

    const timer =
      window.setInterval(
        () => {
          void refresh();
        },
        3000
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        timer
      );
    };
  }, [
    activeCaseId,
    session.access_token,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);

  const otherPartyLabel =
    session.user.role === "client"
      ? "Adviser"
      : "Client";

  const emptyText =
    session.user.role === "client"
      ? "No messages yet. Your adviser can reply through this case."
      : "No messages yet. Send the client a clear case update.";

  const canSend =
    Boolean(activeCaseId) &&
    draft.trim().length > 0 &&
    !sending;

  async function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !activeCaseId ||
      !canSend
    ) {
      return;
    }

    const body =
      draft.trim();

    setSending(true);
    setError(null);

    try {
      const message =
        await sendCaseMessage(
          activeCaseId,
          body,
          session.access_token
        );

      setMessages(
        (current) => [
          ...current,
          message,
        ]
      );
      setDraft("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  }

  const headerCaseLabel =
    useMemo(
      () =>
        activeCaseId
          ? activeCaseId
          : "No active case",
      [activeCaseId]
    );

  return (
    <section
      className={`case-chat ${
        compact
          ? "case-chat-compact"
          : ""
      }`}
    >
      <header className="case-chat-header">
        <div className="case-chat-icon">
          <MessageCircle
            size={18}
          />
        </div>

        <div>
          <span>
            {title}
          </span>
          <strong>
            {headerCaseLabel}
          </strong>
        </div>

        <div className="case-chat-live">
          <span />
          Live case chat
        </div>
      </header>

      <div className="case-chat-body">
        {loading ? (
          <div className="case-chat-state">
            <LoaderCircle
              className="case-chat-spin"
              size={20}
            />
            Loading conversation…
          </div>
        ) : !activeCaseId ? (
          <div className="case-chat-state">
            Submit a case first to
            start a conversation.
          </div>
        ) : messages.length === 0 ? (
          <div className="case-chat-empty">
            <MessageCircle
              size={25}
            />
            <strong>
              Conversation ready
            </strong>
            <span>
              {emptyText}
            </span>
          </div>
        ) : (
          <div className="case-chat-messages">
            {messages.map(
              (message) => {
                const mine =
                  message.sender_email ===
                  session.user.email;

                return (
                  <article
                    className={`case-message ${
                      mine
                        ? "mine"
                        : "theirs"
                    }`}
                    key={
                      message.message_id
                    }
                  >
                    <div className="case-message-label">
                      <strong>
                        {mine
                          ? "You"
                          : message.sender_name ||
                            otherPartyLabel}
                      </strong>
                      <span>
                        {formatMessageTime(
                          message.created_at
                        )}
                      </span>
                    </div>

                    <p>
                      {message.body}
                    </p>
                  </article>
                );
              }
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="case-chat-error">
          {error}
        </div>
      )}

      <form
        className="case-chat-composer"
        onSubmit={submit}
      >
        <input
          type="text"
          value={draft}
          disabled={
            !activeCaseId ||
            sending
          }
          maxLength={2000}
          placeholder={
            activeCaseId
              ? `Message ${otherPartyLabel.toLowerCase()}…`
              : "No active case"
          }
          onChange={(event) =>
            setDraft(
              event.target.value
            )
          }
        />

        <button
          type="submit"
          disabled={!canSend}
        >
          {sending ? (
            <LoaderCircle
              className="case-chat-spin"
              size={17}
            />
          ) : (
            <Send size={17} />
          )}
          Send
        </button>
      </form>

      <small className="case-chat-prototype-note">
        Prototype messages are stored
        in backend memory and reset
        when the backend restarts.
      </small>
    </section>
  );
}

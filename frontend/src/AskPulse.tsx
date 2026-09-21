import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  X,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import { api, type Trip } from "./types";
import "./chat.css";

type Message = { role: "user" | "model"; text: string };
type Status = { configured: boolean; model: string };
export default function AskPulse({ trip }: { trip: Trip | null }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const tripKey = `${trip?.id ?? "catalogue"}:${trip?.revision ?? 0}`;
  function reset() {
    generation.current++;
    request.current?.abort();
    setMessages([]);
    setDraft("");
    setError("");
    setFailed("");
    setBusy(false);
  }
  useEffect(() => {
    reset();
  }, [tripKey]);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    dialog.current?.showModal();
    let live = true;
    setStatus(null);
    api<Status>("/chat/status")
      .then((s) => {
        if (live) setStatus(s);
      })
      .catch(() => {
        if (live)
          setError(
            "Chat is not reachable. Restart PulseApplication in IntelliJ, then reopen Ask Pulse.",
          );
      });
    return () => {
      live = false;
    };
  }, [open]);
  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, error, open]);
  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || !status?.configured) return;
    const version = generation.current;
    const history = messages
      .slice(-8)
      .map((m) => ({ ...m, text: m.text.slice(0, 4000) }));
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setDraft("");
    setError("");
    setFailed("");
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await api<{ reply: string }>("/chat", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          message: question,
          tripId: trip?.id ?? null,
          history,
        }),
      });
      if (generation.current === version)
        setMessages((prev) => [...prev, { role: "model", text: result.reply }]);
    } catch (e) {
      if (generation.current === version) {
        setMessages((prev) => prev.slice(0, -1));
        setFailed(question);
        setDraft(question);
        setError((e as Error).message);
      }
    } finally {
      if (generation.current === version) {
        setBusy(false);
        input.current?.focus();
      }
    }
  }
  const prompts = trip
    ? [
        "Explain my trip and its budget",
        "How could I reduce walking?",
        "Suggest a cheaper alternative",
      ]
    : [
        "Where can I go birdwatching?",
        "Help me plan a family visit",
        "What cultural experiences are available?",
      ];
  return (
    <>
      <button
        className="pulse-chat-launch"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MessageCircle size={21} />
        <span>
          Ask Pulse<small>Your travel companion</small>
        </span>
        <Sparkles size={15} />
      </button>
      <dialog
        ref={dialog}
        className="pulse-chat"
        aria-labelledby="pulse-chat-title"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <header className="pulse-chat-header">
          <span className="pulse-chat-symbol">
            <Sparkles size={23} />
          </span>
          <div>
            <h2 id="pulse-chat-title">Ask Pulse</h2>
            <p>Your Chitwan travel companion</p>
          </div>
          <button
            type="button"
            aria-label="Start a new chat"
            title="Start a new chat"
            onClick={reset}
          >
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            aria-label="Close Ask Pulse"
            onClick={() => setOpen(false)}
          >
            <X size={21} />
          </button>
        </header>
        <div className="pulse-chat-context">
          <MapPin size={14} />
          <span>
            {trip
              ? `${trip.preferences.days ?? 1}-day trip · ${trip.preferences.people} travellers · sample itinerary`
              : "Exploring Bharatpur & Chitwan"}
          </span>
        </div>
        <div className="pulse-chat-body">
          {status && !status.configured && (
            <div className="pulse-chat-setup">
              <strong>Your companion is almost ready.</strong>
              <p>Live AI answers will be available once Gemini is connected.</p>
              <details>
                <summary>Setup instructions for the project team</summary>
                <p>
                  In IntelliJ → Run → Edit Configurations → PulseApplication →
                  Environment variables, add GEMINI_API_KEY and
                  GEMINI_MODEL=gemini-3.8-flash. Restart the backend, then
                  reopen this panel. Keep the key out of GitHub.
                </p>
              </details>
            </div>
          )}
          {messages.length === 0 && (
            <section className="pulse-chat-welcome">
              <span className="pulse-chat-eyebrow">
                A LITTLE LOCAL INSPIRATION
              </span>
              <h3>
                What would you
                <br />
                like to discover?
              </h3>
              <p>
                Explore places, understand your budget, or find a gentler pace
                for your trip.
              </p>
              <div className="pulse-chat-prompts">
                {prompts.map((p) => (
                  <button
                    key={p}
                    disabled={!status?.configured || busy}
                    onClick={() => send(p)}
                  >
                    {p}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
              <p className="pulse-chat-languages">English · नेपाली · हिन्दी</p>
            </section>
          )}
          <div
            role="log"
            aria-label="Conversation with Ask Pulse"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((m, i) => (
              <article key={i} className={`pulse-chat-message ${m.role}`}>
                <span>{m.role === "user" ? "You" : "Ask Pulse"}</span>
                <p>{m.text}</p>
              </article>
            ))}
          </div>
          {busy && (
            <p className="pulse-chat-thinking" role="status">
              <LoaderCircle size={15} className="pulse-chat-spin" />
              Looking through your travel context…
            </p>
          )}
          {error && (
            <div className="pulse-chat-error" role="alert">
              <p>{error}</p>
              {failed && (
                <button disabled={busy} onClick={() => send(failed)}>
                  Retry question
                </button>
              )}
            </div>
          )}
          <div ref={bottom} />
        </div>
        <footer className="pulse-chat-footer">
          <p>
            AI suggestions use sample data. Plans change only when you rebuild
            them in the planner.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <label className="pulse-chat-sr" htmlFor="pulse-question">
              Your travel question
            </label>
            <textarea
              id="pulse-question"
              ref={input}
              value={draft}
              maxLength={2000}
              rows={2}
              placeholder="Ask about your trip…"
              disabled={!status?.configured || busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send(draft);
                }
              }}
            />
            <button
              type="submit"
              aria-label="Send question"
              disabled={!status?.configured || busy || !draft.trim()}
            >
              <Send size={18} />
            </button>
          </form>
          <small>
            Messages and trip context go to Google Gemini. Avoid personal
            details. Chat stays in this page session.
          </small>
        </footer>
      </dialog>
    </>
  );
}

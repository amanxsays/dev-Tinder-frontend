import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAgenticChat } from "../hooks/useAgenticChat";

/* ------------------------------------------------------------------
   Markdown rendering, written inline so you don't need react-markdown.
   Supports: fenced code, inline code, bold, italic, links, bullets,
   numbered lists, headings, blockquotes, horizontal rules.
------------------------------------------------------------------ */

const INLINE_TOKENS = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

const Inline = ({ text }) => {
    const parts = String(text).split(INLINE_TOKENS).filter(Boolean);

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                        <strong key={i} className="font-semibold text-white">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                if (part.startsWith("`") && part.endsWith("`")) {
                    return (
                        <code
                            key={i}
                            className="mx-[1px] rounded-md border border-white/10 bg-white/[0.07] px-1.5 py-[2px] font-mono text-[12px] text-sky-300"
                        >
                            {part.slice(1, -1)}
                        </code>
                    );
                }
                if (part.startsWith("*") && part.endsWith("*")) {
                    return (
                        <em key={i} className="italic text-slate-200">
                            {part.slice(1, -1)}
                        </em>
                    );
                }
                const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                if (link) {
                    return (
                        <a
                            key={i}
                            href={link[2]}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition hover:text-sky-300"
                        >
                            {link[1]}
                        </a>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const CodeBlock = ({ code, lang }) => {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch (e) {
            /* clipboard blocked, ignore */
        }
    };

    return (
        <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-[#07080F]">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5">
                <span className="font-mono text-[11px] tracking-wide text-slate-400">
                    {lang || "code"}
                </span>
                <button
                    type="button"
                    onClick={copy}
                    className="rounded-md px-2 py-[2px] text-[11px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre className="overflow-x-auto px-3 py-2.5">
                <code className="font-mono text-[12.5px] leading-relaxed text-slate-200">
                    {code}
                </code>
            </pre>
        </div>
    );
};

const Markdown = ({ text }) => {
    const lines = String(text).split("\n");
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        /* fenced code */
        if (line.trim().startsWith("```")) {
            const lang = line.trim().slice(3).trim();
            const buffer = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                buffer.push(lines[i]);
                i++;
            }
            i++;
            blocks.push(
                <CodeBlock key={blocks.length} code={buffer.join("\n")} lang={lang} />
            );
            continue;
        }

        /* blank */
        if (!line.trim()) {
            i++;
            continue;
        }

        /* horizontal rule */
        if (/^\s*(\*\*\*|---|___)\s*$/.test(line)) {
            blocks.push(
                <div key={blocks.length} className="my-3 h-px bg-white/10" />
            );
            i++;
            continue;
        }

        /* headings */
        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length;
            const size =
                level === 1
                    ? "text-[16px]"
                    : level === 2
                    ? "text-[15px]"
                    : "text-[14px]";
            blocks.push(
                <p
                    key={blocks.length}
                    className={`mb-1.5 mt-3 font-semibold text-white first:mt-0 ${size}`}
                >
                    <Inline text={heading[2]} />
                </p>
            );
            i++;
            continue;
        }

        /* blockquote */
        if (/^\s*>\s?/.test(line)) {
            const buffer = [];
            while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
                buffer.push(lines[i].replace(/^\s*>\s?/, ""));
                i++;
            }
            blocks.push(
                <blockquote
                    key={blocks.length}
                    className="my-2.5 border-l-2 border-indigo-400/60 bg-white/[0.03] py-1.5 pl-3 text-slate-300"
                >
                    <Inline text={buffer.join(" ")} />
                </blockquote>
            );
            continue;
        }

        /* bullet list */
        if (/^\s*[-*•]\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*•]\s+/, ""));
                i++;
            }
            blocks.push(
                <ul key={blocks.length} className="my-2 space-y-1.5">
                    {items.map((item, k) => (
                        <li key={k} className="flex gap-2.5">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/80" />
                            <span className="flex-1">
                                <Inline text={item} />
                            </span>
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        /* numbered list */
        if (/^\s*\d+[.)]\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
                i++;
            }
            blocks.push(
                <ol key={blocks.length} className="my-2 space-y-1.5">
                    {items.map((item, k) => (
                        <li key={k} className="flex gap-2.5">
                            <span className="mt-[1px] w-4 shrink-0 font-mono text-[12px] text-indigo-300">
                                {k + 1}.
                            </span>
                            <span className="flex-1">
                                <Inline text={item} />
                            </span>
                        </li>
                    ))}
                </ol>
            );
            continue;
        }

        /* paragraph */
        const para = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !lines[i].trim().startsWith("```") &&
            !/^\s*[-*•]\s+/.test(lines[i]) &&
            !/^\s*\d+[.)]\s+/.test(lines[i]) &&
            !/^(#{1,4})\s+/.test(lines[i]) &&
            !/^\s*>\s?/.test(lines[i])
        ) {
            para.push(lines[i]);
            i++;
        }
        blocks.push(
            <p key={blocks.length} className="my-1.5 first:mt-0 last:mb-0">
                <Inline text={para.join(" ")} />
            </p>
        );
    }

    return <div className="text-[13.5px] leading-[1.7] text-slate-200">{blocks}</div>;
};

/* ------------------------------------------------------------------
   Agent mark
------------------------------------------------------------------ */

const AgentMark = ({ size = 30, live = false }) => (
    <div
        className="relative grid shrink-0 place-items-center rounded-full"
        style={{ width: size, height: size }}
    >
        {live && (
            <span className="absolute inset-0 rounded-full bg-indigo-500/40 ai-halo" />
        )}
        <div className="relative grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-400 shadow-[0_0_18px_-4px_rgba(99,102,241,0.9)]">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-1/2 w-1/2 text-white"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />
                <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
            </svg>
        </div>
    </div>
);

/* ------------------------------------------------------------------
   Reasoning timeline, driven by the aiStatus stream
------------------------------------------------------------------ */

const ReasoningTrail = ({ steps, partial }) => (
    <div className="ai-fade-in rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
            <AgentMark size={22} live />
            <span className="text-[12px] font-medium text-slate-300">Thinking</span>
            <span className="ml-auto font-mono text-[11px] text-slate-500">
                {steps.length} step{steps.length === 1 ? "" : "s"}
            </span>
        </div>

        <ol className="relative space-y-3 pl-6">
            <span className="absolute left-[6px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-400/60 via-indigo-400/20 to-transparent" />

            {steps.map((step, index) => {
                const active = index === steps.length - 1;
                return (
                    <li
                        key={`${step}-${index}`}
                        className="ai-step relative text-[13px] leading-snug"
                        style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
                    >
                        <span
                            className={`absolute -left-6 top-[5px] grid h-3 w-3 place-items-center rounded-full border ${
                                active
                                    ? "border-indigo-300 bg-indigo-400 ai-halo"
                                    : "border-white/20 bg-[#0B0D1A]"
                            }`}
                        >
                            {!active && (
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-2 w-2 text-emerald-400"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )}
                        </span>

                        <span className={active ? "ai-shimmer" : "text-slate-500"}>
                            {step}
                        </span>
                    </li>
                );
            })}
        </ol>

        {partial ? (
            <div className="mt-3 border-t border-white/10 pt-3">
                <Markdown text={partial} />
                <span className="ai-caret ml-[2px] inline-block h-[13px] w-[2px] translate-y-[2px] bg-indigo-300" />
            </div>
        ) : null}
    </div>
);

/* ------------------------------------------------------------------
   Layout
------------------------------------------------------------------ */

const SUGGESTIONS = [
    "Find React developers open to remote work",
    "Summarise Aman's resume",
    "Remember that I prefer backend engineers",
];

const AiDrawerLayout = ({ children }) => {
    const user = useSelector((store) => store.user);
    const msgRef = useRef(null);
    const scrollRef = useRef(null);

    const { askAiRecruiter, aiStatus, isAiThinking, aiResponse } = useAgenticChat();

    const [steps, setSteps] = useState([]);
    const [messages, setMessages] = useState([
        {
            sender: "ai",
            firstName: "DevTinder AI",
            text: "I can search candidate profiles, read resumes and remember what you are looking for. Ask me anything about your pipeline.",
            time: new Date(),
        },
    ]);

    /* the hook exposes only the current status, so keep a history of them */
    useEffect(() => {
        if (!isAiThinking || !aiStatus) return;
        setSteps((prev) =>
            prev[prev.length - 1] === aiStatus ? prev : [...prev, aiStatus]
        );
    }, [aiStatus, isAiThinking]);

    /* keep the view pinned to the newest content */
    useEffect(() => {
        const node = scrollRef.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [messages, steps, aiResponse, isAiThinking]);

    const handleTime = (time) => {
        const date = new Date(time);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    const send = async (rawText) => {
        const userText = (rawText ?? msgRef.current?.value ?? "").trim();
        if (!userText || isAiThinking) return;

        const currentUserId = user?._id || "anonymous";

        setMessages((prev) => [
            ...prev,
            {
                sender: "user",
                firstName: user?.firstName || "You",
                photoUrl: user?.photoUrl,
                text: userText,
                time: new Date(),
            },
        ]);

        if (msgRef.current) msgRef.current.value = "";
        setSteps([]);

        await askAiRecruiter(userText, currentUserId, (finalAiText) => {
            setMessages((prev) => [
                ...prev,
                {
                    sender: "ai",
                    firstName: "DevTinder AI",
                    text: finalAiText,
                    time: new Date(),
                },
            ]);
            setSteps([]);
        });
    };

    const showSuggestions = messages.length === 1 && !isAiThinking;

    return (
        <div className="drawer drawer-end h-screen">
            <style>{`
        @keyframes aiFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes aiHalo { 0% { transform: scale(1); opacity: .55; } 70% { transform: scale(1.9); opacity: 0; } 100% { opacity: 0; } }
        @keyframes aiShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes aiCaret { 0%, 45% { opacity: 1; } 50%, 100% { opacity: 0; } }

        .ai-fade-in { animation: aiFadeIn .32s cubic-bezier(.2,.7,.3,1) both; }
        .ai-step { animation: aiFadeIn .34s cubic-bezier(.2,.7,.3,1) both; }
        .ai-halo { animation: aiHalo 1.8s ease-out infinite; }
        .ai-caret { animation: aiCaret 1s steps(1) infinite; }

        .ai-shimmer {
          background: linear-gradient(90deg, #A5B4FC 0%, #FFFFFF 45%, #A5B4FC 70%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: aiShimmer 2.2s linear infinite;
        }

        .ai-scroll::-webkit-scrollbar { width: 6px; }
        .ai-scroll::-webkit-scrollbar-track { background: transparent; }
        .ai-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.10); border-radius: 999px; }
        .ai-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.20); }

        .ai-grid {
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.05) 1px, transparent 0);
          background-size: 22px 22px;
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-fade-in, .ai-step, .ai-halo, .ai-caret, .ai-shimmer { animation: none !important; }
          .ai-shimmer { color: #C7D2FE; }
        }
      `}</style>

            <input id="ai-drawer" type="checkbox" className="drawer-toggle" />

            <div className="drawer-content flex flex-col">
                {children}

                {/* Launcher */}
                <div className="fixed bottom-6 right-6 z-50">
                    <label
                        htmlFor="ai-drawer"
                        className="group grid h-14 w-14 cursor-pointer place-items-center rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 shadow-[0_10px_40px_-10px_rgba(99,102,241,.9)] transition duration-200 hover:scale-[1.06] active:scale-95"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-6 w-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
                            <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
                        </svg>
                    </label>
                </div>
            </div>

            <div className="drawer-side z-[100]">
                <label
                    htmlFor="ai-drawer"
                    aria-label="Close assistant"
                    className="drawer-overlay backdrop-blur-[2px]"
                ></label>

                <aside className="ai-grid flex h-full w-[min(430px,100vw)] flex-col border-l border-white/10 bg-[#0A0B14] text-slate-200">
                    {/* Header */}
                    <header className="relative flex items-center gap-3 border-b border-white/10 bg-gradient-to-b from-indigo-500/[0.12] to-transparent px-5 py-4">
                        <AgentMark size={38} live={isAiThinking} />
                        <div className="min-w-0">
                            <h2 className="text-[15px] font-semibold tracking-tight text-white">
                                AI Recruiter
                            </h2>
                            <p className="mt-[2px] flex items-center gap-1.5 text-[11.5px] text-slate-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.9)]" />
                                {isAiThinking ? "Working on it" : "Memory active"}
                            </p>
                        </div>
                        <label
                            htmlFor="ai-drawer"
                            className="ml-auto grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </label>
                    </header>

                    {/* Conversation */}
                    <div
                        ref={scrollRef}
                        className="ai-scroll flex-1 space-y-5 overflow-y-auto px-5 py-5"
                    >
                        {messages.map((mess, index) =>
                            mess.sender === "user" ? (
                                <div key={index} className="ai-fade-in flex justify-end">
                                    <div className="max-w-[85%]">
                                        <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2.5 text-[13.5px] leading-relaxed text-white shadow-[0_8px_24px_-12px_rgba(99,102,241,.9)]">
                                            {mess.text}
                                        </div>
                                        <div className="mt-1 text-right font-mono text-[10.5px] text-slate-500">
                                            {handleTime(mess.time)}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div key={index} className="ai-fade-in flex gap-3">
                                    <AgentMark size={28} />
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-baseline gap-2">
                                            <span className="text-[12px] font-medium text-slate-300">
                                                {mess.firstName}
                                            </span>
                                            <span className="font-mono text-[10.5px] text-slate-500">
                                                {handleTime(mess.time)}
                                            </span>
                                        </div>
                                        <div className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3">
                                            <Markdown text={mess.text} />
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {isAiThinking && (
                            <ReasoningTrail
                                steps={steps.length ? steps : ["Connecting to Agentic AI..."]}
                                partial={aiResponse}
                            />
                        )}

                        {showSuggestions && (
                            <div className="ai-fade-in space-y-2 pt-1">
                                {SUGGESTIONS.map((text) => (
                                    <button
                                        key={text}
                                        type="button"
                                        onClick={() => send(text)}
                                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left text-[13px] text-slate-300 transition hover:border-indigo-400/40 hover:bg-white/[0.07] hover:text-white"
                                    >
                                        {text}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Composer */}
                    <div className="border-t border-white/10 bg-[#0A0B14]/90 px-5 py-4 backdrop-blur">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                send();
                            }}
                            className="group flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-2 py-2 transition focus-within:border-indigo-400/60 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_3px_rgba(99,102,241,.15)]"
                        >
                            <input
                                ref={msgRef}
                                type="text"
                                autoComplete="off"
                                placeholder={
                                    isAiThinking ? "Agent is working..." : "Ask about a candidate"
                                }
                                disabled={isAiThinking}
                                className="min-w-0 flex-1 bg-transparent px-2.5 text-[13.5px] text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
                            />
                            <button
                                type="submit"
                                disabled={isAiThinking}
                                aria-label="Send message"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M5 12h13M12 5l7 7-7 7" />
                                </svg>
                            </button>
                        </form>
                        <p className="mt-2 text-center text-[10.5px] text-slate-600">
                            Answers come from candidate profiles in your database
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default AiDrawerLayout;
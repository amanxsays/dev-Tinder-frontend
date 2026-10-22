import React, { createContext, useContext, useState } from "react";
import { findResumeSource, splitResumeReferences } from "../../utils/resumeSources";
const INLINE_TOKENS = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
const ResumeReferenceContext = createContext({ sources: [], onOpenResume: () => {} });

const ResumeReferenceButton = ({ source, children, onClick }) => (
    <button type="button" onClick={() => onClick(source)} title={`View ${source.fileName}`}
        className="dt-resume-reference cursor-pointer break-all text-left text-sky-300 underline decoration-sky-400/40 underline-offset-2 transition hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
        {children}
    </button>
);

const ResumeText = ({ text }) => {
    const { sources, onOpenResume } = useContext(ResumeReferenceContext);
    return splitResumeReferences(text, sources).filter(Boolean).map((part, index) => {
        const source = findResumeSource(part, sources);
        return source ? <ResumeReferenceButton key={index} source={source} onClick={onOpenResume}>{part}</ResumeReferenceButton>
            : <React.Fragment key={index}>{part}</React.Fragment>;
    });
};

const Inline = ({ text }) => {
    const { sources, onOpenResume } = useContext(ResumeReferenceContext);
    const parts = String(text).split(INLINE_TOKENS).filter(Boolean);

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                        <strong key={i} className="font-semibold text-white">
                            <ResumeText text={part.slice(2, -2)} />
                        </strong>
                    );
                }
                if (part.startsWith("`") && part.endsWith("`")) {
                    return (
                        <code
                            key={i}
                            className="mx-[1px] rounded-md border border-white/10 bg-white/[0.07] px-1.5 py-[2px] font-mono text-[12px] text-sky-300"
                        >
                            <ResumeText text={part.slice(1, -1)} />
                        </code>
                    );
                }
                if (part.startsWith("*") && part.endsWith("*")) {
                    return (
                        <em key={i} className="italic text-slate-200">
                            <ResumeText text={part.slice(1, -1)} />
                        </em>
                    );
                }
                const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                if (link) {
                    const source = findResumeSource(link[2], sources)
                        || (!link[2].startsWith("resume:") && findResumeSource(link[1], sources));
                    if (source) {
                        return <ResumeReferenceButton key={i} source={source} onClick={onOpenResume}>{link[1]}</ResumeReferenceButton>;
                    }
                    if (!/^(https?:|mailto:)/i.test(link[2])) {
                        return <span key={i}>{link[1]}</span>;
                    }
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
                return <span key={i}><ResumeText text={part} /></span>;
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
        } catch {
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

const Markdown = ({ text, sources = [], onOpenResume = () => {} }) => {
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
        if (/^\s*[-*â€¢]\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\s*[-*â€¢]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*â€¢]\s+/, ""));
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
            !/^\s*[-*â€¢]\s+/.test(lines[i]) &&
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

    return <ResumeReferenceContext.Provider value={{ sources, onOpenResume }}>
        <div className="dt-markdown text-[13.5px] leading-[1.7] text-slate-200">{blocks}</div>
    </ResumeReferenceContext.Provider>;
};

export default Markdown;

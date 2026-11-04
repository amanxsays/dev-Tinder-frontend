import { isAndroid, NativePdf } from '../platform/platform';
import { openNativePdf, closeNativePdf } from '../platform/nativePdf';
import { useEffect, useRef, useState } from "react";
import { getResumeUrl } from "../utils/resumeSources";

const ResumePreview = ({ source, onClose }) => {
    const url = getResumeUrl(source.fileUrl);
    const [loading, setLoading] = useState(Boolean(url));
    const [failed, setFailed] = useState(false);
    const documentId = source.documentId;
    const fileName = source.fileName;
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        if (!isAndroid() || !url) return;
        let disposed = false;
        let listener;
        void NativePdf.addListener('pdfClosed', () => { if (!disposed) closeRef.current(); }).then(handle => { if (disposed) void handle.remove(); else listener = handle; });
        void openNativePdf({ fileUrl: url, documentId, fileName }).then(() => { if (!disposed) setLoading(false); }).catch(() => { if (!disposed) { setLoading(false); setFailed(true); } });
        return () => { disposed = true; void listener?.remove(); void closeNativePdf().catch(() => {}); };
    }, [url, documentId, fileName]);

    return (
        <section aria-label="Resume preview" className="absolute inset-0 z-20 flex h-full flex-col bg-[#10121C] text-slate-200 md:static md:z-auto md:min-w-0 md:flex-1">
            <header className="flex min-h-[78px] items-center gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Resume preview</p>
                    <h2 className="truncate text-sm font-semibold text-white" title={source.fileName}>{source.fileName}</h2>
                </div>
                {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-white/10 px-3 py-2 text-xs text-sky-300 hover:bg-white/5">Open in new tab</a>}
                <button type="button" autoFocus onClick={onClose} aria-label="Close resume preview" className="min-h-11 shrink-0 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/10">
                    <span className="md:hidden">Back to chat</span><span className="hidden md:inline">Close</span>
                </button>
            </header>
            {!url || failed ? (
                <div role="status" className="grid flex-1 place-content-center gap-3 p-8 text-center text-sm text-slate-400">
                    <p>{url ? "Your browser could not display this resume." : "The original file for this resume is no longer available."}</p>
                    <p>{url ? "Use Open in new tab to view or download it." : "Close this preview and refresh the conversation."}</p>
                </div>
            ) : (
                <div className="relative min-h-0 flex-1 bg-slate-200">
                    {loading && <p role="status" className="absolute inset-x-0 top-4 z-10 mx-auto w-fit rounded-lg bg-[#10121C] px-4 py-2 text-xs text-slate-300">Loading resume...</p>}
                    {isAndroid() ? <p className="p-6 text-sm text-slate-700">The resume is open in the secure Android preview.</p> : <iframe src={url} title={`Resume: ${source.fileName}`} className="h-full w-full border-0" onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} />}
                </div>
            )}
        </section>
    );
};

export default ResumePreview;

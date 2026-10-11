export const getResumeUrl = (value) => {
    try {
        const url = new URL(value);
        return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
            ? url.href : null;
    } catch {
        return null;
    }
};

export const findResumeSource = (reference, sources = []) => {
    const matches = sources.filter((source) => reference.startsWith("resume:")
        ? source.documentId === reference.slice(7)
        : source.fileName === reference || source.fileUrl === reference);
    // A filename alone must not select the wrong candidate when names collide.
    return matches.length === 1 ? matches[0] : null;
};

export const splitResumeReferences = (text, sources = []) => {
    const names = [...new Set(sources.map((source) => source.fileName).filter(Boolean))]
        .sort((a, b) => b.length - a.length)
        .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return names.length ? String(text).split(new RegExp(
        `(?<![\\p{L}\\p{N}_.-])(${names.join("|")})(?![\\p{L}\\p{N}_-]|\\.[\\p{L}\\p{N}])`, "gu")) : [String(text)];
};

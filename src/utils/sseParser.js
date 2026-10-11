// SSE fields and JSON can be split anywhere across network reads.
export const createSseParser = (onEvent) => {
    let buffer = "";
    let event = "message";
    let data = [];
    const dispatch = () => {
        if (data.length) onEvent({ event, data: data.join("\n") });
        event = "message";
        data = [];
    };
    const readLine = (line) => {
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line === "") return dispatch();
        if (line.startsWith(":")) return;
        const separator = line.indexOf(":");
        const field = separator < 0 ? line : line.slice(0, separator);
        let value = separator < 0 ? "" : line.slice(separator + 1);
        if (value.startsWith(" ")) value = value.slice(1);
        if (field === "event") event = value;
        if (field === "data") data.push(value);
    };
    return {
        push(chunk) {
            buffer += chunk;
            let end;
            while ((end = buffer.indexOf("\n")) !== -1) {
                readLine(buffer.slice(0, end));
                buffer = buffer.slice(end + 1);
            }
        },
        finish() {
            if (buffer) readLine(buffer);
            buffer = "";
            dispatch();
        },
    };
};

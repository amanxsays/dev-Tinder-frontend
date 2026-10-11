import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseParser } from '../src/utils/sseParser.js';

test('sources and multiline answers survive arbitrary network boundaries', () => {
    const sources = [{ documentId: 'one', fileName: 'Aman_Resume.pdf', fileUrl: 'https://example.test/one.pdf' }];
    const stream = `: heartbeat\r\nevent:sources\r\ndata:${JSON.stringify(sources)}\r\n\r\nevent:message\ndata:First paragraph\ndata:\ndata:  Indented line\n\n`;
    // Exercise every two-chunk split, including splitting CRLF and JSON keys.
    for (let boundary = 0; boundary <= stream.length; boundary++) {
        const received = [];
        const parser = createSseParser(event => received.push(event));
        parser.push(stream.slice(0, boundary));
        parser.push(stream.slice(boundary));
        parser.finish();
        assert.deepEqual(received, [
            { event: 'sources', data: JSON.stringify(sources) },
            { event: 'message', data: 'First paragraph\n\n Indented line' },
        ]);
    }
});

test('one-character reads preserve sources, status, and final unterminated messages', () => {
    const events = [];
    const parser = createSseParser(event => events.push(event));
    for (const char of 'event:status\ndata:Searching...\n\nevent:message\ndata:Résumé ready') parser.push(char);
    parser.finish();
    assert.deepEqual(events, [{ event: 'status', data: 'Searching...' }, { event: 'message', data: 'Résumé ready' }]);
});

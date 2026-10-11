import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import viteConfig from '../vite.config.js';

test('local API proxy forwards PATCH, DELETE, cookies and backend error responses', async () => {
    const backend = createHttpServer(async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        if (!request.headers.cookie?.includes('token=fixture-session')) {
            response.writeHead(401).end(JSON.stringify({ message: 'Session required' }));
            return;
        }
        let body = '';
        for await (const chunk of request) body += chunk;
        response.end(JSON.stringify({ method: request.method, path: request.url, body: body ? JSON.parse(body) : null }));
    });
    await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
    const previousTarget = process.env.VITE_API_URL;
    let vite;
    try {
        process.env.VITE_API_URL = `http://127.0.0.1:${backend.address().port}`;
        const config = viteConfig({ command: 'serve', mode: 'development' });
        vite = await createViteServer({ ...config, configFile: false,
            root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'silent',
            server: { ...config.server, port: 0, host: '127.0.0.1' },
        });
        await vite.listen();
        const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
        const unauthenticated = await fetch(base + '/api/profile/resume/upload-signature');
        assert.equal(unauthenticated.status, 401);
        assert.deepEqual(await unauthenticated.json(), { message: 'Session required' });
        for (const method of ['PATCH', 'DELETE']) {
            const body = method === 'PATCH' ? { resumeFileName: 'Resume.pdf' } : null;
            const response = await fetch(base + '/api/profile/resume?revision=1', { method,
                headers: { Cookie: 'token=fixture-session', 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            });
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { method, path: '/profile/resume?revision=1', body });
        }
    } finally {
        if (previousTarget === undefined) delete process.env.VITE_API_URL;
        else process.env.VITE_API_URL = previousTarget;
        if (vite) await vite.close();
        await new Promise(resolve => backend.close(resolve));
    }
});

test('integration proxy forwards chat POST and streams SSE before completion', async () => {
    let received;
    let finishStream;
    const integration = createHttpServer(async (request, response) => {
        let body = '';
        for await (const chunk of request) body += chunk;
        received = { method: request.method, path: request.url, body: JSON.parse(body) };
        response.writeHead(200, { 'Content-Type': 'text/event-stream' });
        response.write('event: status\ndata: Searching resumes\n\n');
        finishStream = () => response.end('event: message\ndata: Fixture answer\n\n');
    });
    await new Promise(resolve => integration.listen(0, '127.0.0.1', resolve));
    const previousTarget = process.env.VITE_STATS_SERVICE_URL;
    let vite;
    try {
        process.env.VITE_STATS_SERVICE_URL = `http://127.0.0.1:${integration.address().port}`;
        const config = viteConfig({ command: 'serve', mode: 'development' });
        vite = await createViteServer({ ...config, configFile: false,
            root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'silent',
            server: { ...config.server, port: 0, host: '127.0.0.1' },
        });
        await vite.listen();
        const response = await fetch(`http://127.0.0.1:${vite.httpServer.address().port}/integration-api/api/chat/stream`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'Fixture query', userId: 'fixture-user' }),
            signal: AbortSignal.timeout(5000),
        });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/event-stream/);
        assert.deepEqual(received, { method: 'POST', path: '/api/chat/stream',
            body: { query: 'Fixture query', userId: 'fixture-user' } });
        const reader = response.body.getReader();
        const first = await reader.read();
        assert.match(new TextDecoder().decode(first.value), /Searching resumes/);
        finishStream();
        let rest = '';
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            rest += new TextDecoder().decode(value);
        }
        assert.match(rest, /Fixture answer/);
    } finally {
        finishStream?.();
        if (previousTarget === undefined) delete process.env.VITE_STATS_SERVICE_URL;
        else process.env.VITE_STATS_SERVICE_URL = previousTarget;
        if (vite) await vite.close();
        await new Promise(resolve => integration.close(resolve));
    }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { speechText, speechChunks } from '../src/utils/speechText.js';

test('readable prose and descriptive links survive without Markdown or code', () => {
  const text = '# Summary\n**Aman** knows \x60React\x60.\n[View resume](resume:doc-1)\n\x60\x60\x60js\nalert("secret code")\n\x60\x60\x60\n[Portfolio](https://example.com/private)\nhttps://example.com/raw resume:internal-id\n- Strong developer';
  assert.equal(speechText(text), 'Summary Aman knows React. View resume Portfolio Strong developer');
});
test('unfinished fenced code is never read', () => {
  assert.equal(speechText('Prose.\n\x60\x60\x60java\nprivate code'), 'Prose.');
});
test('empty content yields no spoken chunks', () => {
  assert.deepEqual(speechChunks(speechText('')), []);
  assert.equal(speechText('\x60\x60\x60js\ncode\n\x60\x60\x60'), '');
});
test('long answers split without losing words and stop at natural boundaries', () => {
  const text = 'A useful sentence about React developers. '.repeat(30).trim();
  const chunks = speechChunks(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= 220));
  assert.equal(chunks.join(' '), text);
});
test('unbroken long text cannot cause an infinite splitting loop', () => {
  assert.equal(speechChunks('x'.repeat(500)).join(''), 'x'.repeat(500));
});

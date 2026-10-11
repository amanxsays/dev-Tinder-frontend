import test from 'node:test';
import assert from 'node:assert/strict';
import { findResumeSource, getResumeUrl, splitResumeReferences } from '../src/utils/resumeSources.js';

test('document IDs select the right resume even when filenames are duplicated', () => {
    const first = { documentId: 'one', fileName: 'Resume.pdf', fileUrl: 'https://example.test/one.pdf' };
    const second = { documentId: 'two', fileName: 'Resume.pdf', fileUrl: 'https://example.test/two.pdf' };
    assert.equal(findResumeSource('resume:two', [first, second]), second);
    assert.equal(findResumeSource('Resume.pdf', [first, second]), null);
    assert.equal(findResumeSource(second.fileUrl, [first, second]), second);
    assert.equal(findResumeSource('resume:missing', [first, second]), null);
});

test('plain references handle spaces, punctuation and overlapping filenames literally', () => {
    const sources = [{ fileName: 'Aman_Resume.pdf' }, { fileName: 'Resume.pdf' }, { fileName: 'CV (2)+.pdf' }];
    assert.deepEqual(splitResumeReferences('See Aman_Resume.pdf or CV (2)+.pdf.', sources),
        ['See ', 'Aman_Resume.pdf', ' or ', 'CV (2)+.pdf', '.']);
    assert.deepEqual(splitResumeReferences('ResumeXpdf', sources), ['ResumeXpdf']);
    assert.deepEqual(splitResumeReferences('OtherResume.pdf or Resume.pdf.bak', sources), ['OtherResume.pdf or Resume.pdf.bak']);
});

test('preview URLs allow web PDFs and reject executable schemes and credentials', () => {
    assert.equal(getResumeUrl('https://example.test/resume.pdf'), 'https://example.test/resume.pdf');
    for (const value of [null, undefined, '', 'javascript:alert(1)', 'data:text/html,test', '/resume.pdf', 'https://user:secret@example.test/cv.pdf']) {
        assert.equal(getResumeUrl(value), null);
    }
});

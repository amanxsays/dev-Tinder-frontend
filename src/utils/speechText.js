// Speak only already displayed content; never fetch a profile or source.
export function speechText(markdown) {
  let fenced = false;
  const prose = [];
  for (const line of String(markdown || '').split('\n')) {
    if (/^\s*(?:\x60{3}|~{3})/.test(line)) { fenced = !fenced; continue; }
    if (!fenced) prose.push(line);
  }
  return prose.join('\n')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi, ' ')
    .replace(/resume:[^\s)\]]+/gi, ' ')
    .replace(/^[ \t]*(?:#{1,6}[ \t]+|>[ \t]*|[-*+][ \t]+|\d+[.)][ \t]+)/gm, '')
    .replace(/^[ \t]*(?:---+|___+|\*\*\*+)[ \t]*$/gm, ' ')
    .replace(/[*_\x60~]/g, '')
    .replace(/\s+/g, ' ').trim();
}
export function speechChunks(text, maximum = 220) {
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > maximum) {
    const section = remaining.slice(0, maximum + 1);
    const sentence = Math.max(section.lastIndexOf('. '), section.lastIndexOf('? '), section.lastIndexOf('! '));
    const space = section.lastIndexOf(' ');
    const boundary = sentence > maximum / 3 ? sentence + 1 : space > 0 ? space : maximum;
    chunks.push(remaining.slice(0, boundary).trim());
    remaining = remaining.slice(boundary).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

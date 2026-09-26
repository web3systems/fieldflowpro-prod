import { useEffect, useRef } from 'react';
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function readRuns(root) {
  const runs = [];
  function walk(node, marks = {}) {
    if (node.nodeType === 3) { if (node.textContent) runs.push({ text: node.textContent, ...marks }); return; }
    const tag = node.tagName;
    if (tag === 'BR') { runs.push({ text: '\n' }); return; }
    const next = { ...marks, bold: marks.bold || ['B', 'STRONG'].includes(tag), italic: marks.italic || ['I', 'EM'].includes(tag), underline: marks.underline || tag === 'U' };
    if (['DIV', 'P'].includes(tag) && runs.length && !runs.at(-1).text.endsWith('\n')) runs.push({ text: '\n' });
    node.childNodes.forEach(n => walk(n, next));
  }
  root.childNodes.forEach(n => walk(n));
  return runs;
}
export default function BuilderRichText({ value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (document.activeElement === ref.current) return;
    ref.current.innerHTML = value.map(r => `${r.bold ? '<b>' : ''}${r.italic ? '<i>' : ''}${r.underline ? '<u>' : ''}${escape(r.text).replace(/\n/g, '<br>')}${r.underline ? '</u>' : ''}${r.italic ? '</i>' : ''}${r.bold ? '</b>' : ''}`).join('');
  }, [value]);
  const save = () => onChange(readRuns(ref.current));
  return <div>
    <div className="wb-tools" role="toolbar" aria-label="Text formatting">{[['bold', 'Bold'], ['italic', 'Italic'], ['underline', 'Underline']].map(([command, label]) => <button type="button" key={command} onMouseDown={e => e.preventDefault()} onClick={() => { ref.current.focus(); document.execCommand(command); save(); }}>{label}</button>)}</div>
    <div ref={ref} role="textbox" aria-label="Section content" aria-multiline="true" className="wb-copy wb-editable min-h-12" contentEditable suppressContentEditableWarning onInput={save} onBlur={save} onPaste={e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); save(); }} onDrop={e => e.preventDefault()} />
  </div>;
}
/* Execute the actual SSR-safe renderer with Node (no DOM or browser globals). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('../studynest_fe/node_modules/typescript');
const filename = path.resolve(__dirname, '../studynest_fe/src/components/shared/markdown-renderer/safe-html.ts');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const compiled = new Module(filename, module); compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename)); compiled._compile(source, filename);
const { sanitizeLearningHtml, renderLearningContent } = compiled.exports;
const parser = require(require.resolve('htmlparser2', { paths: [path.dirname(require.resolve('../studynest_fe/node_modules/sanitize-html'))] }));
function assertPassive(html) {
  const parsed = parser.parseDocument(html); const visit = node => {
    if (node.name) {
      assert.ok(!['script', 'style', 'svg', 'math', 'iframe', 'object', 'embed', 'form', 'button', 'textarea', 'template'].includes(node.name), `active tag ${node.name}`);
      for (const [name, value] of Object.entries(node.attribs || {})) {
        assert.ok(!/^on/i.test(name) && !['style', 'srcdoc', 'formaction', 'action', 'xlink:href', 'srcset', 'id', 'name'].includes(name), `unsafe attribute ${name}`);
        if (['href', 'src'].includes(name)) assert.ok(!/^(?:javascript|vbscript|data|file|blob):/i.test(value.replace(/[\x00-\x20]/g, '')) && !/^[/\\]{2}/.test(value), `unsafe URL ${value}`);
      }
    }
    (node.children || []).forEach(visit);
  }; visit(parsed);
}

test('leading raw HTML in Markdown remains escaped text', () => {
  const html = renderLearningContent('<img src=x onerror=alert(1)>');
  assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img')); assertPassive(html);
});
test('legacy HTML removes scripts, event handlers, styles, srcdoc and SVG/MathML namespaces', () => {
  const cases = [
    '<p onclick="alert(1)" style="position:fixed;inset:0">Safe text</p><script>alert(1)</script>',
    '<img src="https://example.test/image.png" onerror="alert(1)" style="background:url(javascript:alert(1))">',
    '<svg><a xlink:href="javascript:alert(1)"><text>bad</text></a><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
    '<iframe src="https://youtube.com/embed/a" srcdoc="<script>alert(1)</script>"></iframe>',
    '<object data="data:text/html,<script>alert(1)</script>"></object><embed src="javascript:alert(1)">',
    '<form action="javascript:alert(1)"><input autofocus onfocus="alert(1)"><button formaction="javascript:alert(1)">click</button></form>',
  ];
  for (const value of cases) assertPassive(renderLearningContent(value, true));
  assert.ok(renderLearningContent(cases[0], true).includes('Safe text'));
});
test('URL scheme checks reject obfuscation, protocol-relative URLs and data SVG', () => {
  for (const url of ['javascript:alert(1)', 'jav&#x61;script:alert(1)', 'java\tscript:alert(1)', 'JaVaScRiPt:alert(1)', '//attacker.test/x', '\\\\attacker.test/x', 'data:image/svg+xml,<svg onload=alert(1)>', 'file:///etc/passwd']) {
    assertPassive(sanitizeLearningHtml(`<a href="${url}">link</a><img src="${url}">`));
  }
});
test('Markdown attrs and underline placeholder cannot restore unsafe HTML', () => {
  for (const value of [
    '**hello**{onclick="alert(1)" style="position:fixed"}',
    '![image](https://example.test/x.png){onerror="alert(1)" srcdoc="bad"}',
    '__<img src=x onerror=alert(1)>__',
    '[link](javascript:alert(1))',
    '# heading {#access_token onclick=alert(1)}',
  ]) assertPassive(renderLearningContent(value));
  assert.ok(renderLearningContent('__underlined__').includes('<u>underlined</u>'));
});
test('safe course content, code and secure external links remain usable', () => {
  const html = renderLearningContent('# Tiêu đề\n\n**Đậm** và __gạch chân__\n\n```python\nprint("<safe>")\n```\n\n- [x] Đã làm\n\n![Ảnh](/logo/studynest-logo.svg)');
  assertPassive(html); assert.ok(html.includes('<h1>')); assert.ok(html.includes('<strong>Đậm</strong>')); assert.ok(html.includes('language-python')); assert.ok(html.includes('disabled')); assert.ok(html.includes('/logo/studynest-logo.svg'));
  const link = sanitizeLearningHtml('<a href="https://example.test" target="_blank" rel="opener">link</a>');
  assert.ok(link.includes('rel="noopener noreferrer"')); assertPassive(link);
  assert.equal(typeof window, 'undefined', 'renderer tests must not require a DOM');
});

test('parser failure fallback escapes untrusted text instead of rendering raw HTML', () => {
  const MarkdownIt = require('../studynest_fe/node_modules/markdown-it');
  const original = MarkdownIt.prototype.render;
  try {
    MarkdownIt.prototype.render = () => { throw new Error('simulated parser failure'); };
    const html = renderLearningContent('<img src=x onerror=alert(1)>');
    assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img')); assertPassive(html);
  } finally { MarkdownIt.prototype.render = original; }
});

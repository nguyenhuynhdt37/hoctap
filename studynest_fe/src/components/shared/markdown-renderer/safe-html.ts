import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItTaskLists from 'markdown-it-task-lists';
import sanitizeHtml from 'sanitize-html';

/** The same parser-based allowlist runs during SSR and in the browser.
 * Source HTML, Markdown attributes, and generated HTML are all untrusted.
 * No SVG/MathML/iframes, inline CSS, event handlers, arbitrary IDs, or active forms.
 */
export function sanitizeLearningHtml(html: string): string {
  return sanitizeContentHtml(html, false);
}

export function sanitizeEditableLearningHtml(html: string): string {
  return sanitizeContentHtml(html, true);
}

function sanitizeContentHtml(html: string, editable: boolean): string {
  const alignment = { 'text-align': [/^(?:left|center|right|justify)$/] };
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'strong', 'em', 'b', 'i', 'u', 's', 'del', 'br', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'colgroup', 'col', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'img', 'span', 'div', 'details', 'summary',
      'sub', 'sup', 'mark', 'kbd', 'samp', 'var', 'abbr', 'input', 'label'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'], col: ['span'], ol: ['start'],
      input: ['type', 'checked', 'disabled'], abbr: ['title'],
      ...(editable ? {
        '*': ['style'],
        ul: [{ name: 'data-type', values: ['taskList'] }],
        li: [{ name: 'data-type', values: ['taskItem'] }, { name: 'data-checked', values: ['true', 'false'] }],
      } : {}),
    },
    allowedStyles: editable ? {
      p: alignment, div: alignment, h1: alignment, h2: alignment, h3: alignment,
      h4: alignment, h5: alignment, h6: alignment,
    } : {},
    allowedClasses: {
      code: [/^language-[a-z0-9_+-]+$/i, 'hljs'], span: [/^hljs-[a-z0-9_-]+$/i],
      ul: ['contains-task-list'], li: ['task-list-item'],
      img: ['rounded-lg', 'max-w-full', 'h-auto', 'my-2', 'shadow-sm'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: editable ? ['https', 'http', 'data'] : ['https', 'http'] },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    nonTextTags: ['script', 'style', 'textarea', 'noscript', 'svg', 'math', 'iframe', 'object', 'embed', 'template', 'xmp'],
    nestingLimit: 40,
    transformTags: {
      a: (_tagName, attributes) => ({ tagName: 'a', attribs: {
        ...(attributes.href ? { href: attributes.href } : {}), ...(attributes.title ? { title: attributes.title } : {}),
        ...(attributes.target === '_blank' ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      } }),
      img: (_tagName, attributes) => ({ tagName: 'img', attribs: {
        ...(attributes.src && (
          !editable ||
          !/^\s*data:/i.test(attributes.src.replace(/[\u0000-\u0020]/g, '')) ||
          /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z\d+/]+=*$/i.test(attributes.src)
        ) ? { src: attributes.src } : {}), alt: attributes.alt || '',
        ...(attributes.title ? { title: attributes.title } : {}), loading: 'lazy',
        ...(attributes.width && /^\d{1,4}$/.test(attributes.width) ? { width: attributes.width } : {}),
        ...(attributes.height && /^\d{1,4}$/.test(attributes.height) ? { height: attributes.height } : {}),
        class: 'rounded-lg max-w-full h-auto my-2 shadow-sm',
      } }),
      input: (_tagName, attributes) => ({ tagName: 'input', attribs: { type: 'checkbox', disabled: 'disabled', ...(attributes.checked !== undefined ? { checked: 'checked' } : {}) } }),
    },
  });
}


const SUPERSCRIPT: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'i': 'ⁱ' };
const SUBSCRIPT: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋' };
const LATEX_SYMBOLS: Record<string, string> = {
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  approx: '≈', equiv: '≡', infty: '∞', pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ',
  theta: 'θ', lambda: 'λ', mu: 'μ', sigma: 'σ', omega: 'ω', Omega: 'Ω', rightarrow: '→', to: '→', Rightarrow: '⇒',
  leftarrow: '←', Leftrightarrow: '⇔', in: '∈', cup: '∪', cap: '∩', subset: '⊂', sum: 'Σ', angle: '∠', circ: '°',
  degree: '°', ldots: '…', cdots: '⋯', neg: '¬', forall: '∀', exists: '∃',
};

function mapScript(text: string, table: Record<string, string>, marker: string): string {
  return [...text].every(char => table[char]) ? [...text].map(char => table[char]).join('') : `${marker}(${text})`;
}

/** Plain-text math: converts simple LaTeX to Unicode so no extra HTML/CSS/MathML has to pass the sanitizer. */
export function latexToText(math: string): string {
  let out = math;
  for (let i = 0; i < 3; i++) {
    out = out.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_m, a: string, b: string) =>
      `${/^[\w.]+$/.test(a) ? a : `(${a})`}/${/^[\w.]+$/.test(b) ? b : `(${b})`}`);
    out = out.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_m, a: string) => (/^[\w.]+$/.test(a) ? `√${a}` : `√(${a})`));
  }
  out = out.replace(/\\sqrt\s+([\w.]+)/g, '√$1')
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:left|right|big|Big)\b\s*/g, '')
    .replace(/\\([A-Za-z]+)/g, (match: string, name: string) => LATEX_SYMBOLS[name] ?? match)
    .replace(/\^\{([^{}]*)\}/g, (_m, a: string) => mapScript(a, SUPERSCRIPT, '^'))
    .replace(/\^([0-9A-Za-z+-])/g, (_m, a: string) => SUPERSCRIPT[a] ?? `^${a}`)
    .replace(/_\{([^{}]*)\}/g, (_m, a: string) => mapScript(a, SUBSCRIPT, '_'))
    .replace(/_([0-9])/g, (_m, a: string) => SUBSCRIPT[a] ?? `_${a}`)
    .replace(/\\([%&#$_{} ,;!])/g, (_m, a: string) => (a === ',' || a === ';' || a === '!' ? ' ' : a))
    .replace(/[{}]/g, '');
  return out.replace(/\s+/g, ' ').trim();
}

/** Only `$...$`/`$$...$$` with a real LaTeX marker is converted, so prices like "$5 và $10" stay intact. */
export function convertMath(content: string): string {
  return content.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => {
    if (index % 2 === 1) return part;
    const marker = /\\[A-Za-z]|[\^_{}]/;
    return part
      .replace(/\$\$([^$]+?)\$\$/g, (match, math: string) => (marker.test(math) ? latexToText(math) : match))
      .replace(/(?<![\\$])\$([^$\n]+?)\$(?!\$)/g, (match, math: string) => (marker.test(math) ? latexToText(math) : match))
      .replace(/\\\(([^]+?)\\\)|\\\[([^]+?)\\\]/g, (_m, inline: string | undefined, block: string | undefined) => latexToText(inline ?? block ?? ''));
  }).join('');
}

const md = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: false })
  .use(markdownItTaskLists, { enabled: false, label: false })
  // All attributes are subsequently filtered by the HTML allowlist.
  .use(markdownItAttrs)
  .use(markdownItAnchor, { permalink: false });

/** A failure is escaped as text, never passed back to dangerouslySetInnerHTML. */
export function renderLearningContent(content: string, isHtml = false): string {
  if (!content?.trim()) return '';
  try {
    if (isHtml) return sanitizeLearningHtml(content);
    const underlines = new Map<string, string>();
    const processed = convertMath(content).replace(/(^|[\s([>])__(?!\*)([^_\n][^_]*?[^_\n])__(?=$|[\s\])<.,!?:;])/g,
      (_match, before: string, text: string) => {
        const placeholder = `MAYMAYUNDERLINE${underlines.size}PLACEHOLDER`;
        // The placeholder never restores raw user-controlled HTML.
        underlines.set(placeholder, `<u>${md.utils.escapeHtml(text)}</u>`);
        return before + placeholder;
      });
    let html = md.render(processed);
    for (const [placeholder, underline] of underlines) html = html.split(placeholder).join(underline);
    return sanitizeLearningHtml(html);
  } catch {
    return `<p>${md.utils.escapeHtml(content)}</p>`;
  }
}

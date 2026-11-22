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
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'strong', 'em', 'b', 'i', 'u', 's', 'del', 'br', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'colgroup', 'col', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'img', 'span', 'div', 'details', 'summary',
      'sub', 'sup', 'mark', 'kbd', 'samp', 'var', 'abbr', 'input', 'label'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'], col: ['span'], ol: ['start'],
      input: ['type', 'checked', 'disabled'], abbr: ['title'],
    },
    allowedClasses: {
      code: [/^language-[a-z0-9_+-]+$/i, 'hljs'], span: [/^hljs-[a-z0-9_-]+$/i],
      ul: ['contains-task-list'], li: ['task-list-item'],
      img: ['rounded-lg', 'max-w-full', 'h-auto', 'my-2', 'shadow-sm'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https', 'http'] },
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
        ...(attributes.src ? { src: attributes.src } : {}), alt: attributes.alt || '',
        ...(attributes.title ? { title: attributes.title } : {}), loading: 'lazy',
        ...(attributes.width && /^\d{1,4}$/.test(attributes.width) ? { width: attributes.width } : {}),
        ...(attributes.height && /^\d{1,4}$/.test(attributes.height) ? { height: attributes.height } : {}),
        class: 'rounded-lg max-w-full h-auto my-2 shadow-sm',
      } }),
      input: (_tagName, attributes) => ({ tagName: 'input', attribs: { type: 'checkbox', disabled: 'disabled', ...(attributes.checked !== undefined ? { checked: 'checked' } : {}) } }),
    },
  });
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
    const processed = content.replace(/(^|[\s([>])__(?!\*)([^_\n][^_]*?[^_\n])__(?=$|[\s\])<.,!?:;])/g,
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

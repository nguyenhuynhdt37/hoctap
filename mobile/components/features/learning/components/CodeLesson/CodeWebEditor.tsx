import React, { useEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'

interface CodeWebEditorProps {
  value: string
  language?: string
  filename?: string
  readOnly?: boolean
  isDark: boolean
  onChange: (value: string) => void
}

function getEditorLanguage(language?: string, filename?: string): string {
  const name = language?.toLowerCase() ?? ''
  const ext = filename?.split('.').pop()?.toLowerCase() ?? ''
  if (['python', 'py'].includes(name) || ext === 'py') return 'python'
  if (['javascript', 'js', 'typescript', 'ts'].includes(name) || ['js', 'ts', 'tsx', 'jsx'].includes(ext)) return 'javascript'
  if (['java'].includes(name) || ext === 'java') return 'java'
  if (['c++', 'cpp', 'c'].includes(name) || ['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'].includes(ext)) return 'cpp'
  if (['go'].includes(name) || ext === 'go') return 'go'
  if (['rust'].includes(name) || ext === 'rs') return 'rust'
  if (['json'].includes(name) || ext === 'json') return 'json'
  if (['bash', 'shell', 'sh'].includes(name) || ext === 'sh') return 'bash'
  return 'text'
}

function createEditorHTML(isDark: boolean, language: string, readOnly: boolean): string {
  const background = isDark ? '#09090b' : '#111827'
  const surface = isDark ? '#18181b' : '#111827'
  const gutter = isDark ? '#27272a' : '#1f2937'
  const text = '#d1d5db'
  const muted = '#71717a'

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: ${background};
      color: ${text};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      height: 100%;
      overflow: hidden;
    }
    .shell {
      height: 100vh;
      background: ${surface};
      display: flex;
      flex-direction: column;
    }
    .toolbar {
      height: 34px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid ${gutter};
      background: ${isDark ? '#111113' : '#0f172a'};
      color: ${muted};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .status {
      color: #10b981;
      text-transform: none;
      letter-spacing: 0;
    }
    .editor {
      flex: 1;
      display: grid;
      grid-template-columns: 48px 1fr;
      min-height: 0;
    }
    .gutter {
      background: ${isDark ? '#111113' : '#0f172a'};
      color: #52525b;
      border-right: 1px solid ${gutter};
      padding: 12px 8px;
      text-align: right;
      font: 13px/22px "SF Mono", Menlo, Consolas, monospace;
      overflow: hidden;
      user-select: none;
      white-space: pre;
    }
    .code-wrap {
      position: relative;
      min-width: 0;
      overflow: auto;
      background: ${surface};
      -webkit-overflow-scrolling: touch;
    }
    #highlight, #input {
      margin: 0;
      min-height: 100%;
      min-width: 100%;
      padding: 12px 14px;
      border: 0;
      outline: 0;
      white-space: pre;
      font: 13px/22px "SF Mono", Menlo, Consolas, monospace;
      tab-size: 2;
    }
    #highlight {
      pointer-events: none;
      color: ${text};
    }
    #input {
      position: absolute;
      inset: 0;
      resize: none;
      background: transparent;
      color: transparent;
      caret-color: #34d399;
      -webkit-text-fill-color: transparent;
      overflow: hidden;
    }
    #input::selection {
      background: rgba(16, 185, 129, .28);
    }
    .kw { color: #c084fc; }
    .str { color: #86efac; }
    .num { color: #fbbf24; }
    .com { color: #6b7280; font-style: italic; }
    .fn { color: #67e8f9; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="toolbar">
      <span>${language}</span>
      <span class="status">${readOnly ? 'Read only' : 'Editable'}</span>
    </div>
    <div class="editor">
      <pre id="lines" class="gutter">1</pre>
      <div id="scroller" class="code-wrap">
        <pre id="highlight"></pre>
        <textarea id="input" ${readOnly ? 'readonly' : ''} spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
      </div>
    </div>
  </div>
  <script>
    const input = document.getElementById('input');
    const highlight = document.getElementById('highlight');
    const lines = document.getElementById('lines');
    const scroller = document.getElementById('scroller');
    const lang = ${JSON.stringify(language)};
    let currentValue = '';

    function esc(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function keywords() {
      if (lang === 'python') return 'and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield';
      if (lang === 'java') return 'abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|new|null|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while';
      if (lang === 'cpp') return 'alignas|alignof|and|auto|bool|break|case|catch|char|class|const|constexpr|continue|default|delete|do|double|else|enum|explicit|extern|false|float|for|friend|if|inline|int|long|namespace|new|nullptr|operator|private|protected|public|return|short|signed|sizeof|static|struct|switch|template|this|throw|true|try|typedef|typename|using|virtual|void|volatile|while';
      if (lang === 'go') return 'break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var';
      if (lang === 'rust') return 'as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while';
      return 'break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield|async|await';
    }

    function paint(value) {
      let html = esc(value);
      html = html.replace(/(\\/\\/.*$|#.*$)/gm, '<span class="com">$1</span>');
      html = html.replace(/("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')/g, '<span class="str">$1</span>');
      html = html.replace(/\\b(\\d+(?:\\.\\d+)?)\\b/g, '<span class="num">$1</span>');
      html = html.replace(new RegExp('\\\\b(' + keywords() + ')\\\\b', 'g'), '<span class="kw">$1</span>');
      html = html.replace(/\\b([a-zA-Z_$][\\w$]*)(?=\\s*\\()/g, '<span class="fn">$1</span>');
      highlight.innerHTML = html + (value.endsWith('\\n') ? ' ' : '');
    }

    function updateLines(value) {
      const total = Math.max(1, value.split('\\n').length);
      lines.textContent = Array.from({ length: total }, (_, i) => String(i + 1)).join('\\n');
    }

    function setValue(value) {
      currentValue = value || '';
      input.value = currentValue;
      paint(currentValue);
      updateLines(currentValue);
    }

    input.addEventListener('input', function() {
      currentValue = input.value;
      paint(currentValue);
      updateLines(currentValue);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', value: currentValue }));
    });

    input.addEventListener('keydown', function(event) {
      if (event.key === 'Tab') {
        event.preventDefault();
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.substring(0, start) + '  ' + input.value.substring(end);
        input.selectionStart = input.selectionEnd = start + 2;
        input.dispatchEvent(new Event('input'));
      }
    });

    scroller.addEventListener('scroll', function() {
      lines.scrollTop = scroller.scrollTop;
      input.scrollTop = scroller.scrollTop;
      input.scrollLeft = scroller.scrollLeft;
    });

    window.setNativeValue = setValue;
    setValue('');
  </script>
</body>
</html>`
}

export function CodeWebEditor({
  value,
  language,
  filename,
  readOnly,
  isDark,
  onChange,
}: CodeWebEditorProps) {
  const webViewRef = useRef<WebView>(null)
  const lastValueRef = useRef(value)
  const lastFilenameRef = useRef(filename)
  const editorLanguage = getEditorLanguage(language, filename)
  const html = useMemo(() => createEditorHTML(isDark, editorLanguage, Boolean(readOnly)), [editorLanguage, isDark, readOnly])

  useEffect(() => {
    const fileChanged = filename !== lastFilenameRef.current
    if (!fileChanged && value === lastValueRef.current) return
    lastFilenameRef.current = filename
    lastValueRef.current = value
    const serialized = JSON.stringify(value ?? '')
    webViewRef.current?.injectJavaScript(`window.setNativeValue && window.setNativeValue(${serialized}); true;`)
  }, [filename, value])

  return (
    <View className="h-[520px] overflow-hidden">
      <WebView
        ref={webViewRef}
        key={`${filename ?? 'file'}-${editorLanguage}-${isDark ? 'dark' : 'light'}-${readOnly ? 'ro' : 'rw'}`}
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        androidLayerType="hardware"
        mixedContentMode="always"
        onLoadEnd={() => {
          const serialized = JSON.stringify(value ?? '')
          webViewRef.current?.injectJavaScript(`window.setNativeValue && window.setNativeValue(${serialized}); true;`)
        }}
        onMessage={(event: WebViewMessageEvent) => {
          try {
            const message = JSON.parse(event.nativeEvent.data)
            if (message?.type === 'change' && typeof message.value === 'string') {
              lastValueRef.current = message.value
              onChange(message.value)
            }
          } catch {
            // Ignore malformed bridge messages from the WebView.
          }
        }}
      />
    </View>
  )
}

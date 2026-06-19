/**
 * MarkdownRenderer - Hiển thị markdown content trên React Native
 * Dùng WebView để render HTML từ markdown (tương tự web)
 */
import React, { useMemo } from 'react'
import { StyleSheet, useColorScheme, View } from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'
import MarkdownIt from 'markdown-it'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItAttrs from 'markdown-it-attrs'

interface MarkdownRendererProps {
  content: string
  className?: string
  style?: object
  compact?: boolean
  autoHeight?: boolean
}

// CSS cho markdown - theo chuẩn NeuralEarn emerald theme
const MARKDOWN_CSS = `
* { 
  box-sizing: border-box; 
  -webkit-user-select: text;
  user-select: text;
}
body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #374151;
  line-height: 1.7;
  margin: 0;
  padding: 0 20px 40px 20px;
  text-align: justify;
  text-align-last: left;
}
h1, h2, h3, h4, h5, h6 { 
  font-weight: 700; 
  color: #065f46; 
  margin: 1em 0 0.5em 0;
  line-height: 1.3;
}
h1 { font-size: 1.75em; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25em; }
h3 { font-size: 1.25em; }
h4, h5, h6 { font-size: 1.1em; color: #059669; }
p {
  margin: 0.75em 0;
  text-align: justify;
  text-align-last: left;
}
a { color: #059669; text-decoration: underline; }
a:hover { color: #10b981; }
ul, ol { margin: 0.75em 0; padding-left: 2em; }
li { margin: 0.5em 0; }
blockquote {
  margin: 1em 0;
  padding: 0.75em 1em;
  border-left: 4px solid #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 0 0.5rem 0.5rem 0;
}
code:not(pre code) {
  background: #f3f4f6;
  color: #cd3ade;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 1.05em;
  border: 1px solid #d1fae5;
}
pre {
  margin: 1em 0;
  padding: 1em;
  background: #f0fdf4;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid #d1fae5;
}
pre code {
  background: transparent;
  color: #065f46;
  padding: 0;
  border: none;
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 1.05em;
  line-height: 1.6;
}
img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
table { width: 100%; border-collapse: collapse; margin: 1em 0; }
th, td { padding: 0.75em; border: 1px solid #e5e7eb; text-align: left; }
th { background: #f9fafb; font-weight: 700; color: #065f46; }
tr:hover { background: #f9fafb; }
hr { margin: 2em 0; border: none; border-top: 2px solid #e5e7eb; }
strong, b { font-weight: 700; color: #065f46; }
em, i { font-style: italic; }
del, s { text-decoration: line-through; color: #6b7280; }
mark { background-color: #fef08a; padding: 0.125em 0.25em; border-radius: 0.25em; }
input[type="checkbox"] { margin-right: 0.5em; accent-color: #10b981; }
`

// Markdown parser - cùng logic với web
const parseMarkdownToHTML = (markdown: string): string => {
  if (!markdown || !markdown.trim()) return ''

  // Nếu đã là HTML, return luôn
  if (markdown.trim().startsWith('<')) return markdown

  // Xử lý JSON string escape (từ AI API)
  let processedMarkdown = markdown
  if (typeof processedMarkdown === 'string' && processedMarkdown.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(processedMarkdown)
      if (parsed && typeof parsed === 'object' && parsed.topic_description) {
        processedMarkdown = parsed.topic_description
      } else if (typeof parsed === 'string') {
        processedMarkdown = parsed
      }
    } catch {
      // Giữ nguyên nếu không parse được
    }
  }

  // Normalize line breaks
  const normalized = processedMarkdown
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  // Khởi tạo markdown-it với GFM
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    typographer: false,
  })
    .use(markdownItTaskLists, { enabled: true, label: true })
    .use(markdownItAttrs)

  // Xử lý underline: __text__ -> <u>text</u>
  const U_PLACE = '___UNDERLINE_PLACEHOLDER___'
  const map = new Map<string, string>()
  let idx = 0

  const processed = normalized.replace(
    /(^|[\s([>])__(?!\*)([^_\n][^_]*?[^_\n])__(?=$|[\s\])<.,!?:;])/g,
    (_, before, content) => {
      const ph = `${U_PLACE}_${idx++}`
      map.set(ph, `<u>${content}</u>`)
      return `${before}${ph}`
    }
  )

  let html = md.render(processed)

  // Thay placeholder về underline
  for (const [ph, val] of map.entries()) {
    html = html.split(ph).join(val)
  }

  return html
}

// Tạo HTML document hoàn chỉnh
const createHTMLDocument = (content: string, darkMode: boolean, compact?: boolean): string => {
  const bgColor = darkMode ? '#09090b' : '#ffffff'
  const textColor = darkMode ? '#f4f4f5' : '#374151'
  const borderColor = darkMode ? '#27272a' : '#e5e7eb'

  let css = MARKDOWN_CSS
    .replace(/#374151/g, textColor)
    .replace(/#e5e7eb/g, borderColor)
    .replace(/#f9fafb/g, darkMode ? '#18181b' : '#f9fafb')
    .replace(/#f0fdf4/g, darkMode ? '#052e16' : '#f0fdf4')
    .replace(/#f3f4f6/g, darkMode ? '#27272a' : '#f3f4f6')
    .replace(/#d1fae5/g, darkMode ? '#14532d' : '#d1fae5')
    .replace(/body \{/, `body { background-color: ${bgColor};`)

  if (compact) {
    css += `
      body {
        padding: 0px !important;
        margin: 0 !important;
        line-height: 1.4 !important;
      }
      p {
        margin: 2px 0 !important;
      }
    `
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>${css}</style>
  <script>
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
      displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
      processEscapes: true
    },
    options: {
      ignoreHtmlClass: 'tex2jax_ignore',
      processHtmlClass: 'tex2jax_process'
    }
  };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>${content}</body>
</html>
`
}

export function MarkdownRenderer({ content, className, style, compact, autoHeight }: MarkdownRendererProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [contentHeight, setContentHeight] = React.useState(0)

  const htmlContent = useMemo(() => {
    if (!content || !content.trim()) return ''
    return parseMarkdownToHTML(content)
  }, [content])

  const fullHTML = useMemo(() => {
    if (!htmlContent) return ''
    return createHTMLDocument(htmlContent, isDark, compact)
  }, [htmlContent, isDark, compact])

  if (!content || !content.trim()) {
    return null
  }

  const webViewStyle = [
    styles.webview,
    compact ? { minHeight: 20 } : null,
    autoHeight && contentHeight > 0 ? { height: contentHeight } : null,
  ]

  if (autoHeight) {
    return (
      <View style={[styles.container, style]} className={className}>
        <WebView
          source={{ html: fullHTML }}
          style={webViewStyle}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          androidLayerType="hardware"
          mixedContentMode="always"
          originWhitelist={['*']}
          injectedJavaScript={`
            (function() {
              function postHeight() {
                var height = Math.max(
                  document.body.scrollHeight,
                  document.documentElement.scrollHeight,
                  document.body.offsetHeight,
                  document.documentElement.offsetHeight
                );
                window.ReactNativeWebView.postMessage(String(height));
              }
              postHeight();
              setTimeout(postHeight, 150);
              setTimeout(postHeight, 500);
            })();
            true;
          `}
          onMessage={(event: WebViewMessageEvent) => {
            const nextHeight = Number(event.nativeEvent.data)
            if (Number.isFinite(nextHeight) && nextHeight > 0) {
              setContentHeight(Math.ceil(nextHeight))
            }
          }}
        />
      </View>
    )
  }

  return (
    <View style={[styles.container, style]} className={className}>
      <WebView
        source={{ html: fullHTML }}
        style={webViewStyle}
        scrollEnabled={!compact}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={!compact}
        overScrollMode="always"
        androidLayerType="hardware"
        mixedContentMode="always"
        originWhitelist={['*']}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: 'transparent',
    minHeight: 50,
  },
})

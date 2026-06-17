/**
 * RichMarkdownEditor - WYSIWYG editor dùng react-native-pell-rich-editor
 * Output: HTML string (đúng format web editor để hiển thị đồng nhất)
 */
import React, { useRef } from 'react'
import {
  StyleSheet,
  View,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
} from 'react-native'
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor'

interface RichMarkdownEditorProps {
  /** Nội dung khởi tạo - có thể là HTML (từ backend) hoặc Markdown (legacy) */
  value?: string
  /** Callback - trả về HTML string để lưu lên backend */
  onChange?: (html: string) => void
  minHeight?: number
  maxHeight?: number
  editable?: boolean
  placeholder?: string
}

// Convert stored HTML → display HTML cho initialContentHTML
function prepareInitialHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

export function RichMarkdownEditor({
  value,
  onChange,
  minHeight = 200,
  maxHeight,
  placeholder,
}: RichMarkdownEditorProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<RichEditor>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Giá trị khởi tạo: nếu là HTML thì dùng trực tiếp, nếu là markdown thì convert
  const initialHtml = value
    ? (value.includes('<') ? value : prepareInitialHtml(value))
    : ''

  const handleContentChange = (html: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      // Output trực tiếp HTML - KHÔNG convert sang markdown
      onChangeRef.current?.(html)
    }, 300)
  }

  const editorStyle = isDark
    ? `
      body {
        background-color: #18181b;
        color: #fafafa;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        padding: 12px;
      }
      placeholder { color: #71717a; }
    `
    : `
      body {
        background-color: #ffffff;
        color: #27272a;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        padding: 12px;
      }
      placeholder { color: #a1a1aa; }
    `

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View
        style={[
          styles.editorContainer,
          isDark && styles.editorContainerDark,
        ]}
      >
        {/* Toolbar với các nút format */}
        <RichToolbar
          editor={editorRef}
          style={styles.toolbar}
          iconTint={isDark ? '#a1a1aa' : '#52525b'}
          selectedIconTint={isDark ? '#10b981' : '#10b981'}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.heading1,
            actions.heading2,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.blockquote,
            actions.setStrikethrough,
            actions.code,
            actions.setHR,
          ]}
          iconMap={{
            [actions.heading1]: ({ tintColor }: { tintColor: string }) => (
              <TextInput
                style={{ color: tintColor, fontSize: 14, fontWeight: '700', padding: 8 }}
                value="H1"
              />
            ),
            [actions.heading2]: ({ tintColor }: { tintColor: string }) => (
              <TextInput
                style={{ color: tintColor, fontSize: 13, fontWeight: '700', padding: 8 }}
                value="H2"
              />
            ),
          }}
        />

        {/* Editor */}
        <ScrollView
          style={{ minHeight: minHeight - 44, maxHeight: maxHeight ? maxHeight - 44 : undefined }}
          keyboardDismissMode="none"
        >
          <RichEditor
            ref={editorRef}
            style={styles.editor}
            initialHeight={minHeight - 44}
            editorStyle={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              color: isDark ? '#fafafa' : '#27272a',
              placeholderColor: '#71717a',
              caretColor: '#10b981',
              cssText: editorStyle,
              contentCSSText: 'padding: 0; margin: 0;',
            }}
            placeholder={placeholder}
            initialContentHTML={initialHtml}
            onChange={handleContentChange}
            useContainer={Platform.OS === 'ios'}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  editorContainerDark: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },
  toolbar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  editor: {
    flex: 1,
  },
})

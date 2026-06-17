"use client";

import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
// PHP and Ruby not available in CodeMirror 6, will use plain text mode
import { autocompletion } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onBlur?: () => void;
  language?: string;
  height?: string | number;
  theme?: string;
  options?: any;
  className?: string;
  style?: React.CSSProperties;
}

// Map language names to CodeMirror language extensions
const getLanguageExtension = (language: string) => {
  const langMap: Record<string, any> = {
    javascript: javascript,
    typescript: javascript,
    python: python,
    java: java,
    cpp: cpp,
    "c++": cpp,
    c: cpp,
    rust: rust,
    go: go,
    bash: null, // No CodeMirror extension, will use plain text with autocomplete
    shell: null,
    sh: null,
    kotlin: null, // No CodeMirror extension, will use plain text with autocomplete
    php: null, // No CodeMirror extension, will use plain text with autocomplete
    ruby: null, // No CodeMirror extension, will use plain text with autocomplete
    d: null, // No CodeMirror extension, will use plain text with autocomplete
    fortran: null, // No CodeMirror extension, will use plain text with autocomplete
  };
  return langMap[language.toLowerCase()] ?? null;
};

// Custom autocomplete source for C/C++
const cppAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      const completions = [
        // C/C++ keywords
        { label: "int", type: "keyword" },
        { label: "char", type: "keyword" },
        { label: "float", type: "keyword" },
        { label: "double", type: "keyword" },
        { label: "void", type: "keyword" },
        { label: "bool", type: "keyword" },
        { label: "if", type: "keyword" },
        { label: "else", type: "keyword" },
        { label: "for", type: "keyword" },
        { label: "while", type: "keyword" },
        { label: "do", type: "keyword" },
        { label: "switch", type: "keyword" },
        { label: "case", type: "keyword" },
        { label: "break", type: "keyword" },
        { label: "continue", type: "keyword" },
        { label: "return", type: "keyword" },
        { label: "const", type: "keyword" },
        { label: "static", type: "keyword" },
        { label: "struct", type: "keyword" },
        { label: "class", type: "keyword" },
        { label: "public", type: "keyword" },
        { label: "private", type: "keyword" },
        { label: "protected", type: "keyword" },
        { label: "namespace", type: "keyword" },
        { label: "using", type: "keyword" },
        { label: "include", type: "keyword" },
        // C/C++ standard library
        { label: "printf", type: "function", info: "printf(format, ...): int" },
        { label: "scanf", type: "function", info: "scanf(format, ...): int" },
        { label: "malloc", type: "function", info: "malloc(size): void*" },
        { label: "free", type: "function", info: "free(ptr): void" },
        { label: "strlen", type: "function", info: "strlen(str): size_t" },
        { label: "strcpy", type: "function", info: "strcpy(dest, src): char*" },
        { label: "strcmp", type: "function", info: "strcmp(str1, str2): int" },
        { label: "cout", type: "variable", info: "std::cout" },
        { label: "cin", type: "variable", info: "std::cin" },
        { label: "endl", type: "variable", info: "std::endl" },
        { label: "string", type: "class", info: "std::string" },
        { label: "vector", type: "class", info: "std::vector<T>" },
        { label: "map", type: "class", info: "std::map<K, V>" },
        { label: "set", type: "class", info: "std::set<T>" },
        { label: "iostream", type: "module" },
        { label: "vector", type: "module" },
        { label: "string", type: "module" },
        { label: "algorithm", type: "module" },
        { label: "cmath", type: "module" },
      ];

      return {
        from: word.from,
        options: completions.filter((c) =>
          c.label.toLowerCase().startsWith(word.text.toLowerCase())
        ),
      };
    },
  ],
});

// Custom autocomplete source for Bash/Shell
const bashAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      const completions = [
        // Bash keywords
        { label: "if", type: "keyword" },
        { label: "then", type: "keyword" },
        { label: "else", type: "keyword" },
        { label: "elif", type: "keyword" },
        { label: "fi", type: "keyword" },
        { label: "for", type: "keyword" },
        { label: "in", type: "keyword" },
        { label: "do", type: "keyword" },
        { label: "done", type: "keyword" },
        { label: "while", type: "keyword" },
        { label: "case", type: "keyword" },
        { label: "esac", type: "keyword" },
        { label: "function", type: "keyword" },
        { label: "return", type: "keyword" },
        { label: "break", type: "keyword" },
        { label: "continue", type: "keyword" },
        // Bash built-in commands
        { label: "echo", type: "function", info: "echo [options] [string...]" },
        {
          label: "printf",
          type: "function",
          info: "printf format [arguments...]",
        },
        { label: "read", type: "function", info: "read [options] variable" },
        { label: "cd", type: "function", info: "cd [directory]" },
        {
          label: "pwd",
          type: "function",
          info: "pwd: print working directory",
        },
        { label: "ls", type: "function", info: "ls [options] [file...]" },
        { label: "cat", type: "function", info: "cat [file...]" },
        {
          label: "grep",
          type: "function",
          info: "grep [options] pattern [file...]",
        },
        {
          label: "sed",
          type: "function",
          info: "sed [options] script [file...]",
        },
        {
          label: "awk",
          type: "function",
          info: "awk [options] script [file...]",
        },
        { label: "cut", type: "function", info: "cut [options] [file...]" },
        { label: "sort", type: "function", info: "sort [options] [file...]" },
        { label: "uniq", type: "function", info: "uniq [options] [file...]" },
        { label: "wc", type: "function", info: "wc [options] [file...]" },
        { label: "head", type: "function", info: "head [options] [file...]" },
        { label: "tail", type: "function", info: "tail [options] [file...]" },
        {
          label: "mkdir",
          type: "function",
          info: "mkdir [options] directory...",
        },
        { label: "rm", type: "function", info: "rm [options] file..." },
        {
          label: "rmdir",
          type: "function",
          info: "rmdir [options] directory...",
        },
        { label: "cp", type: "function", info: "cp [options] source dest" },
        { label: "mv", type: "function", info: "mv [options] source dest" },
        {
          label: "chmod",
          type: "function",
          info: "chmod [options] mode file...",
        },
        {
          label: "chown",
          type: "function",
          info: "chown [options] owner file...",
        },
        {
          label: "find",
          type: "function",
          info: "find [path...] [expression]",
        },
        { label: "which", type: "function", info: "which command" },
        { label: "whereis", type: "function", info: "whereis command" },
        { label: "test", type: "function", info: "test expression" },
        { label: "[", type: "function", info: "[ expression ]" },
        // Bash variables
        { label: "$?", type: "variable", info: "Exit status of last command" },
        { label: "$#", type: "variable", info: "Number of arguments" },
        { label: "$@", type: "variable", info: "All arguments" },
        {
          label: "$*",
          type: "variable",
          info: "All arguments as single string",
        },
        { label: "$$", type: "variable", info: "Process ID" },
        {
          label: "$!",
          type: "variable",
          info: "Process ID of last background command",
        },
        { label: "$0", type: "variable", info: "Script name" },
        { label: "$1", type: "variable", info: "First argument" },
        { label: "$2", type: "variable", info: "Second argument" },
      ];

      return {
        from: word.from,
        options: completions.filter((c) =>
          c.label.toLowerCase().startsWith(word.text.toLowerCase())
        ),
      };
    },
  ],
});

// Custom autocomplete source for JavaScript/TypeScript
const jsAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      // Built-in JavaScript/TypeScript completions
      const completions = [
        // Array methods
        {
          label: "map",
          type: "function",
          info: "map(callbackfn: (value, index, array) => U): U[]",
        },
        {
          label: "filter",
          type: "function",
          info: "filter(callbackfn: (value, index, array) => boolean): T[]",
        },
        {
          label: "reduce",
          type: "function",
          info: "reduce(callbackfn: (previousValue, currentValue, index, array) => U, initialValue): U",
        },
        {
          label: "forEach",
          type: "function",
          info: "forEach(callbackfn: (value, index, array) => void): void",
        },
        {
          label: "find",
          type: "function",
          info: "find(predicate: (value, index, array) => boolean): T | undefined",
        },
        {
          label: "findIndex",
          type: "function",
          info: "findIndex(predicate: (value, index, array) => boolean): number",
        },
        {
          label: "some",
          type: "function",
          info: "some(callbackfn: (value, index, array) => boolean): boolean",
        },
        {
          label: "every",
          type: "function",
          info: "every(callbackfn: (value, index, array) => boolean): boolean",
        },
        {
          label: "includes",
          type: "function",
          info: "includes(searchElement: T, fromIndex?: number): boolean",
        },
        {
          label: "indexOf",
          type: "function",
          info: "indexOf(searchElement: T, fromIndex?: number): number",
        },
        {
          label: "push",
          type: "function",
          info: "push(...items: T[]): number",
        },
        { label: "pop", type: "function", info: "pop(): T | undefined" },
        { label: "shift", type: "function", info: "shift(): T | undefined" },
        {
          label: "unshift",
          type: "function",
          info: "unshift(...items: T[]): number",
        },
        {
          label: "slice",
          type: "function",
          info: "slice(start?: number, end?: number): T[]",
        },
        {
          label: "splice",
          type: "function",
          info: "splice(start: number, deleteCount?: number, ...items: T[]): T[]",
        },
        {
          label: "sort",
          type: "function",
          info: "sort(compareFn?: (a: T, b: T) => number): this",
        },
        { label: "reverse", type: "function", info: "reverse(): T[]" },
        {
          label: "join",
          type: "function",
          info: "join(separator?: string): string",
        },
        {
          label: "concat",
          type: "function",
          info: "concat(...items: (T | ConcatArray<T>)[]): T[]",
        },
        // Console methods
        {
          label: "console.log",
          type: "function",
          info: "console.log(...data: any[]): void",
        },
        {
          label: "console.error",
          type: "function",
          info: "console.error(...data: any[]): void",
        },
        {
          label: "console.warn",
          type: "function",
          info: "console.warn(...data: any[]): void",
        },
        {
          label: "console.info",
          type: "function",
          info: "console.info(...data: any[]): void",
        },
        // Common keywords
        { label: "function", type: "keyword" },
        { label: "const", type: "keyword" },
        { label: "let", type: "keyword" },
        { label: "var", type: "keyword" },
        { label: "if", type: "keyword" },
        { label: "else", type: "keyword" },
        { label: "for", type: "keyword" },
        { label: "while", type: "keyword" },
        { label: "return", type: "keyword" },
        { label: "class", type: "keyword" },
        { label: "async", type: "keyword" },
        { label: "await", type: "keyword" },
        { label: "Promise", type: "class" },
        { label: "Array", type: "class" },
        { label: "Object", type: "class" },
        { label: "String", type: "class" },
        { label: "Number", type: "class" },
        { label: "Boolean", type: "class" },
        { label: "Date", type: "class" },
        { label: "Math", type: "class" },
        { label: "JSON", type: "class" },
      ];

      return {
        from: word.from,
        options: completions.filter((c) =>
          c.label.toLowerCase().startsWith(word.text.toLowerCase())
        ),
      };
    },
  ],
});

// Custom autocomplete source for Kotlin
const kotlinAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      const completions = [
        { label: "fun", type: "keyword" },
        { label: "val", type: "keyword" },
        { label: "var", type: "keyword" },
        { label: "class", type: "keyword" },
        { label: "interface", type: "keyword" },
        { label: "object", type: "keyword" },
        { label: "enum", type: "keyword" },
        { label: "data", type: "keyword" },
        { label: "sealed", type: "keyword" },
        { label: "open", type: "keyword" },
        { label: "abstract", type: "keyword" },
        { label: "private", type: "keyword" },
        { label: "protected", type: "keyword" },
        { label: "public", type: "keyword" },
        { label: "internal", type: "keyword" },
        { label: "if", type: "keyword" },
        { label: "else", type: "keyword" },
        { label: "when", type: "keyword" },
        { label: "for", type: "keyword" },
        { label: "while", type: "keyword" },
        { label: "do", type: "keyword" },
        { label: "break", type: "keyword" },
        { label: "continue", type: "keyword" },
        { label: "return", type: "keyword" },
        { label: "try", type: "keyword" },
        { label: "catch", type: "keyword" },
        { label: "finally", type: "keyword" },
        { label: "throw", type: "keyword" },
        { label: "null", type: "keyword" },
        { label: "true", type: "keyword" },
        { label: "false", type: "keyword" },
        { label: "this", type: "keyword" },
        { label: "super", type: "keyword" },
        { label: "is", type: "keyword" },
        { label: "as", type: "keyword" },
        { label: "in", type: "keyword" },
        {
          label: "println",
          type: "function",
          info: "println(message: Any?): Unit",
        },
        {
          label: "print",
          type: "function",
          info: "print(message: Any?): Unit",
        },
        { label: "readLine", type: "function", info: "readLine(): String?" },
        {
          label: "listOf",
          type: "function",
          info: "listOf(vararg elements: T): List<T>",
        },
        {
          label: "mutableListOf",
          type: "function",
          info: "mutableListOf(vararg elements: T): MutableList<T>",
        },
        {
          label: "mapOf",
          type: "function",
          info: "mapOf(vararg pairs: Pair<K, V>): Map<K, V>",
        },
        {
          label: "setOf",
          type: "function",
          info: "setOf(vararg elements: T): Set<T>",
        },
        {
          label: "arrayOf",
          type: "function",
          info: "arrayOf(vararg elements: T): Array<T>",
        },
        { label: "Int", type: "class" },
        { label: "String", type: "class" },
        { label: "Boolean", type: "class" },
        { label: "Double", type: "class" },
        { label: "Float", type: "class" },
        { label: "Long", type: "class" },
        { label: "List", type: "class" },
        { label: "Map", type: "class" },
        { label: "Set", type: "class" },
        { label: "Array", type: "class" },
      ];

      return {
        from: word.from,
        options: completions.filter((c) =>
          c.label.toLowerCase().startsWith(word.text.toLowerCase())
        ),
      };
    },
  ],
});

// Custom autocomplete source for PHP
const phpAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      const completions = [
        { label: "<?php", type: "keyword" },
        { label: "function", type: "keyword" },
        { label: "class", type: "keyword" },
        { label: "interface", type: "keyword" },
        { label: "trait", type: "keyword" },
        { label: "namespace", type: "keyword" },
        { label: "use", type: "keyword" },
        { label: "if", type: "keyword" },
        { label: "else", type: "keyword" },
        { label: "elseif", type: "keyword" },
        { label: "for", type: "keyword" },
        { label: "foreach", type: "keyword" },
        { label: "while", type: "keyword" },
        { label: "do", type: "keyword" },
        { label: "switch", type: "keyword" },
        { label: "case", type: "keyword" },
        { label: "break", type: "keyword" },
        { label: "continue", type: "keyword" },
        { label: "return", type: "keyword" },
        { label: "public", type: "keyword" },
        { label: "private", type: "keyword" },
        { label: "protected", type: "keyword" },
        { label: "static", type: "keyword" },
        { label: "const", type: "keyword" },
        { label: "true", type: "keyword" },
        { label: "false", type: "keyword" },
        { label: "null", type: "keyword" },
        {
          label: "echo",
          type: "function",
          info: "echo(string ...$expressions): void",
        },
        {
          label: "print",
          type: "function",
          info: "print(string $expression): int",
        },
        {
          label: "var_dump",
          type: "function",
          info: "var_dump(mixed ...$values): void",
        },
        {
          label: "print_r",
          type: "function",
          info: "print_r(mixed $value, bool $return = false): mixed",
        },
        {
          label: "strlen",
          type: "function",
          info: "strlen(string $string): int",
        },
        {
          label: "strpos",
          type: "function",
          info: "strpos(string $haystack, string $needle, int $offset = 0): int|false",
        },
        {
          label: "substr",
          type: "function",
          info: "substr(string $string, int $offset, ?int $length = null): string",
        },
        {
          label: "array",
          type: "function",
          info: "array(mixed ...$values): array",
        },
        {
          label: "count",
          type: "function",
          info: "count(Countable|array $value, int $mode = COUNT_NORMAL): int",
        },
        {
          label: "isset",
          type: "function",
          info: "isset(mixed $var, mixed ...$vars): bool",
        },
        { label: "empty", type: "function", info: "empty(mixed $var): bool" },
        {
          label: "array_push",
          type: "function",
          info: "array_push(array &$array, mixed ...$values): int",
        },
        {
          label: "array_pop",
          type: "function",
          info: "array_pop(array &$array): mixed",
        },
      ];

      return {
        from: word.from,
        options: completions.filter((c) =>
          c.label.toLowerCase().startsWith(word.text.toLowerCase())
        ),
      };
    },
  ],
});

// Custom autocomplete source for Ruby
const rubyAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      const completions = [
        { label: "def", type: "keyword" },
        { label: "class", type: "keyword" },
        { label: "module", type: "keyword" },
        { label: "end", type: "keyword" },
        { label: "if", type: "keyword" },
        { label: "elsif", type: "keyword" },
        { label: "else", type: "keyword" },
        { label: "unless", type: "keyword" },
        { label: "case", type: "keyword" },
        { label: "when", type: "keyword" },
        { label: "for", type: "keyword" },
        { label: "while", type: "keyword" },
        { label: "until", type: "keyword" },
        { label: "do", type: "keyword" },
        { label: "break", type: "keyword" },
        { label: "next", type: "keyword" },
        { label: "return", type: "keyword" },
        { label: "yield", type: "keyword" },
        { label: "self", type: "keyword" },
        { label: "nil", type: "keyword" },
        { label: "true", type: "keyword" },
        { label: "false", type: "keyword" },
        { label: "require", type: "keyword" },
        { label: "include", type: "keyword" },
        { label: "extend", type: "keyword" },
        { label: "puts", type: "function", info: "puts(obj, ...) -> nil" },
        { label: "print", type: "function", info: "print(obj, ...) -> nil" },
        { label: "p", type: "function", info: "p(obj) -> obj" },
        {
          label: "gets",
          type: "function",
          info: "gets(sep=$/) -> string or nil",
        },
        {
          label: "chomp",
          type: "function",
          info: "chomp(separator=$/) -> new_str",
        },
        { label: "length", type: "function", info: "length -> integer" },
        { label: "size", type: "function", info: "size -> integer" },
        {
          label: "each",
          type: "function",
          info: "each { |item| block } -> self",
        },
        {
          label: "map",
          type: "function",
          info: "map { |item| block } -> array",
        },
        {
          label: "select",
          type: "function",
          info: "select { |item| block } -> array",
        },
        {
          label: "reject",
          type: "function",
          info: "reject { |item| block } -> array",
        },
        {
          label: "reduce",
          type: "function",
          info: "reduce(initial, sym) -> obj",
        },
        { label: "sort", type: "function", info: "sort -> array" },
        { label: "reverse", type: "function", info: "reverse -> array" },
        { label: "join", type: "function", info: "join(separator=$,) -> str" },
        {
          label: "split",
          type: "function",
          info: "split(pattern=$;, [limit]) -> array",
        },
      ];

      return {
        from: word.from,
        options: completions.filter((c) =>
          c.label.toLowerCase().startsWith(word.text.toLowerCase())
        ),
      };
    },
  ],
});

// Custom autocomplete source for D
const dAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      const completions = [
        { label: "import", type: "keyword" },
        { label: "module", type: "keyword" },
        { label: "class", type: "keyword" },
        { label: "struct", type: "keyword" },
        { label: "interface", type: "keyword" },
        { label: "enum", type: "keyword" },
        { label: "union", type: "keyword" },
        { label: "alias", type: "keyword" },
        { label: "template", type: "keyword" },
        { label: "mixin", type: "keyword" },
        { label: "if", type: "keyword" },
        { label: "else", type: "keyword" },
        { label: "for", type: "keyword" },
        { label: "foreach", type: "keyword" },
        { label: "while", type: "keyword" },
        { label: "do", type: "keyword" },
        { label: "switch", type: "keyword" },
        { label: "case", type: "keyword" },
        { label: "default", type: "keyword" },
        { label: "break", type: "keyword" },
        { label: "continue", type: "keyword" },
        { label: "return", type: "keyword" },
        { label: "goto", type: "keyword" },
        { label: "public", type: "keyword" },
        { label: "private", type: "keyword" },
        { label: "protected", type: "keyword" },
        { label: "package", type: "keyword" },
        { label: "export", type: "keyword" },
        { label: "const", type: "keyword" },
        { label: "immutable", type: "keyword" },
        { label: "shared", type: "keyword" },
        { label: "inout", type: "keyword" },
        { label: "ref", type: "keyword" },
        { label: "auto", type: "keyword" },
        { label: "void", type: "keyword" },
        { label: "bool", type: "keyword" },
        { label: "byte", type: "keyword" },
        { label: "ubyte", type: "keyword" },
        { label: "short", type: "keyword" },
        { label: "ushort", type: "keyword" },
        { label: "int", type: "keyword" },
        { label: "uint", type: "keyword" },
        { label: "long", type: "keyword" },
        { label: "ulong", type: "keyword" },
        { label: "float", type: "keyword" },
        { label: "double", type: "keyword" },
        { label: "real", type: "keyword" },
        { label: "char", type: "keyword" },
        { label: "wchar", type: "keyword" },
        { label: "dchar", type: "keyword" },
        { label: "string", type: "keyword" },
        { label: "wstring", type: "keyword" },
        { label: "dstring", type: "keyword" },
        { label: "writeln", type: "function", info: "writeln(args...)" },
        { label: "write", type: "function", info: "write(args...)" },
        { label: "readln", type: "function", info: "readln()" },
        { label: "stdin", type: "variable" },
        { label: "stdout", type: "variable" },
        { label: "stderr", type: "variable" },
      ];

      return {
        from: word.from,
        options: completions.filter((c) =>
          c.label.toLowerCase().startsWith(word.text.toLowerCase())
        ),
      };
    },
  ],
});

// Custom autocomplete source for Fortran
const fortranAutocomplete = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      const completions = [
        { label: "program", type: "keyword" },
        { label: "end", type: "keyword" },
        { label: "subroutine", type: "keyword" },
        { label: "function", type: "keyword" },
        { label: "module", type: "keyword" },
        { label: "use", type: "keyword" },
        { label: "implicit", type: "keyword" },
        { label: "none", type: "keyword" },
        { label: "integer", type: "keyword" },
        { label: "real", type: "keyword" },
        { label: "double", type: "keyword" },
        { label: "precision", type: "keyword" },
        { label: "complex", type: "keyword" },
        { label: "logical", type: "keyword" },
        { label: "character", type: "keyword" },
        { label: "dimension", type: "keyword" },
        { label: "allocatable", type: "keyword" },
        { label: "parameter", type: "keyword" },
        { label: "intent", type: "keyword" },
        { label: "in", type: "keyword" },
        { label: "out", type: "keyword" },
        { label: "inout", type: "keyword" },
        { label: "if", type: "keyword" },
        { label: "then", type: "keyword" },
        { label: "else", type: "keyword" },
        { label: "elseif", type: "keyword" },
        { label: "endif", type: "keyword" },
        { label: "do", type: "keyword" },
        { label: "while", type: "keyword" },
        { label: "enddo", type: "keyword" },
        { label: "select", type: "keyword" },
        { label: "case", type: "keyword" },
        { label: "default", type: "keyword" },
        { label: "endselect", type: "keyword" },
        { label: "call", type: "keyword" },
        { label: "return", type: "keyword" },
        { label: "stop", type: "keyword" },
        { label: "print", type: "function", info: "print format, list" },
        { label: "write", type: "function", info: "write(unit, format) list" },
        { label: "read", type: "function", info: "read(unit, format) list" },
        {
          label: "open",
          type: "function",
          info: "open(unit, file=filename, ...)",
        },
        { label: "close", type: "function", info: "close(unit)" },
        {
          label: "allocate",
          type: "function",
          info: "allocate(array(dims), stat=ierr)",
        },
        {
          label: "deallocate",
          type: "function",
          info: "deallocate(array, stat=ierr)",
        },
      ];

      return {
        from: word.from,
        options: completions.filter((c) =>
          c.label.toLowerCase().startsWith(word.text.toLowerCase())
        ),
      };
    },
  ],
});

const CodeEditor = ({
  value,
  onChange,
  onBlur,
  language = "plaintext",
  height = "100%",
  theme = "vs",
  options,
  className = "",
  style,
}: CodeEditorProps) => {
  const [extensions, setExtensions] = useState<any[]>([]);

  useEffect(() => {
    const langExtension = getLanguageExtension(language);
    const baseExtensions: any[] = [
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),
    ];

    // Add language extension
    if (langExtension) {
      baseExtensions.push(langExtension());
    }

    // Add autocomplete based on language
    // Note: CodeMirror's javascript() extension already includes:
    // - Built-in snippets (snippets for JS, typescriptSnippets for TS)
    // - Local variable completion
    // We add custom completions as additional sources
    const langLower = language.toLowerCase();
    if (langLower === "javascript" || langLower === "typescript") {
      // JavaScript/TypeScript: Built-in snippets + local vars are already included
      // Add custom completions for Array methods, console, etc.
      baseExtensions.push(jsAutocomplete);
    } else if (
      langLower === "cpp" ||
      langLower === "c++" ||
      langLower === "c"
    ) {
      baseExtensions.push(cppAutocomplete);
    } else if (
      langLower === "bash" ||
      langLower === "shell" ||
      langLower === "sh"
    ) {
      baseExtensions.push(bashAutocomplete);
    } else if (langLower === "kotlin") {
      baseExtensions.push(kotlinAutocomplete);
    } else if (langLower === "php") {
      baseExtensions.push(phpAutocomplete);
    } else if (langLower === "ruby") {
      baseExtensions.push(rubyAutocomplete);
    } else if (langLower === "d") {
      baseExtensions.push(dAutocomplete);
    } else if (langLower === "fortran") {
      baseExtensions.push(fortranAutocomplete);
    }

    // Add autocomplete for all languages (word-based)
    baseExtensions.push(
      autocompletion({
        activateOnTyping: true,
        maxRenderedOptions: 10,
      })
    );

    // Add theme
    if (theme === "vs-dark" || theme === "dark") {
      baseExtensions.push(oneDark);
    }

    // Add custom options
    if (options?.minimap?.enabled === false) {
      // Minimal mode - no special extensions needed
    }

    setExtensions(baseExtensions);
  }, [language, theme, options]);

  // Calculate height
  const editorHeight =
    typeof height === "number"
      ? `${height}px`
      : height === "100%"
      ? "100%"
      : height;

  return (
    <div className={className} style={{ ...style, height: editorHeight }}>
      <CodeMirror
        onBlur={onBlur}
        value={value}
        height={editorHeight}
        theme={theme === "vs-dark" || theme === "dark" ? oneDark : undefined}
        extensions={extensions}
        onChange={(newValue) => {
          onChange(newValue);
        }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: true,
          searchKeymap: true,
          completionKeymap: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;

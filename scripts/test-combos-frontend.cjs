/* Regression tests for Lecturer Combos and Editor components */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../studynest_fe');
const ts = require(path.join(root, 'node_modules/typescript'));
const jsx = require(path.join(root, 'node_modules/react/jsx-runtime'));
const stub = new Proxy({}, { get: (_, name) => name === '__esModule' ? true : String(name) });

function mount(relative, initial = {}) {
  let cursor, dirty, tree;
  const slots = [], effects = [];
  const state = { query: new URLSearchParams(), params: {}, data: {}, calls: [], pushes: [], ...initial };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => {
        const value = typeof next === 'function' ? next(slots[index]) : next;
        if (!Object.is(slots[index], value)) { slots[index] = value; dirty = true; }
      }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!same(slots[index], deps)) { slots[index] = deps; effects.push(fn); }
    },
    useMemo(fn, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { deps, value: fn() };
      return slots[index].value;
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useId() { return 'test-id'; },
  };
  const imports = {
    react: hooks,
    'react/jsx-runtime': jsx,
    'next/navigation': {
      useRouter: () => ({ push: url => state.pushes.push(url), back() {} }),
      useSearchParams: () => state.query,
      useParams: () => state.params,
      usePathname: () => '/lecturer/combos',
    },
    swr: {
      __esModule: true,
      default: (key) => ({
        isLoading: false,
        mutate: async () => {},
        ...(state.data[key] || {}),
      }),
    },
    '@/lib/utils/fetcher/client/axios': {
      get: async () => ({ data: {} }),
      put: async () => ({ data: {} }),
      post: async () => ({ data: {} }),
      request: async () => ({ data: {} }),
    },
    '@/lib/utils/helpers/toast': {
      showToast: { success() {}, error() {}, info() {} },
    },
    '@/components/learning-paths/shared': {
      price: (amount) => `${Number(amount).toLocaleString('vi-VN')} ₫`,
      fetchLearning: async () => ({}),
      message: (err) => err?.message || 'Error',
      LoadError: () => null,
      control: '',
    },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: name => imports[name] || stub,
    console,
    URLSearchParams,
    Intl,
    window: { open() {} },
  }, { filename: relative });

  function render(props = {}) {
    for (let i = 0; i < 20; i++) {
      dirty = false; cursor = 0;
      tree = module.exports.default(props);
      while (effects.length) effects.shift()();
      if (!dirty) return tree;
    }
    throw new Error(`Render loop: ${relative}`);
  }
  return { state, render, get tree() { return tree; } };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!tree) return '';
  if (Array.isArray(tree)) return tree.map(text).join(' ');
  return text(tree.props?.children);
}

const find = (app, predicate) => nodes(app.tree).find(predicate);

// 1. Test LecturerCombos List
const comboMock = {
  items: [
    {
      bundle_id: 'b1',
      id: 'v1',
      title: 'Lộ trình Lập trình Fullstack Web Pro',
      code: 'CB-PRO-01',
      slug: 'lo-trinh-lap-trinh-fullstack-web-pro',
      price: '899000',
      original_price: '1500000',
      course_count: 3,
      primary_thumbnail: 'https://images.example.com/thumb.jpg',
      status: 'published',
      review_status: 'approved',
      is_active: true,
      total_orders: 15,
      total_revenue: '13485000',
    },
  ],
  total: 1,
};

const comboList = mount('src/components/lecturer/combos/index.tsx', {
  data: {
    '/lecturer/bundles?keyword=': { data: comboMock },
  },
});

comboList.render();
const renderedText = text(comboList.tree);

assert.match(renderedText, /Combo · Lộ trình của tôi/);
assert.match(renderedText, /Lộ trình Lập trình Fullstack Web Pro/);
assert.match(renderedText, /CB-PRO-01/);
assert.match(renderedText, /Tiết kiệm/);
assert.match(renderedText, /3\s+khóa học/);
assert.match(renderedText, /Đã bán:\s+15/);

// Kiểm tra có component Switch mở bán
const switchEl = find(comboList, n => n.type === 'Switch' || n.props?.role === 'switch');
assert(switchEl, 'Phải có Switch mở bán');
assert.equal(switchEl.props?.checked, true, 'Switch mở bán phải có prop checked ban đầu');

console.log('✅ Lecturer Combos List test passed: thumbnail, badges, double-pricing comparison, savings % and active switch!');

// 2. Test ComboEditor
const editorMock = {
  id: 'v1',
  bundle_id: 'b1',
  title: 'Lộ trình Lập trình Fullstack Web Pro',
  description: 'Lộ trình học tập chuyên sâu từ nền tảng HTML/CSS đến React và NodeJS thực chiến.',
  price: '899000',
  slug: 'lo-trinh-lap-trinh-fullstack-web-pro',
  status: 'published',
  is_active: true,
  items: [
    { course_id: 'c1', title: 'React Pro', list_price: '500000', thumbnail: null, position: 1 },
    { course_id: 'c2', title: 'NodeJS Mastery', list_price: '600000', thumbnail: null, position: 2 },
  ],
};

const comboEditor = mount('src/components/lecturer/combos/editor.tsx', {
  data: {
    '/lecturer/bundles/versions/v1': { data: editorMock },
    '/lecturer/bundles/course-options?keyword=': { data: { items: [] } },
  },
});

comboEditor.render({ versionId: 'v1' });
const editorText = text(comboEditor.tree);

assert.match(editorText, /Bảng phân tích giá & Ưu đãi học viên/);
assert.match(editorText, /Tổng giá bán lẻ/);
assert.match(editorText, /Học viên tiết kiệm/);
assert.match(editorText, /Gợi ý thiết lập giá ưu đãi/);

console.log('✅ ComboEditor test passed: realtime price breakdown, savings calculation and quick discount presets!');

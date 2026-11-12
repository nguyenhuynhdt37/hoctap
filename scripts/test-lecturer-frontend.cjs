/* Regression checks for lecturer component behavior, without a backend session. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../studynest_fe');
const ts = require(path.join(root, 'node_modules/typescript'));
const jsx = require(path.join(root, 'node_modules/react/jsx-runtime'));
const stub = new Proxy({}, { get: (_, name) => name === '__esModule' ? true : String(name) });

// Run the component's state/effect lifecycle and inspect its returned elements.
// External UI and network modules are stubs; no writes reach the real API.
function mount(relative, initial = {}) {
  let cursor, dirty, tree;
  const slots = [], effects = [];
  const state = { query: new URLSearchParams(), params: {}, data: {}, calls: [], pushes: [], retries: 0, ...initial };
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
  };
  const imports = {
    react: hooks,
    'react/jsx-runtime': jsx,
    'react-dom': { createPortal: child => child },
    'next/navigation': {
      useRouter: () => ({ push: url => state.pushes.push(url), back() {} }),
      useSearchParams: () => state.query,
      useParams: () => state.params,
      usePathname: () => '/lecturer',
    },
    swr: { __esModule: true, default: (key, fetcher, options) => {
      state.calls.push({ key, options });
      return { isLoading: false, mutate: () => { state.retries++; }, ...(state.data[key] || {}) };
    } },
    '@/types/catalog': { emptyTaxonomy: {}, taxonomyInput: value => value },
    '@/lib/utils/helpers/image': { getImageUrl: value => value },
    '@/stores/user': { useUserStore: select => select({ user: null, clearUser() {} }) },
    '@/stores/notifications': { useRealtimeNotiStore: select => select({ clearAll() {} }) },
    '@dnd-kit/core': { ...stub, useSensor: () => ({}), useSensors: () => [] },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: name => imports[name] || stub,
    console, URLSearchParams, window: { scrollTo() {}, location: { assign: url => state.pushes.push(url) } },
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
const course = { id: 'c1', title: 'Toán 12', category: { id: 'cat1' }, topic: { id: 'topic1' }, outcomes: [], requirements: [], target_audience: [] };
const uncategorizedList = mount('src/components/lecturer/courses/index.tsx', { data: {
  '/lecturer/courses?page=1&page_size=9&sort_by=revenue': { data: {
    courses: [{ ...course, category: null, slug: 'toan-12', revenue: 0, total_enrolls: 0, rating_avg: 0, views: 0, base_price: 0, sections_count: 0, lessons_count: 0 }],
    pagination: { total: 1, total_pages: 1, page: 1 },
  } },
} });
uncategorizedList.render();
assert.match(text(uncategorizedList.tree), /Chưa phân loại/);
const edit = mount('src/components/lecturer/courses/edit/index.tsx', {
  data: { '/lecturer/courses/c1': { data: course }, '/admin/categories?page=1&page_size=100&sort_by=name&sort_order=asc': { data: { items: [] } } },
});
edit.render({ courseId: 'c1' });
assert(find(edit, n => n.type === 'select' && n.props.value === 'topic1'), 'Loading a course must preserve its saved topic');
find(edit, n => n.type === 'select' && n.props.value === 'cat1').props.onChange({ target: { value: 'cat2' } });
edit.render({ courseId: 'c1' });
assert(!find(edit, n => n.type === 'select' && n.props.value === 'topic1'), 'A manual category change must clear the old topic');

const nullable = mount('src/components/lecturer/courses/edit/index.tsx', { data: { '/lecturer/courses/c1': { data: { ...course, category: null } } } });
assert.doesNotThrow(() => nullable.render({ courseId: 'c1' }), 'Deleted category must not crash the form');
for (const status of [403, 404, 500]) {
  const error = { response: { status } };
  const app = mount('src/components/lecturer/courses/edit/index.tsx', { data: { '/lecturer/courses/c1': { error } } });
  app.render({ courseId: 'c1' });
  assert.match(text(app.tree), /Khóa học không tồn tại/);
  find(app, n => text(n) === 'Thử lại').props.onClick();
  assert.equal(app.state.retries, 1);
  app.state.data['/lecturer/courses/c1'] = { data: course };
  app.render({ courseId: 'c1' });
  assert(find(app, n => n.type === 'select' && n.props.value === 'topic1'), 'Retry can recover the form');
  const lesson = mount('src/app/(main)/(lecturer)/lecturer/lessons/[id]/edit/page.tsx', { params: { id: 'l1' }, data: { '/lecturer/lessons/l1/detail': { error } } });
  lesson.render();
  assert.match(text(lesson.tree), /Bài học không tồn tại/);
}
const resources = mount('src/components/lecturer/resources/index.tsx', { params: { id: 'l1' } });
resources.render();
assert(resources.state.calls.some(c => c.key === '/lecturer/lessons/l1/resources'));
const legacyResources = mount('src/components/lecturer/resources/index.tsx', { query: new URLSearchParams('lesson_id=l2') });
legacyResources.render();
assert(legacyResources.state.calls.some(c => c.key === '/lecturer/lessons/l2/resources'));

const listing = mount('src/components/lecturer/courses/index.tsx', { query: new URLSearchParams({ search: 'Toán & Lý', page: '3' }) });
listing.render();
let request = new URL(listing.state.calls.at(-1).key, 'http://test');
assert.equal(request.searchParams.get('search'), 'Toán & Lý');
assert.equal(request.searchParams.get('page'), '3');
listing.state.query = new URLSearchParams({ search: 'Văn' });
listing.render();
request = new URL(listing.state.calls.at(-1).key, 'http://test');
assert.equal(request.searchParams.get('search'), 'Văn');
assert.equal(request.searchParams.get('page'), '1');
for (const page of ['NaN', '-2', '0', '1.5', 'Infinity']) {
  const app = mount('src/components/lecturer/courses/index.tsx', { query: new URLSearchParams({ page }) });
  app.render();
  assert.equal(new URL(app.state.calls.at(-1).key, 'http://test').searchParams.get('page'), '1');
}
const legacySearch = mount('src/components/lecturer/courses/index.tsx', { query: new URLSearchParams('keyword=Toan') });
legacySearch.render();
assert.equal(new URL(legacySearch.state.calls.at(-1).key, 'http://test').searchParams.get('search'), 'Toan');

const chapters = mount('src/components/lecturer/chapters/index.tsx', { query: new URLSearchParams('course_id=c1') });
chapters.state.data['/lecturer/chapters/c1'] = { data: { course_id: 'c1', sections: [{ id: 's1', title: 'Chương 1', lessons: [] }] } };
chapters.render();
find(chapters, n => typeof n.props?.onManageQuiz === 'function').props.onManageQuiz('l1');
assert.equal(chapters.state.pushes.at(-1), '/lecturer/quizzes-lesson?lesson_id=l1&course_id=c1');
assert.equal(chapters.state.calls.at(-1).options.keepPreviousData, false, 'Never show another course\'s editable chapters');
const missingCourse = mount('src/components/lecturer/chapters/index.tsx');
missingCourse.render();
assert.match(text(missingCourse.tree), /Vui lòng chọn khóa học/);
assert.equal(missingCourse.state.calls.at(-1).key, null);

const header = mount('src/components/lecturer/shared/header/index.tsx');
header.render();
find(header, n => n.type === 'input' && n.props.placeholder === 'Tìm khóa học...').props.onChange({ target: { value: 'Toán & Lý' } });
header.render();
find(header, n => n.type === 'form').props.onSubmit({ preventDefault() {} });
assert.equal(new URL(header.state.pushes.at(-1), 'http://test').searchParams.get('search'), 'Toán & Lý');
console.log('Lecturer regression checks passed: topic hydration/change, nullable category, API error/retry recovery, resource routes, encoded search, search navigation, pagination and chapter isolation.');

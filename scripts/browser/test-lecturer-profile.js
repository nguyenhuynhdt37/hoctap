// Run with Chrome DevTools evaluate_script(sourcePath=..., pageId=...).
// Requires an authenticated /lecturer/profile tab. All PUT /api/profile calls
// are intercepted in this tab, so this test never changes the real profile.
async () => {
  const errors = [];
  const onError = (event) => errors.push(`${event.error?.name || 'Error'}: ${event.message}`);
  window.addEventListener('error', onError);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = async (test, label) => {
    for (let i = 0; i < 100; i++) {
      if (test()) return;
      await sleep(50);
    }
    throw new Error(`Timeout: ${label}`);
  };
  const button = (label) => [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === label);
  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  let status = 503;
  let intercepted = 0;
  const requests = new WeakMap();
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    requests.set(this, { method, pathname: new URL(url, location.href).pathname });
    return open.call(this, method, url, ...args);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const request = requests.get(this);
    if (request?.method.toUpperCase() === 'PUT' && request.pathname === '/api/profile') {
      intercepted++;
      const responseStatus = status;
      setTimeout(() => {
        const data = responseStatus === 200 ? '{}' : '{"detail":"Kiểm thử: dịch vụ tạm thời gián đoạn"}';
        for (const [key, value] of Object.entries({ readyState: 4, status: responseStatus, statusText: String(responseStatus), responseText: data })) {
          Object.defineProperty(this, key, { configurable: true, value });
        }
        this.getAllResponseHeaders = () => 'content-type: application/json\r\n';
        if (this.onloadend) this.onloadend(new ProgressEvent('loadend'));
        else this.onreadystatechange?.(new Event('readystatechange'));
      }, 150);
      return;
    }
    return send.call(this, body);
  };
  // Simulate a translator moving React's Text nodes under <font> elements.
  const translate = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) texts.push(walker.currentNode);
    for (const node of texts) {
      const font = document.createElement('font');
      node.parentNode.replaceChild(font, node);
      font.appendChild(node);
    }
  };
  try {
    button('Chỉnh sửa').click();
    await waitFor(() => document.querySelector('.tiptap.ProseMirror'), 'editor mount');
    await sleep(200);
    if (!button('Lưu').disabled) throw new Error('Opening the editor must not mark the form dirty');
    const name = document.querySelector('input[required]');
    const original = name.value;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(name, original + ' Test');
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await waitFor(() => !button('Lưu')?.disabled, 'changed form');
    translate(button('Lưu'));
    button('Lưu').click();
    await waitFor(() => button('Đang lưu...'), 'save loading label');
    await waitFor(() => document.body.textContent.includes('Kiểm thử: dịch vụ tạm thời gián đoạn'), 'API error feedback');
    if (!button('Lưu') || name.value !== original + ' Test') throw new Error('Failed save must preserve the draft');
    status = 200;
    translate(button('Lưu'));
    button('Lưu').click();
    await waitFor(() => button('Đang lưu...'), 'retry loading label');
    await waitFor(() => document.body.textContent.includes('Đã lưu hồ sơ.'), 'success feedback');
    await waitFor(() => button('Chỉnh sửa'), 'read-only view');
    for (let i = 0; i < 5; i++) {
      button('Chỉnh sửa').click();
      await waitFor(() => button('Hủy'), 'editing');
      await sleep(100);
      if (!button('Lưu').disabled) throw new Error('Reopening the editor must preserve clean state');
      button('Hủy').click();
      await waitFor(() => button('Chỉnh sửa'), 'cancel');
    }
    if (errors.length) throw new Error(errors.join('\n'));
    if (intercepted !== 2) throw new Error(`Unexpected profile writes: ${intercepted}`);
    return { passed: true, simulatedSaves: intercepted, checks: ['clean editor mount', 'translated save label', 'loading', '503 retains draft', 'retry 200', 'refresh', 'edit/cancel five times'], realProfileWrites: 0 };
  } finally {
    XMLHttpRequest.prototype.open = open;
    XMLHttpRequest.prototype.send = send;
    window.removeEventListener('error', onError);
  }
}

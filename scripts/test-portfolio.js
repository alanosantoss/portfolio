const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const indexPath = path.join(ROOT, 'index.html');
const adminPath = path.join(ROOT, 'admin.html');
const projectsPath = path.join(ROOT, 'projects.js');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractInlineScript(html) {
  const regex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(regex)) {
    const attrs = match[1] || '';
    if (!/\bsrc\s*=/.test(attrs) && !/ld\+json/i.test(attrs)) {
      return match[2];
    }
  }
  throw new Error('Inline <script> not found');
}

function createDomStub() {
  const elements = new Map();
  const listeners = new Map();

  function makeElement(tag = 'div', id = '') {
    const classes = new Set();
    const attrs = new Map();
    const children = [];
    const elListeners = new Map();
    const el = {
      tagName: tag.toUpperCase(),
      id,
      value: '',
      checked: false,
      disabled: false,
      href: '',
      src: '',
      title: '',
      alt: '',
      tabIndex: 0,
      textContent: '',
      innerHTML: '',
      naturalWidth: 1280,
      dataset: {},
      style: {},
      children,
      className: '',
      classList: {
        add: (...names) => names.forEach(n => classes.add(n)),
        remove: (...names) => names.forEach(n => classes.delete(n)),
        toggle: (name, force) => {
          if (force === undefined) {
            if (classes.has(name)) { classes.delete(name); return false; }
            classes.add(name); return true;
          }
          if (force) classes.add(name); else classes.delete(name);
          return !!force;
        },
        contains: (name) => classes.has(name)
      },
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
      removeAttribute: (k) => attrs.delete(k),
      appendChild: (child) => { children.push(child); return child; },
      remove: () => {},
      querySelector: () => makeElement(),
      querySelectorAll: () => [],
      addEventListener: (type, fn) => {
        if (!elListeners.has(type)) elListeners.set(type, []);
        elListeners.get(type).push(fn);
      },
      dispatchEvent: (ev) => {
        const list = elListeners.get(ev.type) || [];
        for (const fn of list) fn(ev);
      },
      contains: () => false,
      focus: () => {},
      select: () => {},
      click: () => {}
    };
    return el;
  }

  const document = {
    activeElement: null,
    body: makeElement('body'),
    createElement: (tag) => makeElement(tag),
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, makeElement('div', id));
      return elements.get(id);
    },
    querySelector: () => makeElement(),
    querySelectorAll: () => [],
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    execCommand: () => true
  };

  return { document, makeElement, elements, listeners };
}

function loadPageVm(html, options = {}) {
  const dom = createDomStub();
  const storageMap = new Map(Object.entries(options.storage || {}));
  const winListeners = new Map();

  const windowObj = {
    DEFAULT_PROJECTS: options.defaultProjects,
    innerWidth: options.innerWidth || 1280,
    location: { hash: options.hash || '', href: '' },
    history: {
      pushState: (_s, _t, url) => { windowObj.location.hash = url; },
      replaceState: (_s, _t, url) => { windowObj.location.hash = url; }
    },
    scrollTo: () => {},
    addEventListener: (type, fn) => {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    dispatchEvent: (ev) => {
      const list = winListeners.get(ev.type) || [];
      for (const fn of list) fn(ev);
    }
  };

  const sandbox = {
    window: windowObj,
    document: dom.document,
    localStorage: {
      getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k)
    },
    navigator: { clipboard: { writeText: async () => {} } },
    history: windowObj.history,
    fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }),
    AbortController: global.AbortController,
    TextEncoder: global.TextEncoder,
    TextDecoder: global.TextDecoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    confirm: () => true,
    alert: () => {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout,
    clearTimeout,
    encodeURIComponent
  };
  sandbox.globalThis = sandbox;

  const script = extractInlineScript(html);
  const context = vm.createContext(sandbox);
  vm.runInContext(script, context);
  return {
    sandbox,
    dom,
    windowObj,
    storageMap,
    evalExpr: (expr) => vm.runInContext(expr, context)
  };
}

function loadDefaultProjects() {
  assert(fs.existsSync(projectsPath), 'projects.js deve existir na raiz');
  const code = readText(projectsPath);
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx);
  return ctx.window.DEFAULT_PROJECTS;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// --- Task 1 Tests ---
test('projects.js define window.DEFAULT_PROJECTS com schema válido', () => {
  const projects = loadDefaultProjects();
  assert(Array.isArray(projects) && projects.length >= 1, 'DEFAULT_PROJECTS deve ser um array não vazio');
  const validTypes = new Set(['video', 'design']);
  const validCategories = new Set(['video', 'design', 'ia']);
  const validRatios = new Set(['ratio-9-16', 'ratio-16-9', 'ratio-4-3', 'ratio-3-2']);

  projects.forEach((item, idx) => {
    assert(validTypes.has(item.type), `Item #${idx} com type inválido: ${item.type}`);
    assert(validCategories.has(item.category), `Item #${idx} com category inválida: ${item.category}`);
    assert(typeof item.title === 'string' && item.title.trim().length > 0, `Item #${idx} sem title`);
    assert(validRatios.has(item.ratio), `Item #${idx} com ratio inválido: ${item.ratio}`);
    assert(Array.isArray(item.tags), `Item #${idx} sem array tags`);
    if (item.type === 'video') {
      assert(typeof item.id === 'string' && item.id.trim().length > 0, `Vídeo #${idx} sem id`);
    } else {
      assert(typeof item.image === 'string' && item.image.trim().length > 0, `Design #${idx} sem image`);
    }
  });
});

test('index.html e admin.html carregam projects.js sem arrays duplicados inline', () => {
  const indexHtml = readText(indexPath);
  const adminHtml = readText(adminPath);

  assert(indexHtml.includes('<script src="projects.js"></script>'), 'index.html deve importar projects.js');
  assert(adminHtml.includes('<script src="projects.js"></script>'), 'admin.html deve importar projects.js');
  assert(!/\bPROJECTS\s*:\s*\[/.test(indexHtml), 'index.html não deve mais declarar PROJECTS inline');
  assert(!/const\s+DEFAULT_PROJECTS\s*=\s*\[/.test(adminHtml), 'admin.html não deve mais declarar DEFAULT_PROJECTS inline');
  assert(fs.existsSync(path.join(ROOT, 'assets', 'alan-oliveira.jpg')), 'assets/alan-oliveira.jpg deve existir');
});

test('index.html getProjectsList faz fallback seguro para window.DEFAULT_PROJECTS', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);

  const emptyStorage = loadPageVm(indexHtml, {
    defaultProjects: defaults,
    storage: { portfolio_projects: '[]' }
  });
  assert.strictEqual(emptyStorage.sandbox.getProjectsList().length, defaults.length);

  const brokenStorage = loadPageVm(indexHtml, {
    defaultProjects: defaults,
    storage: { portfolio_projects: 'not-json' }
  });
  assert.strictEqual(brokenStorage.sandbox.getProjectsList().length, defaults.length);

  const customWithHidden = loadPageVm(indexHtml, {
    defaultProjects: defaults,
    storage: {
      portfolio_projects: JSON.stringify([
        { type: 'video', category: 'video', id: 'abc12345678', title: 'Visível', ratio: 'ratio-9-16', tags: [], visible: true },
        { type: 'video', category: 'video', id: 'xyz12345678', title: 'Oculto', ratio: 'ratio-9-16', tags: [], visible: false }
      ])
    }
  });
  const visibleList = customWithHidden.sandbox.getProjectsList();
  assert.strictEqual(visibleList.length, 1);
  assert.strictEqual(visibleList[0].title, 'Visível');
});

test('admin.html loadProjects faz fallback seguro para window.DEFAULT_PROJECTS', () => {
  const defaults = loadDefaultProjects();
  const adminHtml = readText(adminPath);

  const vmRun = loadPageVm(adminHtml, {
    defaultProjects: defaults,
    storage: { portfolio_projects: '{bad json' }
  });
  vmRun.sandbox.loadProjects();
  assert.strictEqual(vmRun.evalExpr('state.projects.length'), defaults.length);
});

let passed = 0;
console.log('--- Executando testes automatizados do portfólio ---');
for (const t of tests) {
  try {
    t.fn();
    console.log(`PASS: ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${t.name}\n  ${err.message}`);
    process.exit(1);
  }
}
console.log(`=============================================`);
console.log(`TODOS OS TESTES PASSARAM COM SUCESSO! (${passed}/${tests.length})`);
console.log(`=============================================`);

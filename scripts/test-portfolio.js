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
    let _innerHtml = '';
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
      get innerHTML() { return _innerHtml; },
      set innerHTML(val) {
        _innerHtml = String(val || '');
        if (_innerHtml === '') children.length = 0;
      },
      naturalWidth: 1280,
      dataset: {},
      style: {},
      children,
      get className() { return Array.from(classes).join(' '); },
      set className(val) {
        classes.clear();
        String(val || '').split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
      },
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
  const domReadyListeners = dom.listeners.get('DOMContentLoaded') || [];
  for (const fn of domReadyListeners) {
    fn({ type: 'DOMContentLoaded' });
  }
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

// --- Task 2 Tests ---
test('index.html exibe Hero com CTA WhatsApp genérico, sem link admin no footer e sem código morto', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);

  assert(indexHtml.includes('class="hero-strip"'), 'Hero strip deve existir');
  assert(indexHtml.includes('<h1 class="hero-title">'), 'Página deve ter <h1> no Hero');
  assert(!indexHtml.includes('projeto de edição'), 'Mensagem do WhatsApp deve ser genérica');
  assert(!/<footer[\s\S]*?admin\.html[\s\S]*?<\/footer>/i.test(indexHtml), 'Footer público não deve linkar admin.html');
  assert(!/<footer[\s\S]*?#555|#666/i.test(indexHtml), 'Footer não deve usar cores de baixo contraste #555/#666');
  assert(!indexHtml.includes('playInlineVideo') && !indexHtml.includes('stopCurrentInlineVideo'), 'Código morto inline deve ser removido');
  assert(!indexHtml.includes('.ratio-21-9') && !indexHtml.includes('.ratio-16-10'), 'Classes ratio não utilizadas devem ser removidas');

  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults });
  vmRun.sandbox.initContacts();
  const heroWa = vmRun.dom.elements.get('hero-whatsapp');
  assert(heroWa && heroWa.href.startsWith('https://wa.me/5511991584991?text='), 'CTA Hero deve montar link do WhatsApp');
  assert(!decodeURIComponent(heroWa.href).includes('projeto de edição'), 'Link do Hero deve usar mensagem genérica');

  vmRun.sandbox.setCategory('sobre');
  assert(vmRun.dom.elements.get('hero-strip').classList.contains('is-hidden'), 'Hero deve ocultar na aba sobre');
  vmRun.sandbox.setCategory('home');
  assert(!vmRun.dom.elements.get('hero-strip').classList.contains('is-hidden'), 'Hero deve aparecer na aba home');
});

test('renderSubNav filtra tags por mínimo de 2 itens e oculta barras rasas', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);
  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults });
  const subNav = vmRun.dom.elements.get('sub-nav');

  vmRun.sandbox.setCategory('video');
  assert(!subNav.classList.contains('is-hidden'), 'Aba video deve exibir sub-nav');
  assert(subNav.innerHTML.includes('data-subfilter="reels"'), 'Video deve incluir filtro reels');
  assert(subNav.innerHTML.includes('data-subfilter="social-media"'), 'Video deve incluir filtro social-media');
  assert(subNav.innerHTML.includes('data-subfilter="fitness"'), 'Video deve incluir filtro fitness');
  assert(!subNav.innerHTML.includes('data-subfilter="institucional"'), 'Tag com apenas 1 item não deve virar filtro');

  vmRun.sandbox.setCategory('design');
  assert(subNav.classList.contains('is-hidden'), 'Aba design deve ocultar sub-nav quando há menos de 2 tags elegíveis');

  vmRun.sandbox.setCategory('ia');
  assert(subNav.classList.contains('is-hidden'), 'Aba ia deve ocultar sub-nav quando há menos de 2 tags elegíveis');
});

test('setCategory e hashchange sincronizam #hash sem loops', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);
  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults });

  let pushCount = 0;
  vmRun.windowObj.history.pushState = (_s, _t, url) => {
    pushCount++;
    vmRun.windowObj.location.hash = url;
  };

  vmRun.sandbox.setCategory('video');
  assert.strictEqual(vmRun.windowObj.location.hash, '#video');
  assert.strictEqual(pushCount, 1);

  vmRun.windowObj.location.hash = '#sobre';
  vmRun.windowObj.dispatchEvent({ type: 'hashchange' });
  assert.strictEqual(vmRun.evalExpr('state.activeCategory'), 'sobre');
  assert.strictEqual(pushCount, 1, 'hashchange não deve disparar novo pushState');

  vmRun.windowObj.location.hash = '#inexistente';
  vmRun.windowObj.dispatchEvent({ type: 'hashchange' });
  assert.strictEqual(vmRun.evalExpr('state.activeCategory'), 'home');
});

// --- Task 3 Tests ---
test('escapeHtml, isSafeImageUrl e getRatioWeight protegem e calculam pesos corretamente', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);
  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults });

  assert.strictEqual(
    vmRun.sandbox.escapeHtml('Teste "Aspas" <img onerror=alert(1)>'),
    'Teste &quot;Aspas&quot; &lt;img onerror=alert(1)&gt;'
  );
  assert.strictEqual(vmRun.sandbox.isSafeImageUrl('https://example.com/a.jpg'), true);
  assert.strictEqual(vmRun.sandbox.isSafeImageUrl('assets/foto.jpg'), true);
  assert.strictEqual(vmRun.sandbox.isSafeImageUrl('javascript:alert(1)'), false);
  assert.strictEqual(vmRun.sandbox.isSafeImageUrl('data:text/html,<script>'), false);

  assert(Math.abs(vmRun.sandbox.getRatioWeight({ ratio: 'ratio-9-16' }) - (16 / 9)) < 1e-6);
  assert(Math.abs(vmRun.sandbox.getRatioWeight({ ratio: 'ratio-16-9' }) - (9 / 16)) < 1e-6);
  assert(Math.abs(vmRun.sandbox.getRatioWeight({ ratio: 'ratio-4-3' }) - (3 / 4)) < 1e-6);
  assert(Math.abs(vmRun.sandbox.getRatioWeight({ ratio: 'ratio-3-2' }) - (2 / 3)) < 1e-6);
});

test('renderGallery distribui cards em colunas pela menor altura e exibe estado vazio', () => {
  const sample = [
    { type: 'video', category: 'video', id: 'v1', title: 'Top 1', ratio: 'ratio-9-16', tags: [] },
    { type: 'design', category: 'design', title: 'Top 2', image: 'https://example.com/2.jpg', ratio: 'ratio-16-9', tags: [] },
    { type: 'design', category: 'design', title: 'Top 3', image: 'https://example.com/3.jpg', ratio: 'ratio-16-9', tags: [] },
    { type: 'video', category: 'video', id: 'v4', title: 'Top 4', ratio: 'ratio-9-16', tags: [] },
    { type: 'video', category: 'video', id: 'v5', title: 'Quinto', ratio: 'ratio-9-16', tags: [] }
  ];
  const indexHtml = readText(indexPath);
  const vmRun = loadPageVm(indexHtml, {
    defaultProjects: sample,
    innerWidth: 1280
  });
  const grid = vmRun.dom.elements.get('gallery-grid');
  assert.strictEqual(grid.children.length, 4, 'Desktop 1280px deve renderizar 4 colunas');
  assert.strictEqual(grid.children[0].children[0].getAttribute('aria-label'), 'Assistir: Top 1');
  assert.strictEqual(grid.children[1].children[0].getAttribute('aria-label'), 'Ver: Top 2');
  assert.strictEqual(grid.children[2].children[0].getAttribute('aria-label'), 'Ver: Top 3');
  assert.strictEqual(grid.children[3].children[0].getAttribute('aria-label'), 'Assistir: Top 4');
  assert.strictEqual(grid.children[1].children.length, 2, '5º card deve ir para a coluna mais baixa (16:9 na col 1)');

  vmRun.sandbox.setCategory('ia');
  assert.strictEqual(grid.children.length, 1, 'Categoria sem itens deve exibir estado vazio');
  assert(grid.children[0].classList.contains('masonry-empty'), 'Estado vazio deve usar .masonry-empty');
});

test('attachThumbFallback percorre maxresdefault -> sddefault -> hqdefault e trata erro em design', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);
  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults });

  const img = vmRun.dom.makeElement('img');
  const card = vmRun.dom.makeElement('article');
  const videoItem = { type: 'video', id: 'abc12345678', title: 'Video' };
  img.src = 'https://i.ytimg.com/vi/abc12345678/maxresdefault.jpg';
  vmRun.sandbox.attachThumbFallback(img, card, videoItem);

  img.naturalWidth = 120;
  img.dispatchEvent({ type: 'load' });
  assert.strictEqual(img.src, 'https://i.ytimg.com/vi/abc12345678/sddefault.jpg');

  img.dispatchEvent({ type: 'error' });
  assert.strictEqual(img.src, 'https://i.ytimg.com/vi/abc12345678/hqdefault.jpg');

  const designImg = vmRun.dom.makeElement('img');
  const designCard = vmRun.dom.makeElement('article');
  vmRun.sandbox.attachThumbFallback(designImg, designCard, { type: 'design', image: 'https://x.com/bad.jpg', title: 'Design' });
  designImg.dispatchEvent({ type: 'error' });
  assert(designCard.classList.contains('has-media-error'), 'Erro em imagem design deve marcar .has-media-error');

  assert(
    /@media\s*\(hover:\s*none\),\s*\(max-width:\s*768px\)[\s\S]*?\.masonry-overlay[\s\S]*?opacity:\s*1/i.test(indexHtml),
    'CSS deve exibir título no overlay em telas touch/mobile'
  );
  assert(!indexHtml.includes('-webkit-optimize-contrast'), 'CSS não deve conter -webkit-optimize-contrast');
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

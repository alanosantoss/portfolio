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
      replaceChildren: (...nodes) => { children.length = 0; children.push(...nodes); },
      remove: () => {},
      querySelector: () => makeElement(),
      querySelectorAll: () => [],
      addEventListener: (type, fn, opts) => {
        if (!elListeners.has(type)) elListeners.set(type, []);
        elListeners.get(type).push({ fn, once: !!(opts && opts.once) });
      },
      dispatchEvent: (ev) => {
        const list = (elListeners.get(ev.type) || []).slice();
        const remaining = [];
        for (const entry of list) {
          if (!entry.once) remaining.push(entry);
        }
        elListeners.set(ev.type, remaining);
        for (const entry of list) entry.fn(ev);
      },
      contains: () => false,
      focus: () => { document.activeElement = el; },
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
    dispatchEvent: (ev) => {
      const list = listeners.get(ev.type) || [];
      for (const fn of list) fn(ev);
    },
    execCommand: () => true
  };

  return { document, makeElement, elements, listeners };
}

function loadPageVm(html, options = {}) {
  const dom = createDomStub();
  const storageMap = new Map(Object.entries(options.storage || {}));
  const sessionMap = new Map(Object.entries(options.sessionStorage || {}));
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
    sessionStorage: {
      getItem: (k) => (sessionMap.has(k) ? sessionMap.get(k) : null),
      setItem: (k, v) => sessionMap.set(k, String(v)),
      removeItem: (k) => sessionMap.delete(k)
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
    setTimeout: options.manualTimers ? (fn) => { timers.push(fn); return timers.length; } : setTimeout,
    clearTimeout: options.manualTimers ? () => {} : clearTimeout,
    encodeURIComponent
  };
  const timers = [];
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
    flushTimers: () => {
      while (timers.length > 0) {
        const fn = timers.shift();
        fn();
      }
    },
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
test('index.html exibe CTA compacto de orçamento no topo, sem texto hero, sem link admin no footer e sem código morto', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);

  assert(!indexHtml.includes('class="hero-strip"'), 'Hero strip com texto deve ser removida');
  assert(!indexHtml.includes('Edição de vídeo, design e soluções com IA para marcas e criadores.'), 'Texto introdutório abaixo do cabeçalho deve ser removido');
  assert(indexHtml.includes('id="header-whatsapp"'), 'Cabeçalho deve conter CTA compacto #header-whatsapp');
  assert(!indexHtml.includes('id="social-whatsapp"'), 'Ícone avulso do WhatsApp no topo deve ser removido');
  assert(/<a[^>]*id="header-whatsapp"[^>]*>[\s\S]*?<svg[\s\S]*?Orçamento[\s\S]*?<\/a>/i.test(indexHtml), '#header-whatsapp deve unir ícone do WhatsApp e texto Orçamento');
  assert(!indexHtml.includes('projeto de edição'), 'Mensagem do WhatsApp deve ser genérica');
  assert(!/<footer[\s\S]*?admin\.html[\s\S]*?<\/footer>/i.test(indexHtml), 'Footer público não deve linkar admin.html');
  assert(!/<footer[\s\S]*?#555|#666/i.test(indexHtml), 'Footer não deve usar cores de baixo contraste #555/#666');
  assert(!indexHtml.includes('playInlineVideo') && !indexHtml.includes('stopCurrentInlineVideo'), 'Código morto inline deve ser removido');
  assert(!indexHtml.includes('.ratio-21-9') && !indexHtml.includes('.ratio-16-10'), 'Classes ratio não utilizadas devem ser removidas');

  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults });
  vmRun.sandbox.initContacts();
  const headerWa = vmRun.dom.elements.get('header-whatsapp');
  assert(headerWa && headerWa.href.startsWith('https://wa.me/5511991584991?text='), 'CTA do topo deve montar link do WhatsApp');
  assert(!decodeURIComponent(headerWa.href).includes('projeto de edição'), 'Link do topo deve usar mensagem genérica');
});

test('renderSubNav exibe categorias de nicho/objetivo (>= 2 itens), remove reels/social-media e centraliza menu', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);
  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults });
  const subNav = vmRun.dom.elements.get('sub-nav');

  assert(/\.header-top\s*\{[^}]*grid-template-columns:\s*1fr\s+auto\s+1fr/i.test(indexHtml), '.header-top deve usar grid simétrico 1fr auto 1fr para centralizar navegação sobre os filtros');
  assert(/\.nav-links\s*\{[^}]*justify-content:\s*center/i.test(indexHtml), '.nav-links deve centralizar seus itens com justify-content: center');

  defaults.forEach((item, idx) => {
    assert(!item.tags.includes('reels'), `Projeto #${idx} (${item.title}) não deve usar tag reels`);
    assert(!item.tags.includes('social-media'), `Projeto #${idx} (${item.title}) não deve usar tag social-media`);
  });

  vmRun.sandbox.setCategory('video');
  assert(!subNav.classList.contains('is-hidden'), 'Aba video deve exibir sub-nav');
  assert(!subNav.innerHTML.includes('data-subfilter="reels"'), 'Video não deve incluir filtro reels');
  assert(!subNav.innerHTML.includes('data-subfilter="social-media"'), 'Video não deve incluir filtro social-media');
  assert(subNav.innerHTML.includes('data-subfilter="comercial"'), 'Video deve incluir filtro comercial');
  assert(subNav.innerHTML.includes('data-subfilter="fitness"'), 'Video deve incluir filtro fitness');
  assert(subNav.innerHTML.includes('data-subfilter="saude"'), 'Video deve incluir filtro saude');
  assert(subNav.innerHTML.includes('data-subfilter="institucional"'), 'Video deve incluir filtro institucional');
  assert(!subNav.innerHTML.includes('data-subfilter="imobiliario"'), 'Tag com apenas 1 item não deve virar filtro');

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

  const mobileVm = loadPageVm(indexHtml, {
    defaultProjects: sample,
    innerWidth: 375
  });
  const mobileGrid = mobileVm.dom.elements.get('gallery-grid');
  assert.strictEqual(mobileGrid.children.length, 2, 'Mobile 375px deve renderizar 2 colunas');
  assert.strictEqual(mobileVm.sandbox.getColumnCount(320), 2);
  assert.strictEqual(mobileVm.sandbox.getColumnCount(768), 2);
  assert.strictEqual(mobileVm.sandbox.getColumnCount(900), 3);
  assert.strictEqual(mobileVm.sandbox.getColumnCount(1280), 4);
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

// --- Task 4 Tests ---
test('Lightbox usa controls=0, exibe legenda escapada, poster e tokens transitions.dev', () => {
  const sample = [
    { type: 'video', category: 'video', id: 'vid12345678', title: 'Teste "Vídeo" <script>', aspect: '9:16', ratio: 'ratio-9-16', tags: [] },
    { type: 'design', category: 'ia', title: 'Arte IA', image: 'javascript:alert(1)', ratio: 'ratio-4-3', tags: [] }
  ];
  const indexHtml = readText(indexPath);
  assert(indexHtml.includes('id="lightbox-caption"'), 'Lightbox deve conter #lightbox-caption');
  assert(indexHtml.includes('id="lightbox-stage"'), 'Lightbox deve conter #lightbox-stage');
  assert(indexHtml.includes('--ease-smooth-out:'), 'CSS deve incluir tokens de transição do transitions.dev (--ease-smooth-out)');
  assert(indexHtml.includes('--duration-medium:'), 'CSS deve incluir duração --duration-medium do transitions.dev');
  assert(indexHtml.includes('--scale-large:'), 'CSS deve incluir --scale-large do transitions.dev');
  assert(indexHtml.includes('prefers-reduced-motion'), 'CSS deve respeitar prefers-reduced-motion');

  const vmRun = loadPageVm(indexHtml, { defaultProjects: sample, manualTimers: true });
  const stage = vmRun.dom.document.getElementById('lightbox-stage');
  stage.getBoundingClientRect = () => ({ left: 400, top: 100, width: 360, height: 640 });

  const triggerBtn = vmRun.dom.makeElement('article');
  triggerBtn.getBoundingClientRect = () => ({ left: 80, top: 220, width: 180, height: 320 });
  triggerBtn.focus();

  const rafQueue = [];
  vmRun.sandbox.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
  vmRun.sandbox.cancelAnimationFrame = () => {};

  vmRun.sandbox.openLightbox(0, triggerBtn);
  const content = vmRun.dom.elements.get('lightbox-content');
  const caption = vmRun.dom.elements.get('lightbox-caption');
  const closeBtn = vmRun.dom.elements.get('lightbox-close');
  const prevBtn = vmRun.dom.elements.get('lightbox-prev');
  const nextBtn = vmRun.dom.elements.get('lightbox-next');

  assert(content.innerHTML.includes('controls=0'), 'Lightbox YouTube deve usar controls=0');
  assert(content.innerHTML.includes('class="lightbox-poster"'), 'Vídeo deve exibir poster de transição atrás do iframe');
  assert(indexHtml.includes('.lightbox-video-wrap iframe.is-ready'), 'Iframe do vídeo deve entrar com fade (.is-ready) sobre o poster');
  assert(stage.style.transform && stage.style.transform.includes('translate3d('), 'Abertura pelo card deve calcular animação FLIP de origem');
  assert.strictEqual(rafQueue.length, 1, 'Frame 1 deve ser agendado antes da transição');
  rafQueue.shift()();
  assert(stage.style.transform && !stage.style.transform.includes('translate3d(0, 0, 0)'), 'Frame 1 deve manter posição inicial para o browser pintar antes de animar');
  assert.strictEqual(rafQueue.length, 1, 'Double-rAF deve agendar Frame 2 para iniciar transição suave');
  rafQueue.shift()();
  assert(stage.style.transform.includes('translate3d(0, 0, 0)'), 'Frame 2 deve animar estágio até o centro');

  assert(!content.innerHTML.includes('<script>'), 'Título no iframe deve ser escapado');
  assert(caption.textContent.includes('Teste "Vídeo" <script>'), 'Legenda deve mostrar título via textContent');
  assert.strictEqual(vmRun.dom.document.activeElement, closeBtn, 'Foco inicial deve ir para #lightbox-close');

  // Shift+Tab no primeiro botão volta para #lightbox-next
  let prevented = false;
  vmRun.dom.document.dispatchEvent({
    type: 'keydown',
    key: 'Tab',
    shiftKey: true,
    preventDefault: () => { prevented = true; }
  });
  assert(prevented, 'Tab trap deve chamar preventDefault na borda');
  assert.strictEqual(vmRun.dom.document.activeElement, nextBtn, 'Shift+Tab em closeBtn deve ir para nextBtn');

  // Tab no último botão volta para #lightbox-close
  prevented = false;
  vmRun.dom.document.dispatchEvent({
    type: 'keydown',
    key: 'Tab',
    shiftKey: false,
    preventDefault: () => { prevented = true; }
  });
  assert(prevented, 'Tab em nextBtn deve voltar para closeBtn');
  assert.strictEqual(vmRun.dom.document.activeElement, closeBtn);

  // Item design com URL insegura não deve renderizar javascript:
  vmRun.sandbox.stepLightbox(1);
  assert(!content.innerHTML.includes('javascript:'), 'Lightbox deve bloquear URL insegura');

  // Ao fechar, foco retorna ao card de origem e estilos inline são limpos
  vmRun.sandbox.closeLightbox();
  vmRun.flushTimers();
  assert.strictEqual(stage.style.transform, '', 'Fechamento deve limpar transform inline do estágio');
  assert.strictEqual(vmRun.dom.document.activeElement, triggerBtn, 'Foco deve retornar ao elemento anterior ao fechar');
});

// --- Task 5 Tests ---
test('admin.html preserva type design na categoria ia, suporta 4:3/3:2 e escapa XSS', () => {
  const defaults = loadDefaultProjects();
  const adminHtml = readText(adminPath);

  assert(adminHtml.includes('id="input-type"'), 'Modal do admin deve ter seletor #input-type');
  assert(adminHtml.includes('value="4:3"') && adminHtml.includes('value="3:2"'), 'Modal do admin deve suportar 4:3 e 3:2');

  const vmRun = loadPageVm(adminHtml, { defaultProjects: defaults });
  assert.strictEqual(
    vmRun.sandbox.escapeHtml('Teste "Aspas" <img onerror=1>'),
    'Teste &quot;Aspas&quot; &lt;img onerror=1&gt;'
  );
  assert.strictEqual(vmRun.sandbox.isSafeImageUrl('javascript:alert(1)'), false);

  const iaImage = vmRun.sandbox.buildProjectPayload({
    type: 'design',
    category: 'ia',
    rawSource: 'https://images.unsplash.com/photo-1',
    title: 'IA Render',
    aspect: '4:3',
    tags: ['ia', 'renders'],
    visible: true
  }, { type: 'video', id: 'oldId123456' });
  assert.strictEqual(iaImage.type, 'design');
  assert.strictEqual(iaImage.category, 'ia');
  assert.strictEqual(iaImage.ratio, 'ratio-4-3');
  assert.strictEqual(iaImage.image, 'https://images.unsplash.com/photo-1');
  assert.strictEqual('id' in iaImage, false, 'Item design não deve herdar id antigo');

  const iaVideo = vmRun.sandbox.buildProjectPayload({
    type: 'video',
    category: 'ia',
    rawSource: 'https://youtube.com/shorts/ZgsA0pQszPk',
    title: 'IA Video',
    aspect: '9:16',
    tags: ['ia'],
    visible: true
  }, { type: 'design', image: 'https://old.com/a.jpg' });
  assert.strictEqual(iaVideo.type, 'video');
  assert.strictEqual(iaVideo.id, 'ZgsA0pQszPk');
  assert.strictEqual(iaVideo.ratio, 'ratio-9-16');
  assert.strictEqual('image' in iaVideo, false, 'Item video não deve herdar image antiga');
});

test('admin.html dragleave ignora filhos internos e pushToGitHubAPI envia apenas projects.js', async () => {
  const defaults = loadDefaultProjects();
  const adminHtml = readText(adminPath);
  const vmRun = loadPageVm(adminHtml, { defaultProjects: defaults });

  const card = vmRun.dom.makeElement('div');
  const child = vmRun.dom.makeElement('span');
  const outside = vmRun.dom.makeElement('div');
  card.contains = (target) => target === child;
  vmRun.sandbox.setupCardDragEvents(card, 0);

  card.classList.add('drag-over-active');
  card.dispatchEvent({ type: 'dragleave', relatedTarget: child });
  assert(card.classList.contains('drag-over-active'), 'dragleave sobre filho interno não deve remover destaque');

  card.dispatchEvent({ type: 'dragleave', relatedTarget: outside });
  assert(!card.classList.contains('drag-over-active'), 'dragleave saindo do card deve remover destaque');

  const calls = [];
  vmRun.sandbox.fetch = async (url, opts = {}) => {
    calls.push({ url, opts });
    if (!opts.method || opts.method === 'GET') {
      return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) };
    }
    return { ok: true, status: 201, json: async () => ({}) };
  };

  await vmRun.sandbox.pushToGitHubAPI('ghp_test_token');
  assert.strictEqual(calls.length, 2, 'Deve fazer exatamente 1 GET e 1 PUT em projects.js');
  assert(calls[0].url.endsWith('/contents/projects.js'), 'GET deve consultar contents/projects.js');
  assert(calls[1].url.endsWith('/contents/projects.js'), 'PUT deve atualizar contents/projects.js');
  const putBody = JSON.parse(calls[1].opts.body);
  assert.strictEqual(putBody.sha, undefined, 'Quando GET retorna 404, PUT não deve enviar sha');
  const decoded = Buffer.from(putBody.content, 'base64').toString('utf8');
  assert(decoded.startsWith('window.DEFAULT_PROJECTS = '), 'Conteúdo enviado deve iniciar com window.DEFAULT_PROJECTS = ');
});

// --- Task 6 Tests ---
test('server.js valida origem local, payload, path estático e formatação de projects.js', async () => {
  const http = require('http');
  const serverPath = path.join(ROOT, 'scripts', 'server.js');
  const serverSource = readText(serverPath);

  assert(serverSource.includes("'127.0.0.1'"), 'server.js deve escutar apenas em 127.0.0.1');
  assert(!serverSource.includes("Access-Control-Allow-Origin', '*'"), 'server.js não deve usar CORS *');
  assert(!/PROJECTS:\\s*\\\[/.test(serverSource), 'server.js não deve usar regex em index.html');

  const srv = require('./server.js');
  assert.strictEqual(typeof srv.isAllowedOrigin, 'function', 'server.js deve exportar isAllowedOrigin');
  assert.strictEqual(srv.isAllowedOrigin(undefined), true);
  assert.strictEqual(srv.isAllowedOrigin('http://localhost:8089'), true);
  assert.strictEqual(srv.isAllowedOrigin('http://127.0.0.1:8089'), true);
  assert.strictEqual(srv.isAllowedOrigin('https://evil.example'), false);

  assert.strictEqual(srv.validateProjectsPayload([]), false);
  assert.strictEqual(srv.validateProjectsPayload([{ title: '' }]), false);
  assert.strictEqual(
    srv.validateProjectsPayload([{ type: 'design', category: 'ia', title: 'Ok', image: 'assets/a.jpg' }]),
    true
  );

  const formatted = srv.formatProjectsFile([
    { type: 'video', category: 'video', id: 'abc12345678', title: 'V1', ratio: 'ratio-9-16', tags: [], visible: true }
  ]);
  assert(formatted.startsWith('window.DEFAULT_PROJECTS = '), 'formatProjectsFile deve iniciar com window.DEFAULT_PROJECTS = ');
  assert(!formatted.includes('"visible": true'), 'formatProjectsFile deve remover visible: true');

  assert.strictEqual(srv.resolveSafeStaticPath('/../secret.txt'), null, 'Path traversal deve retornar null');
  assert(srv.resolveSafeStaticPath('/index.html').endsWith('index.html'));

  // Teste real de HTTP rejeitando Origin externo com 403
  await new Promise((resolve, reject) => {
    srv.server.listen(0, '127.0.0.1', () => {
      const { port } = srv.server.address();
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/save-git',
          method: 'POST',
          headers: {
            'Origin': 'https://evil.example',
            'Content-Type': 'application/json'
          }
        },
        (res) => {
          res.resume();
          srv.server.close(() => {
            try {
              assert.strictEqual(res.statusCode, 403, 'Origin externo em /api/save-git deve receber HTTP 403');
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        }
      );
      req.on('error', (err) => srv.server.close(() => reject(err)));
      req.end(JSON.stringify({ projects: [] }));
    });
  });
});

// --- Final Review Fix-Pass Tests ---
test('index.html sobrevive a SecurityError em pushState (file://) e sincroniza via popstate', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);
  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults });

  vmRun.windowObj.history.pushState = () => {
    throw new Error('SecurityError');
  };

  vmRun.sandbox.setCategory('video');
  assert.strictEqual(vmRun.evalExpr('state.activeCategory'), 'video');
  assert.strictEqual(vmRun.windowObj.location.hash, '#video', 'Fallback deve atualizar location.hash');

  vmRun.windowObj.location.hash = '#design';
  vmRun.windowObj.dispatchEvent({ type: 'popstate' });
  assert.strictEqual(vmRun.evalExpr('state.activeCategory'), 'design', 'popstate deve atualizar categoria');
});

test('admin.html updateThumbPreview valida ID estrito e evita onerror inline ou loop', () => {
  const defaults = loadDefaultProjects();
  const adminHtml = readText(adminPath);
  const vmRun = loadPageVm(adminHtml, { defaultProjects: defaults });

  const inputType = vmRun.dom.elements.get('input-type');
  const inputYt = vmRun.dom.elements.get('input-yt-url');
  const previewBox = vmRun.dom.elements.get('thumb-preview-box');

  inputType.value = 'video';
  inputYt.value = "'-alert()-'";
  vmRun.sandbox.updateThumbPreview();
  assert.strictEqual(previewBox.children.length, 0, 'ID com aspas/parênteses não deve criar <img>');
  assert(!previewBox.innerHTML.includes('onerror='), 'Preview não deve usar onerror inline');

  inputYt.value = 'aNsA0iwBbqc';
  vmRun.sandbox.updateThumbPreview();
  assert.strictEqual(previewBox.children.length, 1, 'ID válido deve criar <img> via DOM');
  const img = previewBox.children[0];
  assert.strictEqual(img.src, 'https://i.ytimg.com/vi/aNsA0iwBbqc/hqdefault.jpg');

  img.dispatchEvent({ type: 'error' });
  assert.strictEqual(img.src, 'https://i.ytimg.com/vi/aNsA0iwBbqc/sddefault.jpg');

  img.src = 'sentinel';
  img.dispatchEvent({ type: 'error' });
  assert.strictEqual(img.src, 'sentinel', 'Fallback de erro no preview deve disparar no máximo 1 vez');
});

test('isSafeImageUrl bloqueia caracteres de controle e tabulações em index.html e admin.html', () => {
  const defaults = loadDefaultProjects();
  const indexVm = loadPageVm(readText(indexPath), { defaultProjects: defaults });
  const adminVm = loadPageVm(readText(adminPath), { defaultProjects: defaults });

  for (const vmRun of [indexVm, adminVm]) {
    assert.strictEqual(vmRun.sandbox.isSafeImageUrl('java\tscript:alert(1)'), false);
    assert.strictEqual(vmRun.sandbox.isSafeImageUrl('\u0001javascript:alert(1)'), false);
    assert.strictEqual(vmRun.sandbox.isSafeImageUrl('https://images.unsplash.com/photo-1'), true);
  }
});

// --- Merge Integration Tests (welcome-gate + PR branch) ---
test('welcome-gate inicializa sem erro, restaura área salva e respeita hash direto', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);

  const firstVisit = loadPageVm(indexHtml, { defaultProjects: defaults });
  assert(firstVisit.dom.elements.get('welcome-gate').classList.contains('is-open'), 'Primeira visita sem hash deve abrir welcome-gate');

  const returningVisit = loadPageVm(indexHtml, {
    defaultProjects: defaults,
    sessionStorage: { portfolio_welcome_seen: '1', portfolio_welcome_cat: 'design' }
  });
  assert(!returningVisit.dom.elements.get('welcome-gate').classList.contains('is-open'), 'Visita com área salva não deve reabrir gate');
  assert.strictEqual(returningVisit.evalExpr('state.lockedCategory'), 'design');
  assert.strictEqual(returningVisit.evalExpr('state.activeCategory'), 'design');
  assert(returningVisit.dom.elements.get('switch-area-btn').classList.contains('is-visible'), 'Botão trocar área deve ficar visível com área travada');

  const directHashVisit = loadPageVm(indexHtml, {
    defaultProjects: defaults,
    hash: '#video'
  });
  assert(!directHashVisit.dom.elements.get('welcome-gate').classList.contains('is-open'), 'Hash direto #video não deve abrir welcome-gate');
  assert.strictEqual(directHashVisit.evalExpr('state.activeCategory'), 'video');
});

test('Modal de pré-orçamento (tudo numa tela) gera texto automático sem IA e conecta WhatsApp', () => {
  const defaults = loadDefaultProjects();
  const indexHtml = readText(indexPath);

  assert(indexHtml.includes('id="quote-modal"'), 'index.html deve conter #quote-modal');
  assert(indexHtml.includes('id="quote-submit-btn"'), 'Modal deve conter botão principal #quote-submit-btn');
  assert(indexHtml.includes('id="quote-skip-link"'), 'Modal deve conter botão discreto #quote-skip-link para ir direto');
  assert(indexHtml.includes('id="quote-notes"'), 'Modal deve conter campo opcional #quote-notes');
  assert(indexHtml.includes('data-quote-value="4 a 8 / mês"') && indexHtml.includes('data-quote-value="10+ / mês"'), 'Demanda deve incluir opções de média de quantidade/recorrência');

  const vmRun = loadPageVm(indexHtml, { defaultProjects: defaults, hash: '#ia' });
  const modal = vmRun.dom.elements.get('quote-modal');
  const headerWa = vmRun.dom.elements.get('header-whatsapp');
  const submitBtn = vmRun.dom.elements.get('quote-submit-btn');
  const skipLink = vmRun.dom.elements.get('quote-skip-link');
  const notesInput = vmRun.dom.elements.get('quote-notes');

  assert(skipLink.href.startsWith('https://wa.me/5511991584991?text='), 'Botão de pular deve apontar direto para WhatsApp');
  assert(vmRun.evalExpr('QUOTE_FORMATS.video.includes("VSL")'), 'Opções de vídeo devem incluir VSL');
  assert(vmRun.evalExpr('QUOTE_FORMATS.default.includes("VSL")'), 'Opções padrão também devem incluir VSL');

  // Mensagem padrão quando nenhuma opção foi selecionada
  assert.strictEqual(
    vmRun.sandbox.buildQuoteMessage({}),
    vmRun.evalExpr('CONFIG.WHATSAPP_MESSAGE'),
    'Sem respostas, buildQuoteMessage deve retornar mensagem padrão'
  );

  // Abrir pelo botão do topo em #ia deve pré-selecionar área ia
  let prevented = false;
  headerWa.dispatchEvent({ type: 'click', preventDefault: () => { prevented = true; } });
  assert(prevented, 'Clique normal em #header-whatsapp deve abrir triagem antes do WhatsApp');
  assert(modal.classList.contains('is-open'), '#quote-modal deve abrir ao clicar no CTA');
  assert.strictEqual(vmRun.evalExpr('quoteState.service'), 'ia', 'Aba #ia deve pré-selecionar serviço ia');

  // Selecionar respostas (incluindo múltiplos formatos) e digitar observação atualiza link automaticamente
  vmRun.sandbox.setQuoteField('service', 'video');
  vmRun.sandbox.setQuoteField('format', 'Reels / Shorts');
  vmRun.sandbox.setQuoteField('format', 'VSL');
  vmRun.sandbox.setQuoteField('format', 'Anúncio / Criativo');
  vmRun.sandbox.setQuoteField('format', 'Reels / Shorts'); // desmarca apenas Reels / Shorts
  vmRun.sandbox.setQuoteField('volume', '4 a 8 / mês');
  vmRun.sandbox.setQuoteField('deadline', 'Esta semana');
  notesInput.value = 'Clínica odontológica, funil de vendas';
  notesInput.dispatchEvent({ type: 'input' });

  assert.deepStrictEqual(Array.from(vmRun.evalExpr('quoteState.format')), ['VSL', 'Anúncio / Criativo'], 'Formato deve permitir marcar e desmarcar múltiplos itens');

  const builtMsg = vmRun.sandbox.buildQuoteMessage(vmRun.evalExpr('quoteState'));
  assert(builtMsg.includes('Edição de vídeo'), 'Texto gerado deve incluir área escolhida');
  assert(builtMsg.includes('VSL, Anúncio / Criativo'), 'Texto gerado deve listar múltiplos formatos selecionados');
  assert(!builtMsg.includes('Reels / Shorts'), 'Formato desmarcado não deve permanecer no texto');
  assert(builtMsg.includes('4 a 8 / mês'), 'Texto gerado deve incluir média de quantidade/recorrência');
  assert(builtMsg.includes('Esta semana'), 'Texto gerado deve incluir prazo escolhido');
  assert(builtMsg.includes('Clínica odontológica, funil de vendas'), 'Texto gerado deve incluir observação digitada');

  const decodedHref = decodeURIComponent(submitBtn.href);
  assert(submitBtn.href.startsWith('https://wa.me/5511991584991?text='), '#quote-submit-btn deve gerar URL wa.me válida');
  assert(decodedHref.includes('VSL, Anúncio / Criativo'), 'URL do botão deve conter múltiplos formatos');
  assert(decodedHref.includes('Clínica odontológica, funil de vendas'), 'URL do botão deve conter texto automático');

  // Trocar área limpa formatos incompatíveis da área anterior
  vmRun.sandbox.setQuoteField('service', 'design');
  assert.deepStrictEqual(Array.from(vmRun.evalExpr('quoteState.format')), [], 'Trocar área deve limpar formatos incompatíveis');

  // Fechar com Escape limpa trava de scroll
  vmRun.dom.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert(!modal.classList.contains('is-open'), 'Escape deve fechar #quote-modal');
});

(async function runTests() {
  let passed = 0;
  console.log('--- Executando testes automatizados do portfólio ---');
  for (const t of tests) {
    try {
      await t.fn();
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
})();

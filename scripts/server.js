const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8089;
const ROOT_DIR = path.resolve(__dirname, '..');
const ALLOWED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

function validateProjectsPayload(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return false;
  const validTypes = new Set(['video', 'design']);
  const validCategories = new Set(['video', 'design', 'ia']);

  return projects.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (!validTypes.has(item.type) || !validCategories.has(item.category)) return false;
    if (typeof item.title !== 'string' || !item.title.trim()) return false;
    if (item.type === 'video' && (typeof item.id !== 'string' || !item.id.trim())) return false;
    if (item.type === 'design' && (typeof item.image !== 'string' || !item.image.trim())) return false;
    return true;
  });
}

function formatProjectsFile(projects) {
  const cleanProjects = projects.map((p) => {
    const copy = { ...p };
    if (copy.visible === true) delete copy.visible;
    return copy;
  });
  return 'window.DEFAULT_PROJECTS = ' + JSON.stringify(cleanProjects, null, 2) + ';\n';
}

function resolveSafeStaticPath(reqPath) {
  let raw = String(reqPath || '/').split('?')[0];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (raw === '/' || raw === '') raw = '/index.html';

  const relative = raw.replace(/^[/\\]+/, '');
  const segments = relative.split(/[/\\]+/).filter(Boolean);
  if (segments.some((seg) => seg === '..' || seg.startsWith('.'))) {
    return null;
  }

  const resolved = path.resolve(ROOT_DIR, relative);
  if (resolved !== ROOT_DIR && !resolved.startsWith(ROOT_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

function runCommand(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || stdout || error.message));
      }
      resolve(stdout);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Origem não autorizada.' }));
    return;
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API para Salvar e Enviar direto para o Git
  if (req.method === 'POST' && req.url === '/api/save-git') {
    let body = '';
    let aborted = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload muito grande.' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      if (aborted) return;
      try {
        const payload = JSON.parse(body);
        const projects = payload.projects;

        if (!validateProjectsPayload(projects)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Lista de projetos inválida.' }));
          return;
        }

        // 1. Atualizar public/projects.js no disco
        const projectsPath = path.join(ROOT_DIR, 'public', 'projects.js');
        fs.writeFileSync(projectsPath, formatProjectsFile(projects), 'utf8');

        // 2. Verificar se há alterações antes de commitar
        const statusOut = await runCommand('git status --porcelain public/projects.js', ROOT_DIR);
        if (!statusOut.trim()) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            message: 'Nenhuma alteração pendente para enviar.'
          }));
          return;
        }

        // 3. Executar Git add, commit e push apenas de public/projects.js
        console.log('[Git] Adicionando public/projects.js...');
        await runCommand('git add public/projects.js', ROOT_DIR);

        console.log('[Git] Criando commit...');
        await runCommand('git commit -m "feat: atualizacao de projetos via painel admin"', ROOT_DIR);

        console.log('[Git] Enviando para o GitHub (push origin main)...');
        await runCommand('git push origin main', ROOT_DIR);

        console.log('[Git] Push concluído com sucesso!');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          message: 'Alterações salvas e enviadas para o GitHub com sucesso via Git local!'
        }));
      } catch (err) {
        console.error('[Erro]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Servidor de arquivos estáticos (prioriza dist/ após build, fallback para public/ e raiz)
  const filePath = resolveSafeStaticPath(req.url);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const relativeUrl = path.relative(ROOT_DIR, filePath);
  const distCandidate = path.join(ROOT_DIR, 'dist', relativeUrl);
  const publicCandidate = path.join(ROOT_DIR, 'public', relativeUrl);
  const targetPath = fs.existsSync(distCandidate) && fs.statSync(distCandidate).isFile()
    ? distCandidate
    : fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()
      ? publicCandidate
      : filePath;

  fs.stat(targetPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(targetPath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}/admin.html`;
    console.log(`=======================================================`);
    console.log(`   Painel Admin Alan Oliveira rodando com sucesso!`);
    console.log(`   URL: ${url}`);
    console.log(`   Tudo que salvar aqui vai direto para o GitHub (git push)`);
    console.log(`=======================================================`);

    // Abre automaticamente o navegador no Windows
    exec(`start ${url}`);
  });
}

module.exports = {
  server,
  isAllowedOrigin,
  validateProjectsPayload,
  formatProjectsFile,
  resolveSafeStaticPath
};

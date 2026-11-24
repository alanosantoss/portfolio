const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8089;
const ROOT_DIR = path.resolve(__dirname, '..');

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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const projects = payload.projects;

        if (!Array.isArray(projects) || projects.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Lista de projetos inválida.' }));
          return;
        }

        const cleanProjects = projects.map(p => {
          const copy = { ...p };
          if (copy.visible === true) delete copy.visible;
          return copy;
        });

        // 1. Atualizar index.html no disco
        const indexPath = path.join(ROOT_DIR, 'index.html');
        let indexHtml = fs.readFileSync(indexPath, 'utf8');
        indexHtml = indexHtml.replace(
          /PROJECTS:\s*\[[\s\S]*?\](?=\s*\n\s*\}\s*;)/,
          'PROJECTS: ' + JSON.stringify(cleanProjects, null, 2)
        );
        fs.writeFileSync(indexPath, indexHtml, 'utf8');

        // 2. Atualizar admin.html no disco
        const adminPath = path.join(ROOT_DIR, 'admin.html');
        let adminHtml = fs.readFileSync(adminPath, 'utf8');
        adminHtml = adminHtml.replace(
          /const\s+DEFAULT_PROJECTS\s*=\s*\[[\s\S]*?\];/,
          'const DEFAULT_PROJECTS = ' + JSON.stringify(projects, null, 2) + ';'
        );
        fs.writeFileSync(adminPath, adminHtml, 'utf8');

        // 3. Executar Git add, commit e push
        console.log('[Git] Adicionando arquivos modificados...');
        await runCommand('git add index.html admin.html', ROOT_DIR);

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

  // Servidor de arquivos estáticos
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/admin.html`;
  console.log(`=======================================================`);
  console.log(`   Painel Admin Alan Oliveira rodando com sucesso!`);
  console.log(`   URL: ${url}`);
  console.log(`   Tudo que salvar aqui vai direto para o GitHub (git push)`);
  console.log(`=======================================================`);

  // Abre automaticamente o navegador no Windows
  exec(`start ${url}`);
});

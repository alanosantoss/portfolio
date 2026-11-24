const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Executando testes automatizados do portfólio ---');

const indexPath = path.join(__dirname, '..', 'index.html');

// 1. Arquivo existe
if (!fs.existsSync(indexPath)) {
  console.error('FAIL: index.html não foi encontrado!');
  process.exit(1);
}
console.log('PASS: index.html existe.');

const html = fs.readFileSync(indexPath, 'utf8');

// 2. Estrutura HTML5 essencial
const requiredTags = [
  '<!DOCTYPE html>',
  '<html lang="pt-BR">',
  '<meta charset="UTF-8"',
  '<meta name="viewport"',
  '<title>',
  'class="site-header"',
  'id="videos"',
  'id="video-grid"',
  'id="lightbox"',
  'id="lightbox-content"',
  'id="lightbox-close"',
  'id="lightbox-prev"',
  'id="lightbox-next"',
  'class="site-footer"'
];

for (const tag of requiredTags) {
  if (!html.includes(tag)) {
    console.error(`FAIL: Tag/ID obrigatório não encontrado: "${tag}"`);
    process.exit(1);
  }
}
console.log('PASS: Estrutura HTML5 e IDs principais presentes.');

// 3. Os 4 IDs de vídeo do YouTube especificados
const expectedVideoIds = [
  '8lmrTdA1EsU',
  '0GgqcRnrNhs',
  'Gau-fbkBrrw',
  'R1g2IAmim6A'
];

for (const id of expectedVideoIds) {
  if (!html.includes(id)) {
    console.error(`FAIL: ID do vídeo ${id} não está presente no index.html!`);
    process.exit(1);
  }
}
console.log('PASS: Todos os 4 IDs de vídeo do YouTube estão configurados.');

// 4. Teste de sintaxe do JavaScript incorporado
const scriptRegex = /<script>([\s\S]*?)<\/script>/i;
const match = html.match(scriptRegex);
if (!match || !match[1]) {
  console.error('FAIL: Bloco de script não encontrado no index.html!');
  process.exit(1);
}

try {
  new vm.Script(match[1]);
  console.log('PASS: Sintaxe do JavaScript é 100% válida.');
} catch (err) {
  console.error('FAIL: Erro de sintaxe no JavaScript do index.html:', err.message);
  process.exit(1);
}

// 5. Verificação da formatação de links e embeds
if (!html.includes('https://www.youtube.com/embed/') && !html.includes('https://www.youtube-nocookie.com/embed/')) {
  console.error('FAIL: URL base de embed do YouTube não encontrada.');
  process.exit(1);
}
if (!html.includes('maxresdefault.jpg') || !html.includes('hqdefault.jpg')) {
  console.error('FAIL: URLs e fallback de miniaturas do YouTube ausentes.');
  process.exit(1);
}
console.log('PASS: Embeds e fallbacks do YouTube validados com sucesso.');

console.log('=============================================');
console.log('TODOS OS TESTES PASSARAM COM SUCESSO! (5/5)');
console.log('=============================================');

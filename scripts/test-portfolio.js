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
  'class="brand"',
  'class="nav-links"',
  'id="category-nav"',
  'id="sub-nav"',
  'id="gallery-grid"',
  'id="about-section"',
  'id="lightbox"',
  'id="lightbox-content"',
  'id="lightbox-close"',
  'id="lightbox-prev"',
  'id="lightbox-next"'
];

for (const tag of requiredTags) {
  if (!html.includes(tag)) {
    console.error(`FAIL: Tag/ID obrigatório não encontrado: "${tag}"`);
    process.exit(1);
  }
}
console.log('PASS: Estrutura HTML5 e IDs principais presentes.');

// 3. IDs de vídeo do YouTube configurados (9:16 e 16:9)
const expectedVideoIds = [
  'aNsA0iwBbqc',
  'hc9Rki1utnc',
  'cWRKCqN4UW4',
  'U45LaKKHQkU',
  '12uuS-EIivE',
  '8sODZhQfBAI',
  'TCaRDs6_cV0',
  'ZgsA0pQszPk',
  'cC3g1TvjrX0',
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
console.log(`PASS: Todos os ${expectedVideoIds.length} IDs de vídeo do YouTube estão configurados.`);

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

// 6. Verificação de canais de contato e ausência de Instagram
if (!html.includes('5511991584991')) {
  console.error('FAIL: Número de WhatsApp atualizado não encontrado.');
  process.exit(1);
}
if (!html.includes('alan-oliveira-765286274')) {
  console.error('FAIL: URL do LinkedIn atualizado não encontrado.');
  process.exit(1);
}
if (html.includes('id="social-instagram"') || html.includes('id="about-instagram"') || html.includes('instagram.com')) {
  console.error('FAIL: Referências ao Instagram ainda estão presentes no index.html!');
  process.exit(1);
}
console.log('PASS: Contatos (WhatsApp, LinkedIn, Email) e remoção do Instagram validados.');

// 7. Verificação da foto de perfil e novos textos da seção Sobre
const avatarPath = path.join(__dirname, '..', 'assets', 'alan-oliveira.jpg');
if (!fs.existsSync(avatarPath)) {
  console.error('FAIL: Foto de perfil assets/alan-oliveira.jpg não encontrada!');
  process.exit(1);
}
if (!html.includes('assets/alan-oliveira.jpg')) {
  console.error('FAIL: Referência à foto de perfil ausente no index.html!');
  process.exit(1);
}
const expectedAboutSections = [
  'Edição de Vídeo',
  'Design & Imagens com IA',
  'Landing Pages, Automações & IA',
  'Como eu trabalho'
];
for (const sec of expectedAboutSections) {
  if (!html.includes(sec)) {
    console.error(`FAIL: Seção "${sec}" ausente no Sobre!`);
    process.exit(1);
  }
}
console.log('PASS: Foto de perfil e textos editoriais da seção Sobre validados.');

// 8. Verificação de reprodução inline e otimizações de nitidez
const inlineFeatures = [
  'playInlineVideo',
  'stopCurrentInlineVideo',
  'inline-video-iframe',
  'inline-close-btn',
  'image-rendering: -webkit-optimize-contrast'
];
for (const feature of inlineFeatures) {
  if (!html.includes(feature)) {
    console.error(`FAIL: Recurso inline ausente: "${feature}"`);
    process.exit(1);
  }
}
console.log('PASS: Reprodução de vídeo inline e otimizações de nitidez validadas.');

// 9. Verificação do Painel Admin e Suporte a Drag & Drop
const adminPath = path.join(__dirname, '..', 'admin.html');
if (!fs.existsSync(adminPath)) {
  console.error('FAIL: admin.html não foi encontrado!');
  process.exit(1);
}
const adminHtml = fs.readFileSync(adminPath, 'utf8');

const adminRequired = [
  'draggable',
  'dataTransfer',
  'dragstart',
  'drop',
  'portfolio_projects',
  'btn-add',
  'btn-save',
  'btn-copy-code'
];
for (const req of adminRequired) {
  if (!adminHtml.includes(req)) {
    console.error(`FAIL: Recurso do admin ausente: "${req}"`);
    process.exit(1);
  }
}

// Verifica sintaxe do JS no admin.html
const adminScriptMatch = adminHtml.match(/<script>([\s\S]*?)<\/script>/i);
if (!adminScriptMatch || !adminScriptMatch[1]) {
  console.error('FAIL: Script não encontrado no admin.html!');
  process.exit(1);
}
try {
  new vm.Script(adminScriptMatch[1]);
  console.log('PASS: Painel Admin (admin.html), Drag & Drop e sintaxe JS validados.');
} catch (err) {
  console.error('FAIL: Erro de sintaxe no JavaScript do admin.html:', err.message);
  process.exit(1);
}

if (!html.includes('admin.html') || !html.includes('portfolio_projects')) {
  console.error('FAIL: Integração com admin.html ou portfolio_projects ausente no index.html!');
  process.exit(1);
}
console.log('PASS: index.html integrado ao Painel Admin e localStorage.');

console.log('=============================================');
console.log('TODOS OS TESTES PASSARAM COM SUCESSO! (9/9)');
console.log('=============================================');

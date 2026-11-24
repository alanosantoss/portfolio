# Portfólio — Alan Oliveira

Portfólio minimalista e editorial de edição de vídeo, motion e direção criativa, com player cinema integrado (lightbox) para vídeos do YouTube e pronto para publicação no **GitHub Pages**.

---

## 🚀 Como Publicar no GitHub Pages (Passo a Passo)

### 1. Criar um repositório no seu GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Dê um nome ao repositório (exemplo: `portfolio` ou `<seu-usuario>.github.io`).
3. Deixe o repositório como **Public** (Público) e clique em **Create repository**.

### 2. Conectar e Enviar os Arquivos
No terminal desta pasta, execute os comandos abaixo substituindo `<SEU_USUARIO>` e `<NOME_DO_REPO>`:

```bash
git remote add origin https://github.com/<SEU_USUARIO>/<NOME_DO_REPO>.git
git push -u origin main
```

### 3. Ativar o GitHub Pages
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment > Branch**:
   * Selecione a branch: `main`
   * Selecione a pasta: `/(root)`
   * Clique em **Save**.
4. Em cerca de 1 a 2 minutos, o GitHub exibirá o link público do seu site (ex: `https://<seu-usuario>.github.io/portfolio/`).

---

## ⚙️ Como Personalizar Seus Dados

Abra o arquivo `index.html` e edite o objeto `CONFIG` no início da tag `<script>` (por volta da linha 470):

```javascript
const CONFIG = {
  // Contatos e Redes Sociais
  WHATSAPP_NUMBER: "5500000000000", // Coloque seu DDD + Número
  WHATSAPP_MESSAGE: "Olá Alan, vi seu portfólio...",
  EMAIL: "seuemail@exemplo.com",
  INSTAGRAM_URL: "https://instagram.com/seuusuario",
  LINKEDIN_URL: "https://linkedin.com/in/seuusuario",

  // Os 4 vídeos do YouTube
  VIDEOS: [
    {
      id: "8lmrTdA1EsU",
      tag: "Destaque • Edição",
      fallbackTitle: "Showreel & Edição de Alto Impacto"
    },
    ...
  ]
};
```

---

## 🧪 Testes Automatizados

Para rodar os testes de validação localmente:

```bash
node scripts/test-portfolio.js
```

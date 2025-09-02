# 🖼️ API de Screenshots - Scraping e Captura de Imagens

Uma API Node.js robusta para capturar screenshots de páginas web com suporte a diferentes dispositivos, proteção anti-bot e upload automático para AWS S3.

## ✨ Funcionalidades

- 📸 **Captura de Screenshots**: Desktop e mobile
- 🛡️ **Proteção Anti-Bot**: Configurações avançadas para sites protegidos (Braip, etc.)
- ☁️ **Upload S3**: Armazenamento automático na AWS
- 🔄 **Sistema de Retry**: Múltiplas tentativas com diferentes estratégias
- 🚀 **Rate Limiting**: Controle de requisições
- 🔒 **Autenticação**: Sistema de API keys
- 📊 **Health Checks**: Monitoramento de saúde da API
- 🎯 **Validação**: Validação robusta de entrada

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd scrape-screenshot
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Instale o Playwright
```bash
npm run install-browsers
```

### 4. Configure as variáveis de ambiente
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Configurações AWS S3
AWS_ACCESS_KEY_ID=sua_access_key_aqui
AWS_SECRET_ACCESS_KEY=sua_secret_key_aqui
AWS_REGION=us-east-1
S3_BUCKET_NAME=seu_bucket_aqui

# API Key (opcional)
API_KEY=sua_api_key_aqui
```

### 5. Inicie o servidor
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📚 Uso da API

### Endpoint Principal

**POST** `/api/screenshot`

Captura screenshots de uma URL.

#### Headers
```
Content-Type: application/json
x-api-key: demo-key (opcional em desenvolvimento)
```

#### Body
```json
{
  "url": "https://exemplo.com",
  "productId": "produto123",
  "type": "both",
  "forceRefresh": false
}
```

#### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `url` | string | ✅ | URL para capturar screenshot |
| `productId` | string | ❌ | ID do produto (para organização) |
| `type` | string | ❌ | Tipo: `desktop`, `mobile` ou `both` (padrão) |
| `forceRefresh` | boolean | ❌ | Força nova captura (padrão: false) |

#### Resposta de Sucesso
```json
{
  "success": true,
  "screenshots": {
    "desktop": "https://s3.amazonaws.com/bucket/desktop.jpg",
    "mobile": "https://s3.amazonaws.com/bucket/mobile.jpg"
  },
  "cached": false,
  "metadata": {
    "url": "https://exemplo.com",
    "productId": "produto123",
    "capturedAt": "2024-01-15T10:30:00.000Z",
    "type": "both"
  }
}
```

#### Resposta de Erro
```json
{
  "success": false,
  "error": "Falha ao capturar screenshots",
  "details": "Detalhes do erro"
}
```

### Health Check

**GET** `/health` - Health check global
**GET** `/api/screenshot/health` - Health check específico do serviço

## 🔧 Configurações Avançadas

### Proteção Anti-Bot

A API detecta automaticamente sites que requerem proteção anti-bot (como Braip) e aplica:

- User agents realistas
- Headers HTTP avançados
- Scripts de stealth no navegador
- Simulação de comportamento humano
- Tratamento de desafios Cloudflare

### Rate Limiting

- **Padrão**: 100 requisições por 15 minutos
- **Configurável**: Via variáveis de ambiente

### Estratégias de Carregamento

A API usa múltiplas estratégias para garantir capturas bem-sucedidas:

1. `load` - Aguarda evento load
2. `networkidle` - Aguarda rede inativa
3. `domcontentloaded` - Aguarda DOM carregado

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
src/
├── config/           # Configurações
├── middleware/       # Middlewares (auth, validation)
├── routes/          # Rotas da API
├── services/        # Serviços (screenshot, cache)
├── utils/           # Utilitários (S3, cache)
└── server.js        # Servidor principal
```

### Scripts Disponíveis

```bash
npm start          # Inicia em produção
npm run dev        # Inicia em desenvolvimento
npm run install-browsers  # Instala navegadores do Playwright
```

### Logs

A API gera logs detalhados para debugging:

```
[2024-01-15T10:30:00.000Z] POST /api/screenshot - IP: 127.0.0.1
Iniciando captura de screenshot para: https://exemplo.com
Iniciando navegador para https://exemplo.com (aprimorado: false)...
Navegador iniciado...
```

## 🚀 Deploy

### Variáveis de Ambiente para Produção

```env
NODE_ENV=production
PORT=3000
AWS_ACCESS_KEY_ID=sua_access_key
AWS_SECRET_ACCESS_KEY=sua_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=seu_bucket
API_KEY=sua_api_key_segura
ALLOWED_ORIGINS=https://seudominio.com
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN npx playwright install chromium

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

## 🔒 Segurança

- ✅ Validação de entrada com Joi
- ✅ Rate limiting
- ✅ Headers de segurança com Helmet
- ✅ CORS configurável
- ✅ Autenticação por API key
- ✅ Sanitização de URLs

## 📊 Monitoramento

### Health Checks

```bash
# Verificar saúde geral
curl http://localhost:3001/health

# Verificar saúde do serviço de screenshots
curl http://localhost:3001/api/screenshot/health
```

### Métricas

A API registra:
- Tempo de captura
- Taxa de sucesso/erro
- Uso de recursos
- Requisições por minuto

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de S3**: Verifique as credenciais AWS
2. **Timeout**: Aumente os timeouts nas configurações
3. **Sites protegidos**: A API detecta automaticamente e aplica proteção
4. **Rate limit**: Ajuste as configurações de rate limiting

### Logs de Debug

Para mais detalhes, verifique os logs do console ou configure um sistema de logging.

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato.

---

**Desenvolvido com ❤️ para facilitar a captura de screenshots em escala**

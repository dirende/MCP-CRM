# CLAUDE.md — MCP-CRM Integration

## Panoramica del progetto

**MCP-CRM Integration** è una SmartUI per il framework **Genesys Pure Embeddable Framework (PEF)** che:

1. Si mette in ascolto sul transcript live della conversazione Genesys ed estrae: nome cliente, telefono/email, tipo richiesta (nuovo case o case esistente con numero/data).
2. Recupera le ultime interazioni del cliente da **Genesys Cloud API** (media type, data, wrapup code).
3. Interagisce con **ServiceNow** per creare nuovi case o estrarre case aperti, con screen pop alla URL del case.

L'integrazione gira come SmartUI React/TypeScript bundlata in un singolo JS file, caricata direttamente dal PEF framework Genesys nel widget dell'agente. Il backend espone REST API su Docker.

---

## Struttura del progetto

```
MCP-CRM/
├── CLAUDE.md                              # questo file
├── resourses/
│   └── info.txt                           # brief di progetto originale
├── smartui-embedcustomurl/                # PROGETTO DI RIFERIMENTO (SmartUI base)
│   ├── src/
│   │   ├── index.tsx                      # entry point: espone interactionGlobalViewInit / interactionViewInit
│   │   ├── App.tsx                        # root React component
│   │   ├── components/
│   │   │   ├── CloseBar.tsx               # header bar con pulsante close (MUI)
│   │   │   ├── iframe.tsx                 # wrapper iframe con embeddedUrl
│   │   │   ├── iframeStretch.tsx
│   │   │   ├── CustomMessage.tsx
│   │   │   └── MessageIcon.tsx
│   │   ├── models/interfaces/params.tsx   # interfaccia Params (embeddedUrl, style, onClose, onOpen…)
│   │   └── utils/Logger.tsx               # Logger statico con loggerName
│   ├── webpack.config.js                  # build produzione (con obfuscation)
│   ├── webpack.config.dev.js              # build dev (watch, no obfuscation)
│   ├── package.json                       # dipendenze: React, MUI, @softphone/cti-connector-jsdk
│   ├── tsconfig.json
│   └── dist/smartui-embedcustomurl.js     # bundle finale (file prodotto dal build)
├── simulator/
│   ├── index.html                         # loader PEF (iframe sx nel simulatore)
│   ├── mcp-crm.html                       # UI principale del simulatore MCP-CRM
│   ├── simulator.css
│   └── favicon.svg
├── lib/
│   ├── iwsconfig.js                       # config Genesys PEF (environment, clientIds, smartUi)
│   ├── iwsscript.js                       # handlers eventi PEF (voice, email, webmessaging, SMS…)
│   ├── iwsprescript.js                    # pre-handlers PEF (gestione memoria interazioni)
│   ├── browserWinCommunication.js         # comunicazione inter-frame
│   └── smartui-embedcustomurl.js          # bundle dist copiato qui per il serve (1.7MB)
└── js/
    ├── softphone-connector-core.min.js
    └── softphone-connector-smart-ui.min.js
```

**Da creare:**
```
smartui-mcp-crm/                           # NUOVA SmartUI MCP-CRM (stesso pattern di smartui-embedcustomurl)
├── src/
│   ├── index.tsx                          # entry: interactionGlobalViewInit + interactionViewInit
│   ├── App.tsx                            # root React component
│   ├── components/
│   │   ├── CloseBar.tsx                   # riusa da smartui-embedcustomurl
│   │   ├── CustomerIntelCard.tsx          # card transcript / customer info
│   │   ├── InteractionHistoryCard.tsx     # card history Genesys
│   │   └── ServiceNowCard.tsx             # card cases ServiceNow
│   ├── models/interfaces/params.tsx       # Params MCP-CRM
│   ├── hooks/
│   │   ├── useGenesysHistory.ts
│   │   ├── useServiceNowCases.ts
│   │   └── useTranscriptAnalysis.ts
│   └── utils/Logger.tsx
├── webpack.config.js
├── webpack.config.dev.js
├── package.json
├── tsconfig.json
└── dist/smartui-mcp-crm.js               # bundle finale → copiare in /lib/

backend/                                   # Backend Node.js/Express su Docker
├── server.js
├── routes/
│   ├── transcript.js                      # POST /api/transcript/analyze
│   ├── genesys.js                         # GET  /api/genesys/history
│   └── servicenow.js                      # GET/POST /api/servicenow/cases
├── agents/
│   ├── genesysAgent.js
│   ├── servicenowAgent.js
│   └── webSearchAgent.js
├── Dockerfile
└── docker-compose.yml
```

---

## Credenziali e configurazione

**Le credenziali NON vanno nel codice.** Usare variabili d'ambiente via `.env` (non committare mai `.env`).

```env
# Genesys Cloud
GENESYS_CLIENT_ID=6fa53f73-6ad4-473f-b492-c9cbae80be29
GENESYS_CLIENT_SECRET=vv0An5RENz3FfJd96XosqFLgLRFzANKXuyrMoOesSYE
GENESYS_ENVIRONMENT=mypurecloud.com
GENESYS_ORG=softphoneit

# ServiceNow
SNOW_INSTANCE=https://ven07529.service-now.com
SNOW_CLIENT_ID=77835641066f4ebf92d8e8f39db47283
SNOW_CLIENT_SECRET=P5,#<QJ|$D6FkOpOPT#X:s-pYSJhVSmd
SNOW_REDIRECT_URL=http://localhost:5678/rest/oauth2-credential/callback

# Claude AI (per transcript analysis)
ANTHROPIC_API_KEY=<da configurare>

# Server
PORT=3000
```

**Genesys login UI:** nicola.dirende@softphone.it / Nerone.71 (solo per console dev, non usare in codice)

---

## Architettura SmartUI — pattern da `smartui-embedcustomurl`

La SmartUI è un'app **React + TypeScript** compilata con **Webpack** in un **singolo file JS** che viene caricato dinamicamente dal PEF framework nel widget Genesys.

### Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| UI | React 18 + TypeScript 4.8 |
| Componenti | MUI (Material UI) v5 |
| Build | Webpack 5 + ts-loader |
| Bundle output | `dist/smartui-mcp-crm.js` (singolo file) |
| SDK Genesys | `@softphone/cti-connector-jsdk` (devDep) |
| API Genesys | `purecloud-platform-client-v2` (devDep) |
| Prod build | con `webpack-obfuscator` |

### Entry point obbligatori (esposti su `window`)

Il PEF framework chiama automaticamente queste funzioni quando monta la SmartUI:

```ts
// src/index.tsx

// Per view globali (pannello fisso nel widget, non legato a interazione)
function interactionGlobalViewInit(params: Params | undefined, id: string) { ... }

// Per interaction view (pannello per-interazione, aperto da ConnectorLocalViewAdded)
function interactionViewInit(ctiMessage: CtiMessage | undefined, params: Params | undefined, id: string) { ... }

// Esporre entrambi su window:
(window as any)["interactionGlobalViewInit"] = interactionGlobalViewInit;
(window as any)["interactionViewInit"] = interactionViewInit;
```

### Inizializzazione params

I `params` vengono letti da `iwscore.getConnectorConfig().smartUi.globalViews` oppure passati direttamente via `ConnectorLocalViewAdded`. Se arrivano come stringa JSON (da Genesys config), devono essere parsati con `JSON.parse` + `eval` per le funzioni serializzate:

```ts
if (typeof params === "string") {
    params = JSON.parse(params, (key, value) => {
        try { return eval("(" + value + ")"); } catch(e) { return value; }
    }) as Params;
}
```

### Accesso alle API Genesys dall'interno della SmartUI

```ts
// In App.tsx o in un hook
import * as connector from '@softphone/cti-connector-jsdk';
import { PureClientSdk } from '@softphone/cti-connector-jsdk/types/gc/pureClientSdk';
declare var pClient: PureClientSdk;

// pClient è già inizializzato e autenticato dal PEF — usarlo direttamente:
const conversations = await pClient.conversationsApi.getConversations();
const transcript = await pClient.conversationsApi.getConversationIdMessageTranscript(convId);
```

### Montaggio React

```ts
function interactionViewInit(ctiMessage, params, id) {
    const container = document.getElementById(id);
    container?.classList.add("smartui-mcp-crm");
    const root = createRoot(container!);
    root.render(<App ctiMessage={ctiMessage} params={params!} id={id} />);
}
```

### Interfaccia Params MCP-CRM (da definire in `src/models/interfaces/params.tsx`)

```ts
export interface Params {
    onClose?: MouseEventHandler<HTMLButtonElement>;
    onOpen?: ((args: Params) => void | Promise<void>);
    title?: string;
    headerHidden?: boolean;
    headerColor?: string;
    headerTextColor?: string;
    backendUrl?: string;   // URL del backend Node.js (es. http://localhost:3000)
}
```

### Logger pattern (riusa da `smartui-embedcustomurl`)

```ts
export class Logger {
    static loggerName: string;
    static log = (module: string, data: any) => console.log(`[${Logger.loggerName}]${module}:`, data);
    static error = (module: string, data: any) => console.error(`[${Logger.loggerName}]${module}:`, data);
}
```

### package.json della SmartUI (modello)

```json
{
  "name": "@softphone/smartui-mcp-crm",
  "scripts": {
    "build": "webpack --config webpack.config.js",
    "dev":   "webpack --config webpack.config.dev.js --watch"
  },
  "dependencies": {
    "@emotion/react": "^11", "@emotion/styled": "^11",
    "@mui/icons-material": "^5", "@mui/material": "^5",
    "react": "^18", "react-dom": "^18",
    "typescript": "^4.8", "colord": "^2.9"
  },
  "devDependencies": {
    "@softphone/cti-connector-jsdk": "4.1.34",
    "purecloud-platform-client-v2": "135.0.0",
    "ts-loader": "^9", "css-loader": "^6", "style-loader": "^3",
    "webpack": "^5", "webpack-cli": "^4", "webpack-obfuscator": "^3.5"
  }
}
```

### tsconfig.json (modello — stesso di smartui-embedcustomurl)

```json
{
  "compilerOptions": {
    "target": "es5", "module": "esnext", "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true, "esModuleInterop": true,
    "skipLibCheck": true, "declaration": true, "declarationDir": "./types",
    "typeRoots": ["./index.d.ts", "./types/*.d.ts", "./node_modules/@softphone", "./node_modules/@types"]
  }
}
```

### Build commands

```bash
# Dev (watch, non obfuscato)
cd smartui-mcp-crm && npm run dev

# Produzione (obfuscato)
cd smartui-mcp-crm && npm run build

# Copiare il bundle in /lib/ per il serve statico
cp smartui-mcp-crm/dist/smartui-mcp-crm.js lib/
```

### Test locale con VSCode LiveServer

Usare `pef-simulator.html` (stesso pattern di `smartui-embedcustomurl/public/pef-simulator.html`) che:
1. Carica il PEF con `iwscore.initCTI(config)`
2. Registra la SmartUI in `globalViews` o la inietta via `addView(msg)` negli handler eventi

---

## Pattern di integrazione PEF (Genesys)

Il PEF (Pure Embeddable Framework) carica gli script dall'iframe (`index.html`) e li esegue nel contesto dell'agente autenticato.

### Flusso eventi

```
Genesys Cloud → PEF iframe → iwsscript.js handler → dispatchEvent ConnectorLocalViewAdded
                                                             ↓
                                              PEF carica jspath → bundle SmartUI JS
                                                             ↓
                                              chiama interactionViewInit(ctiMessage, params, id)
                                                             ↓
                                              React monta App dentro #<id> container
```

### Registrare la SmartUI come interaction view (in `iwsscript.js`)

```js
function mcpCrmAddView(msg) {
    let obj = {
        id: "smartui-mcp-crm",
        classname: "smartui-mcp-crm",
        title: "MCP-CRM Integration",
        jspath: "/lib/smartui-mcp-crm.js",
        icon: "contact_phone",
        autoStart: true,
        type: "interaction",
        hideHeader: true,
        params: {
            onClose: () => {
                iwscore.sendCustomEvent("ConnectorInteractionRemoved", { interactionDeleted: msg.InteractionID });
                document.getElementById("pureFrame")?.focus();
            },
            onOpen: () => new Promise(resolve => setTimeout(() => resolve(true), 500)),
            backendUrl: "http://localhost:3000"
        }
    };
    obj.ctiMessage = msg;
    window.dispatchEvent(new CustomEvent(enumCustomEventType.ConnectorLocalViewAdded, { detail: obj }));
}
```

### Canali supportati e contact info extraction

| Evento PEF | MediaType | ContactInfo |
|------------|-----------|-------------|
| `onEventEstablishedInbound` | voice | `message.ANI` |
| `onEventEstablishedOutbound` | voice | `message.DNIS` |
| `onEmailEventEstablishedInbound` | email | `message.ANI` |
| `onWebmessagingEventEstablishedInbound` | webmessaging | `attachdata.email` \|\| `attachdata.emailaddress` |
| `onSMSEventEstablishedInbound` | sms | `message.ANI` |
| `onWhatsappEventEstablishedInbound` | whatsapp | `message.ANI` |

---

## API Backend

### Genesys Cloud API

- **Auth:** OAuth2 Client Credentials → `POST https://login.mypurecloud.com/oauth/token`
- **Conversations history:** `GET /api/v2/conversations` con filtri su `address` (phone/email)
- **Transcript:** `GET /api/v2/conversations/{id}/messages/transcripts` (webmessaging)
- **Wrapup codes:** inclusi nella conversation

Riferimento: https://developer.genesys.cloud/devapps/api-explorer-standalone

### ServiceNow REST API

- **Base URL:** `https://ven07529.service-now.com/api/now/`
- **Auth:** OAuth2 (client credentials o password flow)
- **Query cases:** `GET /api/now/table/incident?sysparm_query=caller_id.phone=<phone>^state!=7`
- **Create case:** `POST /api/now/table/incident`
- **Screen pop URL:** `https://ven07529.service-now.com/incident.do?sys_id=<sys_id>`

### Endpoints backend esposti

```
GET  /api/genesys/history?contactInfo=<phone|email>
GET  /api/servicenow/cases?contactInfo=<phone|email>
POST /api/servicenow/cases          body: { contactInfo, interactionId, short_description }
POST /api/transcript/analyze        body: { contactInfo, interactionId }
```

---

## Agenti AI

Costruiti secondo le linee guida Anthropic (Claude API con tool use):

### GenesysAgent
- Tool `get_conversation_history(address, mediaType?, limit?)` → chiama Genesys `/api/v2/conversations`
- Tool `get_transcript(conversationId)` → recupera trascrizione webmessaging
- Tool `get_wrapup_codes()` → lista wrapup codes org

### ServiceNowAgent
- Tool `search_incidents(query)` → query su tabella `incident`
- Tool `create_incident(short_description, caller_info, description?)` → crea nuovo caso
- Tool `get_incident_url(sys_id)` → restituisce URL screen pop

### WebSearchAgent
- Tool `web_search(query)` → ricerca info generali (documentazione, troubleshooting)

### TranscriptAnalysisAgent (Claude)
- Analizza il testo del transcript e restituisce JSON strutturato:
  ```json
  {
    "customerName": "...",
    "contact": "phone|email",
    "requestType": "new_case|existing_case",
    "caseNumber": "INC...",
    "caseDate": "YYYY-MM-DD",
    "excerpt": "..."
  }
  ```

---

## Docker / Deploy

Il progetto si deploya su Docker locale del cliente.

```dockerfile
# Dockerfile base per backend Node.js
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  mcp-crm-backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped

  mcp-crm-frontend:
    image: nginx:alpine
    volumes:
      - ./simulator:/usr/share/nginx/html/simulator
      - ./lib:/usr/share/nginx/html/lib
      - ./js:/usr/share/nginx/html/js
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    ports:
      - "8080:80"
    depends_on:
      - mcp-crm-backend
```

---

## Comandi utili

```bash
# Avviare il backend in sviluppo
cd backend && npm run dev

# Build e avvio Docker
docker-compose up --build

# Test API Genesys
curl -X POST https://login.mypurecloud.com/oauth/token \
  -d "grant_type=client_credentials&client_id=$GENESYS_CLIENT_ID&client_secret=$GENESYS_CLIENT_SECRET"

# Test API ServiceNow
curl -u "$SNOW_USER:$SNOW_PASS" \
  "https://ven07529.service-now.com/api/now/table/incident?sysparm_limit=1"
```

---

## Convenzioni di codice

- **React + TypeScript** per la SmartUI; **JavaScript ES2020+** per backend Node.js.
- Gli handler PEF in `iwsscript.js` seguono il pattern `onEvent<Channel><Type>(message)`.
- Il simulatore (`mcp-crm.html`) ha mock data locali attivabili quando backend è `OFF`.
- `window.mcpCrm` è il bus di eventi del simulatore: `onInteractionStarted(msg, contactInfo)` e `onInteractionEnded(msg)`.
- I log del simulatore usano `mcpLog(msg, type)` — type: `'suc'|'err'|'info'|'warn'|'api'`.
- I log della SmartUI React usano la classe `Logger` statica (stesso pattern di `smartui-embedcustomurl`).
- Non modificare i file `.min.js` (sono librerie Softphone SRL).
- Non modificare `smartui-embedcustomurl/dist/` (bundle del progetto di riferimento, non del progetto MCP-CRM).
- Il bundle finale della nuova SmartUI è `smartui-mcp-crm/dist/smartui-mcp-crm.js`, copiato in `lib/`.

---

## Istruzioni operative per Claude

- **Massimo accesso:** procedi in autonomia, non chiedere conferme sui comandi da eseguire.
- Fai test preliminari su API Genesys e ServiceNow prima di implementare.
- Usa dati mock per validare il flusso UI, poi attiva backend reale.
- Testa ogni scenario: voice inbound, email inbound, webmessaging/chat, WhatsApp.
- Deploya sul Docker locale quando i test sono superati.
- Usa **MCP Google DevTools** per simulazioni via browser se necessario.
- Segnala solo se ci sono ambiguità bloccanti, altrimenti procedi e aggiorna il log.

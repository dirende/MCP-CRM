import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import './index.css';
import App from './App';
import { Params } from './models/interfaces/params';
import { Logger } from './utils/Logger';
// iwscore, pClient, CtiMessage etc. sono dichiarati in index.d.ts
// e iniettati a runtime dal PEF — non importare il SDK qui

// Mappa id → Root React, per poter fare unmount quando necessario
const roots = new Map<string, Root>();

// Fallback legacy/globalView: se il PEF non chiama interactionGlobalViewInit
// entro 500ms, lo facciamo noi (es. apertura diretta della pagina in dev)
var initTimeout = setTimeout(() => {
    try {
        Logger.loggerName = 'smartui-mcp-crm';
        Logger.log('Init', 'Legacy/GlobalView mode');
        const moduleConfig = iwscore.getConnectorConfig().smartUi?.globalViews?.find(
            (x: any) => x.id === Logger.loggerName
        );
        if (moduleConfig) {
            interactionGlobalViewInit(undefined, Logger.loggerName);
        }
    } catch (e) {
        Logger.warn('Init', 'iwscore not available — standalone/demo mode');
    }
}, 500);

/**
 * Chiamata dal PEF per view globali (pannello fisso, non legato a interazione).
 */
function interactionGlobalViewInit(params: Params | undefined, id: string = 'smartui-mcp-crm') {
    clearTimeout(initTimeout);
    Logger.loggerName = id;

    if (!params) {
        Logger.log('interactionGlobalViewInit', 'Reading params from config...');
        let moduleConfig: any;

        if ((window as any)['Softphone']) {
            moduleConfig = (window as any)['Softphone']?.Configuration?.data
                ?.softphon_softphon_connectorconfiguration_views
                ?.find((x: any) => x.softphon_smartuiviewid?.replaceAll('-', '') === id);
            params = (moduleConfig?.softphon_data || moduleConfig?.softphon_params) as Params;
        }

        if (!params) {
            moduleConfig = iwscore.getConnectorConfig().smartUi?.globalViews?.find(
                (x: any) => x.id === id
            ) as any;
            params = (moduleConfig?.data || moduleConfig?.params) as Params;
        }
    }

    params = parseParamsIfString(params);
    Logger.log('interactionGlobalViewInit', params);
    mountApp(undefined, params, id);
}

/**
 * Chiamata dal PEF per interaction view (pannello per-interazione,
 * aperto via ConnectorLocalViewAdded).
 */
function interactionViewInit(
    ctiMessage: CtiMessage | undefined,
    params: Params | undefined,
    id: string = 'smartui-mcp-crm-' + ctiMessage?.InteractionID
) {
    clearTimeout(initTimeout);
    Logger.loggerName = id;
    params = parseParamsIfString(params);
    Logger.log('interactionViewInit', { ctiMessage, params, id });
    mountApp(ctiMessage, params, id);
}

/**
 * Smonta il root React associato a un container id.
 * Utile per la demo e per scenari di re-render.
 */
function mcpCrmUnmount(id: string) {
    const root = roots.get(id);
    if (root) {
        root.unmount();
        roots.delete(id);
        Logger.log('mcpCrmUnmount', `Unmounted #${id}`);
    }
}

function parseParamsIfString(params: Params | string | undefined): Params | undefined {
    if (typeof params === 'string') {
        try {
            return JSON.parse(params, (_key, value) => {
                try { return eval('(' + value + ')'); } catch { return value; }
            }) as Params;
        } catch (e) {
            Logger.error('parseParams', e);
        }
    }
    return params as Params | undefined;
}

function mountApp(ctiMessage: CtiMessage | undefined, params: Params | undefined, id: string) {
    const container = document.getElementById(id);
    if (!container) {
        Logger.error('mountApp', `Container #${id} not found`);
        return;
    }

    // Smonta eventuale root precedente sullo stesso container
    const existing = roots.get(id);
    if (existing) {
        existing.unmount();
        roots.delete(id);
    }

    container.classList.add('smartui-mcp-crm');
    container.parentElement?.classList.add('smartui-mcp-crm');

    const root = createRoot(container);
    roots.set(id, root);
    root.render(<App ctiMessage={ctiMessage} params={params!} id={id} />);
}

// ── Esporre le funzioni sul window globale ─────────────────────
// Il PEF Genesys le cerca per nome su window
(window as any)['interactionGlobalViewInit'] = interactionGlobalViewInit;
(window as any)['interactionViewInit']       = interactionViewInit;
(window as any)['mcpCrmUnmount']             = mcpCrmUnmount;

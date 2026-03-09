/// <reference types="@softphone/cti-connector-jsdk" />

// Global variables injected by the PEF framework
declare var iwscore: IwsCore;
declare var pClient: any;
declare var log: IwsLog;
declare var enumloglevel: { debug: number; info: number; warn: number; error: number };
declare var enumCustomEventType: {
    ConnectorLocalViewAdded: string;
    ConnectorInteractionRemoved: string;
    ConnectorLayoutChange: string;
    [key: string]: string;
};

interface IwsLog {
    setLogLevel(level: number): void;
    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debugFormat(format: string, ...args: any[]): void;
}

interface IwsCore {
    initCTI(config: any): void;
    enableCTI(): void;
    getConnectorConfig(): ConnectorConfig;
    sendCustomEvent(name: string, data: any): void;
    handleEvent(event: any): void;
    removeJSONObjectInMemory(id: string): void;
    addJSONObjectInMemory(msg: any): void;
    _iwsLayoutParams: { auth: { environment: string } };
}

interface ConnectorConfig {
    auth: {
        environment: string;
        token?: string;
        notReadyPresenceId?: string;
        onQueuePresenceId?: string;
    };
    smartUi?: {
        globalViews: SmartUiView[];
        mainJSpath: string;
        showConnectionLed?: boolean;
        interactionUrl?: string;
        appendToElement?: string;
    };
    integrationType?: string;
    [key: string]: any;
}

interface SmartUiView {
    id: string;
    classname?: string;
    title?: string;
    jspath?: string;
    icon?: string;
    type?: string;
    autoStart?: boolean;
    hideHeader?: boolean;
    params?: any;
    data?: any;
    ctiMessage?: CtiMessage;
    [key: string]: any;
}

interface CtiMessage {
    EVENT: string;
    MediaType?: string;
    CallType?: string;
    ANI?: string;
    DNIS?: string;
    InteractionID?: string;
    ConnectionID?: string;
    Duration?: number;
    TimeStamp?: string;
    attachdata?: { [key: string]: any };
    SourceMsg?: { [key: string]: any };
    [key: string]: any;
}

declare namespace SmartUi {
    interface View extends SmartUiView {}
}

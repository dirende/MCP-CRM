export class Logger {
    static loggerName: string = 'smartui-mcp-crm';

    static log = (moduleName: string, variable: any) =>
        console.log(`[${Logger.loggerName}][${moduleName}]:`, variable);

    static error = (moduleName: string, variable: any) =>
        console.error(`[${Logger.loggerName}][${moduleName}]:`, variable);

    static warn = (moduleName: string, variable: any) =>
        console.warn(`[${Logger.loggerName}][${moduleName}]:`, variable);
}

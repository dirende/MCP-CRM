export class Logger {
    static loggerName:string;

    static log = (moduleName: string, variable: any) =>
        console.log(`[${this.loggerName}]${moduleName}:`, variable);

    static error = (moduleName: string, variable: any) =>
        console.error(`[${this.loggerName}]${moduleName}:`, variable);
}

import { CSSProperties, MouseEventHandler } from "react";

export interface Params{
    embeddedUrl: string;
    strecth?:boolean;
    style: CSSProperties;
    onClose?: MouseEventHandler<HTMLButtonElement>;
    onOpen?: ((args: Params)=>void | boolean) | ((args: Params)=>Promise<void | boolean>)
    title?: string;
    headerColor?: string;
    headerTextColor?: string;
    headerHidden?:boolean;
}
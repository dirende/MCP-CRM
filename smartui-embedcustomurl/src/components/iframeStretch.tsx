import React, { useEffect } from "react";
import { Params } from "../models/interfaces/params";

export const IFrameStretch = (props: {params: Params}) => {
    const {embeddedUrl, style} = props.params;
    return <iframe
    src={embeddedUrl}
    title="smartui-opencustomurl-iframe"
    id="smartui-opencustomurl-iframe"
    allow="fullscreen camera *; geolocation *; microphone *; autoplay *; display-capture *"
    style={{...style}}
/>
}
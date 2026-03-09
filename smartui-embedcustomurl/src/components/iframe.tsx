import React from "react";
import { Params } from "../models/interfaces/params";

export const IFrame = (props: {params: Params}) => {
    const {embeddedUrl, style} = props.params;
    
    return <iframe
        src={embeddedUrl}
        title="smartui-opencustomurl-iframe"
        id="smartui-opencustomurl-iframe"
        style = {{ ...style}} 
        allow="full-screen *;camera *; geolocation *; microphone *; autoplay *; display-capture *"
         className="fullscreen"
    />
}
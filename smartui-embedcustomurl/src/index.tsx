import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { Params } from './models/interfaces/params';
import { Logger } from './utils/Logger';
import {} from "@softphone/cti-connector-jsdk";

var timeout = setTimeout(()=>{
  Logger.loggerName = "smartui-embedcustomurl";
  Logger.log("Legacy Mode",  "Init...");
  const module_config = iwscore.getConnectorConfig().smartUi!.globalViews.find((x: any)=>x.id===Logger.loggerName);
  
  if(module_config) interactionGlobalViewInit(undefined, Logger.loggerName);
}, 500);

function interactionGlobalViewInit(params: Params | undefined, id: string = "smartui-embedcustomurl"){
  clearTimeout(timeout);

  Logger.loggerName = id;

  if(!params) {
    Logger.log("interactionGlobalViewInit", "No params found");
    if(window["Softphone"]){
      let module_config = window["Softphone"]?.Configuration?.data?.softphon_softphon_connectorconfiguration_views?.find((x: any)=>{
        return x.softphon_smartuiviewid?.replaceAll("-","")===Logger.loggerName;
      });
      if (module_config) {
        params = (module_config?.softphon_data || module_config?.softphon_params) as any;
      } else {
        module_config = iwscore.getConnectorConfig().smartUi!.globalViews.find((x: any)=>x.id===Logger.loggerName) as SmartUi.View & ({params?: Params | string} & {data?: Params | string});
        params = (module_config?.data || module_config?.params) as any;
      }
    } else {
      let module_config = iwscore.getConnectorConfig().smartUi!.globalViews.find((x: any)=>x.id===Logger.loggerName) as SmartUi.View & ({params?: Params | string} & {data?: Params | string});
      params = (module_config?.data || module_config?.params) as any;
    }
    
  }
  
  Logger.log("interactionGlobalViewInit-params", params);
  
  if(typeof params == "string") {
    Logger.log("interactionGlobalViewInit-params-string", params);
    params = JSON.parse(params, (key, value) => {
      try{
        Logger.log("interactionGlobalViewInit-params-string-eval", value);
        const result = eval("(" + value + ")");
        Logger.log("interactionGlobalViewInit-params-string-result", result);
        return result;
      } catch(e){ return value; }
    }) as Params;
  }

  Logger.log("interactionGlobalViewInit-params", params);
  
  const container = document.getElementById(id);
  container?.classList.add("smartui-embedcustomurl");  
  container?.parentElement?.classList.add("smartui-embedcustomurl");

  const root = createRoot(container!);
  root.render(
      <App params={params!} id={id}/>
  );
}

function interactionViewInit(cti_message: CtiMessage | undefined, params: Params | undefined, id: string = "smartui-embedcustomurl-" + cti_message?.InteractionID) {
  clearTimeout(timeout);

  Logger.loggerName = id;

  Logger.log("interactionViewInit-params", params);
  
  const container = document.getElementById(id);
  container?.classList.add("smartui-embedcustomurl");  
  container?.parentElement?.classList.add("smartui-embedcustomurl");

  const root = createRoot(container!);
  root.render(
    <App params={params!} id={id}/>
  );
}

(window as any)["interactionGlobalViewInit"] = interactionGlobalViewInit;
(window as any)["interactionViewInit"] = interactionViewInit;
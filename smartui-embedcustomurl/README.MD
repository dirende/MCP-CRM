# Smartui interaction view smartui-embedcustomurl

[[_TOC_]]

# Test with react-scripts start

To run the project, open the terminal to the path : packages/smartui-embedcustomurl :

```
npm run start
```

The project will use a dedicated index.html modified to simulate a triggered interaction view.
Edit the start function accordingly with the parameters required by your view.

# Test with pef-simulator

You can test the view within the Genesys widget using the page pef-simulator.html
The page will render the widget and will manage the onChatEventEstablished event to render the view.
To build the project in the dev, open the terminal to the path : packages/smartui-embedcustomurl :
```
npm run dev
```

Then you can open the page with the VsCode LiveServer plugin.

The oob will call the method addView on the onChatEventEstablishedInbound and on the onRestoreEventEstablishedInbound methods.
Change the page accordingly with your view requirements.

# PureCloud support

In the file : App.tsx you can find the import needed to load the pClient and the connector
with all the Genesys types :

```js
import * as connector from '@softphone/cti-connector-jsdk'
import {PureClientSdk} from '@softphone/cti-connector-jsdk/types/gc/pureClientSdk'
declare var pClient:PureClientSdk;
```

# Create the bundle
Assure that you have installed the packages inside the build folder.
Open a terminal from the folder build and run :

```properties
npm install
```
Open a terminal and from the root folder of the project run : 
```properties
npm run build:pack
```
This will create the *smartui-embedcustomurl.js* file under the *dist* folder.

# Setup

Add the file :
```properties
dist/smartui-embedcustomurl.js
```
Inside the CRM package
```properties
path: /__PHATH_WHERE_IS_LOCATED_THE_FILE__/smartui-embedcustomurl.js
```

# Usage

Add the object below in the *iwsscript.js*:

# Interaction view in iwsscript

The interaction view is loaded on demand, and is related to a Genesys Interaction.

Following the example function that adds the interaction view :

```js
function smartui-embedcustomurlAddView(msg) {
    let obj = {
        id: "smartui-embedcustomurl",
        classname: "smartui-embedcustomurl",
        title: "My interaction-view",
        jspath: "../dist/smartui-embedcustomurl.js",
        icon: "contact_phone",
        autoStart: true,
        type: "interaction",        
        hideHeader : true,
        params: {
            onClose: ()=>{ 
                iwscore.sendCustomEvent("ConnectorInteractionRemoved", { interactionDeleted: msg.InteractionID });
                document.getElementById("pureFrame")?.focus();
            },
            onOpen: ()=>{
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  console.log("onOpen");
                  resolve(true);
                }, 1000);
              });
            },
            embeddedUrl:`https://apps.${iwscore._iwsLayoutParams.auth.environment}/directory/#/engage/admin/interactions/${msg.InteractionID}`,
            style: {
                transformOrigin: "0 0",
                overflow: "hidden",
                margin: 0,
                padding: 0,
                border: 0,
                transform: "scale(0.50)",
                marginLeft: -30,
                marginTop: -30,
            }
        }
    };
    obj.ctiMessage = msg;
    window.dispatchEvent(new CustomEvent(enumCustomEventType.ConnectorLocalViewAdded, {
    detail: obj
    }));
}
```

And then the iwsscript functions that create the view :

```js
function onEventEstablishedInbound(msg) {
    console.log("onChatEventEstablished : ", msg);
    smartui-embedcustomurlAddView(msg);
}
```

#Pay attention

To hide the *Conversations* view in *iframe* for purecloud URL, you need to open the view in off-queue mode.
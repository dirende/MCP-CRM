//==================================================================
// VARIABLES
//==================================================================
const customer_environment = "mypurecloud.com";
const permission = "softphoneHubspot";
const loadingScriptFromGenesys = "true";
const language = "en-US";
const softphone_clientIds = {
    "mypurecloud.com": "31c2f276-2c0f-4124-85e3-ad73a23548f6",
    "mypurecloud.de": "0b4f1a5f-bf77-4533-aadf-dc8bce162b63",
    "mypurecloud.ie": "6ec63060-c3a1-4397-bcb6-ee2fcb1e9f2d",
    "apne2.pure.cloud": "241303e2-3575-4397-9141-ceb9377dc653",
    "aps1.pure.cloud": "241303e2-3575-4397-9141-ceb9377dc653",
    "cac1.pure.cloud": "241303e2-3575-4397-9141-ceb9377dc653",
    "euw2.pure.cloud": "241303e2-3575-4397-9141-ceb9377dc653",
    "mypurecloud.jp": "fae916db-81b6-4065-bda5-610e9929b6b7",
    "usw2.pure.cloud": "0c7d06e2-18e2-45bb-b676-ddc0f3bf73a2",
    "mypurecloud.com.au": "18a469b7-7d34-441a-9ecb-28b2d16e050e",
    "mec1.pure.cloud": "241303e2-3575-4397-9141-ceb9377dc653",
    "sae1.pure.cloud": "241303e2-3575-4397-9141-ceb9377dc653",
    "euc2.pure.cloud": "241303e2-3575-4397-9141-ceb9377dc653",
    "apne3.pure.cloud": "241303e2-3575-4397-9141-ceb9377dc653"
};
var FIXED_EMAIL_FOR_TEST = "";
//==================================================================
// IMPLEMENTATION
//==================================================================
let softphone_connector_initialized = false;
log.setLogLevel(enumloglevel.debug);
iwscommand.removeExitOnDocumentUnload();
var GENESYS_SETTINGS = {
    environment: customer_environment,
    loadingScriptFromGenesys: loadingScriptFromGenesys,
    crm: permission,
    language: language
};
async function onActivatePureEmbeddableSessionFullPEF(event) {
    console.log("onActivatePureEmbeddableSessionFullPEF : " + JSON.stringify(event));
    if (softphone_connector_initialized == true) {
        return;
    }
    softphone_connector_initialized = true;
    try {
        util.subscribeDisambiguationEvent();
        window["gcPresenceLanguage"] = iwscore.customParseURL("language", "en_US");
        window["gcUser"] = await pClient.usersApi.getUsersMe({ expand: "routingStatus" });
        if (iwscore.getConnectorConfig().eventType == "extended" || iwscore.getConnectorConfig().smartUi?.showConnectionLed) {
            var gcPresences = (await pClient.presenceApi.getPresencedefinitions({ "localeCode": "ALL" })).entities;
            window["gcPresences"] = gcPresences;
            let availableStatus = gcPresences.filter(p => p.systemPresence === "Available" && p.primary === true);
            let onQueueStatus = gcPresences.filter(p => p.systemPresence === "On Queue" && p.primary === true);
            window["gcWrapupCodes"] = await pClient.getWrapupCodes();
            iwscore.getConnectorConfig().auth.notReadyPresenceId = availableStatus[0].id;
            iwscore.getConnectorConfig().auth.onQueuePresenceId = onQueueStatus[0].id;
        }
        if (GENESYS_SETTINGS.loadingScriptFromGenesys === 'true' && !window["onAgentLogged"]) {
            console.log("onActivatePureEmbeddableSessionFullPEF try to load remote Hubspot_iwsscript.js file");
            await pClient.loadStaticResource('Hubspot_iwsscript.js', () => {
                console.log("onActivatePureEmbeddableSessionFullPEF : loadStaticResource Hubspot_iwsscript file loaded ");
                onAgentLogged();
            });
        }
        else {
            onAgentLogged();
        }
    }
    catch (e) {
        log.error("[softphone] onPreActivatePureEmbeddableSessionFullPEF error on get GC data: " + e);
        iwscommand.PublishError("Error opening connection with Genesys API from domain : " + window.location.origin);
    }
    console.log("onActivatePureEmbeddableSessionFullPEF end");
}
function incrementWidgetWidth() {
    console.log("incrementWidgetWidth");
    winCommunication.incrementWidgetWidth();
}
function decrementWidgetWidth() {
    console.log("decrementWidgetWidth");
    winCommunication.decrementWidgetWidth();
}
function resetWidgetWidth() {
    console.log("resetWidgetWidth");
    winCommunication.resetWidgetWidth();
}
var pefParams = {
    customInteractionAttributes: ["activity_id", "contact_id", "context.email", "company_id", "company_name", "email", "emailaddress"],
    settings: {
        hideWebRTCPopUpOption: false,
        enableCallLogs: false,
        hideCallLogSubject: false,
        hideCallLogContact: false,
        hideCallLogRelation: false,
        dedicatedLoginWindow: false,
        embeddedInteractionWindow: true,
        enableConfigurableCallerId: false,
        enableServerSideLogging: false,
        embedWebRTCByDefault: true,
        enableCallHistory: false,
        theme: {
            primary: "#HHH",
            text: "#FFF"
        }
    },
    clientIds: softphone_clientIds,
    helpLinks: {}
};
const envUrl = "https://apps." + customer_environment + "/crm/" + permission;
const pefUrl = envUrl + "/index.html?request_configuration=true&full_PEF=true&crm_domain=" + window.location.origin + "&language=" + language;
const interactionUrl = envUrl + "/interaction.html";
var config = {
    context: window,
    layoutType: "smart-ui",
    integrationType: "pure-embeddable",
    url: pefUrl,
    auth: {
        environment: GENESYS_SETTINGS.environment
    },
    pefParams: pefParams,
    smartUi: {
        mainJSpath: "/js/softphone-connector-smart-ui.min.js",
        showConnectionLed: true,
        resizeButtons: {
            incrementWidgetWidth: incrementWidgetWidth,
            decrementWidgetWidth: decrementWidgetWidth,
            resetWidgetWidth: resetWidgetWidth
        },
        globalViews: [
            {
                title: "Dock",
                execute: () => winCommunication.dockWindow(),
                icon: "add_to_home_screen",
                type: "button",
                id: "btn2",
                ctiMessage: undefined
            }
        ]
    }
};
if (pefParams.settings.embeddedInteractionWindow) {
    config.smartUi.interactionUrl = interactionUrl;
}
$(document).ready(function () {
    //Allow to add a dispatch on any CTI events...
    (function () {
        var old_prototype = iwscore.handleEvent.prototype;
        var old_init = iwscore.handleEvent;
        iwscore.handleEvent = function () {
            old_init.apply(this, arguments);
            // Do something extra
            if (arguments) {
                winCommunication.dispatchEvent(arguments[0]);
            }
        };
        iwscore.handleEvent.prototype = old_prototype;
    })();
    iwscore.initCTI(config);
    iwscore.enableCTI();
});

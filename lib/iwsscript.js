///========================================
/// SoftPhone s.r.l
/// IWSConnector release 2.3.3
/// Date: 14/05/2021
///========================================
function networkError(message) {
    log.error(message);
}

function formatTelNumber(number) {
    console.log("formatTelNumber: " + number);
    if (number) {
        return number.trim().replace(/^([+]00|00)/, '+');
    }
    winCommunication.sendNotification("Number is undefined!", 3);
    return "";
}

function onIdentity(message) {
}
function onConnectedSession(message) {
}
function onDisconnectedSession(message) {
}
function onActivateSession(message) {
}
function onPostActivateSession(message) {
}
function onDeactivateSession(message) {
}
function onChannelStatus(message) {
}
function onEventAgentNotReady(message) {
    //to get the ActionCode
    //message.attachdata.ActionCode
}
function onEventAgentNotReadyAfterCallWork(message) {
}
function onEventAgentReady(message) {
}
function onEventAgentLogout(message) {
}
function onEventAgentLogin(message) {
}
//==================================================================
// Events MediaVoice
/*
* message.EVENT
* message.Place
* message.AgentID
* message.MediaType
* message.ConnectionID
* message.ANI
* message.DNIS
* message.CallType
* message.Duration
* message.TimeStamp
* message.attachdata
* message.EntrepriseLastInteractionEvent.PreviousConnID
*/
//==================================================================
function onEventRingingInbound(message) {
}
function onEventRingingInternal(message) {
    /*
    //SetAttachData Example
    var mycollection = createUserData();
    mycollection.put("paramtest", "value1");
    SetAttachdataById(message.ConnectionID, mycollection);
    */
}
function onEventRingingConsult(message) {
    /*
        This event is received only by the second Agent (in the consult transfer scenario)
        usually open the popup without create the activity
    */
}
function onEventRingingOutbound(message) {
}
//EventEstablished
function onEventEstablishedInbound(message) {
    log.debug("======= onEventEstablishedInbound ==========");
    mcpCrmAddView(message);
}
function onEventEstablishedInternal(message) {
}
function onEventEstablishedConsult(message) {
    //open the ticket without create the activity
}
function onEventEstablishedOutbound(message) {
    mcpCrmAddView(message);
}
//EventHeld
function onEventHeldInbound(message) {
}
function onEventHeldInternal(message) {
}
function onEventHeldConsult(message) {
}
function onEventHeldOutbound(message) {
}
//EventRetrieved	
function onEventRetrievedInbound(message) {
}
function onEventRetrievedInternal(message) {
}
function onEventRetrievedConsult(message) {
}
function onEventRetrievedOutbound(message) {
}
//EventAttachedDataChanged
function onEventAttachedDataChangedInbound(message) {
}
function onEventAttachedDataChangedInternal(message) {
}
function onEventAttachedDataChangedConsult(message) {
}
function onEventAttachedDataChangedOutbound(message) {
}
//EventReleased
function onEventReleasedInbound(message) {
}
function onEventReleasedInternal(message) {
}
function onEventReleasedConsult(message) {
}
function onEventReleasedOutbound(message) {
}
//EventDialing
function onEventDialingInternal(message) {
}
function onEventDialingConsult(message) {
}
function onEventDialingOutbound(message) {
}
//==================================================================
//Events MediaEmail
//==================================================================
function onEmailEventRingingInbound(message) {
}
function onEmailEventEstablishedInbound(message) {
    mcpCrmAddView(message);
}
function onEmailEventReleasedInbound(message) {
}
function onEmailEventReplyEstablishedOutbound(message) {
}
function onEmailEventReplyReleased(message) {
}
function onEmailEventReplyCancelled(message) {
}
function onEmailEventSessionInfo(message) {
}
//==================================================================
//Events MediaWorkbin
//==================================================================
function onWorkbinTakenOut(message) {
}
function onWorkbinPlacedIn(message) {
}
function onWorkbinContent(message) {
}
//==================================================================
//Events MediaWebMessage
//==================================================================
function onWebmessagingEventRingingInbound(message) {
}
function onWebmessagingEventRingingConsult(message) {
}
function onWebmessagingEventEstablishedInbound(message) {
    mcpCrmAddView(message);
}
function onWebmessagingEventEstablishedConsult(message) {
}
function onWebmessagingEventReleasedInbound(message) {
}
function onWebmessagingEventReleasedConsult(message) {
}
function onWebmessagingEventTranscriptLink(message) {
    //message.TranscriptPath
}
function onWebmessagingEventPartyRemovedInbound(message) {
}
function onWebmessagingEventPartyAddedInbound(message) {
}
function onWebmessagingEventPartyChangedInbound(message) {
}
//==================================================================
//Events SMS
//==================================================================
function onSMSEventRingingInbound(message) {
}
function onSMSEventEstablishedInbound(message) {
    mcpCrmAddView(message);
}
function onSMSEventReleasedInbound(message) {
}
function onSMSEventSendMessage(message) {
    //message.SmsMessage
}
//==================================================================
//Events WorkItem
//==================================================================
function onWorkitemEventRingingInbound(message) {
}
function onWorkitemEventEstablishedInbound(message) {
}
function onWorkitemEventReleasedInbound(message) {
}
//==================================================================
//Events Facebook
//==================================================================
function onFacebookEventRingingInbound(message) {
}
function onFacebookEventEstablishedInbound(message) {
}
function onFacebookEventReleasedInbound(message) {
}
function onFacebookEventSessionInfo(message) {
}
//==================================================================
//Events Twitter
//==================================================================
function onTwitterEventRingingInbound(message) {
}
function onTwitterEventEstablishedInbound(message) {
}
function onTwitterEventSessionInfo(message) {
}
function onTwitterEventReleasedInbound(message) {
}
function onTwitterEventReplyOutbound(message) {
}
function onTwitterEventRetweetOutbound(message) {
}
function onTwitterEventDirectMessageOutbound(message) {
}
//==================================================================
//Events UserEvent
//==================================================================
function onEventUserEvent(message) {
}
function onPreviewRecord(message) {
    log.debug("======= onPreviewRecord ==========");
    //selectInteractionOptionByMessage(message);
    //MakeCallEx(message.attachdata.GSW_PHONE, message.attachdata);	
}
function onChainedRecord(message) {
}
function onRecordRejectAcknowledge(message) {
}
function onRecordProcessedAcknowledge(message) {
}
//==================================================================
//Events DelegateCommand
//==================================================================
function onDelegateCommand(message) {
    log.debug("======= onDelegateCommand ==========");
    if (message.Parameters.Device) {
        log.debugFormat("Device Name: {0}", message.Parameters.Device.Name);
    }
    /*
    //to authorize the command on IWS
    log.debugFormat("===== Execute message: {0}", message.ID);
    ExecuteDelegatedCommand(message.ID);
    // OR
    RemoveDelegatedCommand(message.ID);
    */
}
//==================================================================
//Events InhibitCommand
//==================================================================
function onInhibitCommand(message) {
    log.debug("======= onInhibitCommand ==========");
    if (message.Parameters.Device) {
        log.debugFormat("Device Name: {0}", message.Parameters.Device.Name);
    }
}
//==================================================================
//Generic Events 
//==================================================================
function onSwitchInteraction(message) {
    log.debug("Called onSwitchInteraction: " + message);
}
function onWdeSwitchInteraction(message) {
    log.debug("Called onWdeSwitchInteraction: " + message);
}

function onSwitchInteractionPEF(message) {
    winCommunication.selectTab(message.InteractionID);
}

function smartuiEmbedcustomurlAddView(msg) {
    let obj = {
        id: "smartui-embedcustomurl",
        classname: "smartui-embedcustomurl",
        title: "My interaction-view",
        jspath: "/lib/smartui-embedcustomurl.js",
        icon: "contact_phone",
        autoStart: true,
        type: "interaction",
        hideHeader: true,
        params: {
            onClose: () => {
                iwscore.sendCustomEvent("ConnectorInteractionRemoved", { interactionDeleted: msg.InteractionID });
                document.getElementById("pureFrame")?.focus();
            },
            onOpen: () => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        console.log("onOpen");
                        resolve(true);
                    }, 1000);
                });
            },
            embeddedUrl: `https://www.google.com`,
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

//==================================================================
// MCP-CRM SmartUI — registra la view React per ogni interazione
//==================================================================
function mcpCrmAddView(msg) {
    let obj = {
        id: "smartui-mcp-crm",
        classname: "smartui-mcp-crm",
        title: "MCP-CRM Integration",
        jspath: "/lib/smartui-mcp-crm.js",
        icon: "contact_phone",
        autoStart: true,
        type: "interaction",
        hideHeader: false,
        params: {
            title: "MCP-CRM Integration",
            backendUrl: "http://localhost:3000",
            onClose: () => {
                iwscore.sendCustomEvent("ConnectorInteractionRemoved", { interactionDeleted: msg.InteractionID });
                document.getElementById("pureFrame")?.focus();
            },
            onOpen: () => new Promise((resolve) => setTimeout(() => resolve(true), 300))
        }
    };
    obj.ctiMessage = msg;
    window.dispatchEvent(new CustomEvent(enumCustomEventType.ConnectorLocalViewAdded, {
        detail: obj
    }));
    // Bridge per demo standalone: quando il PEF gira in iframe, notifica la finestra padre
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'mcpCrmInteraction', msg: msg }, '*');
    }
}
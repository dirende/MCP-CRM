/* eslint-disable @typescript-eslint/no-unused-vars */
async function onPreActivatePureEmbeddableSessionFullPEF(message) {
    if (message.token) {
        iwscore.getConnectorConfig().auth.token = message.token;
        localStorage.setItem("pureCloudToken", message.token);
        pClient = new PureClientSdk(undefined);
        pClient.client.setEnvironment(iwscore.getConnectorConfig().auth.environment);
        pClient.client.setAccessToken(message.token);
    }
}
function onPreRequestConfigurationPureEmbeddable(message) {
    const _params = iwscore.getConnectorConfig();
    if (_params.integrationType === "pure-embeddable") {
        iwscore.sendPureEmbeddableConfiguration();
    }
}
function onPreEventDeallocate(message) {
    iwscore.removeJSONObjectInMemory(message.InteractionID);
}
function onPreEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreEventEstablishedInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreEventDialingOutbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreEventRingingInternal(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreEventDialingInternal(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreChatEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreWebmessagingEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreEmailEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreEmailEventRingingOutbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreEmailEventEstablishedOutbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreOpenEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreFacebookEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreWhatsUpEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreSmsEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreSmsEventRingingOutbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreSmsEventEstablishedOutbound(message) {
    iwscore.addJSONObjectInMemory(message);
}
function onPreWhatsappEventRingingInbound(message) {
    iwscore.addJSONObjectInMemory(message);
}

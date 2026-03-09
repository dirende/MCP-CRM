class BrowserWinCommunication {
    dockWindow() {
        console.log("dockWindow");
    }
    ;
    sendNotification(msg, timer) {
        console.log("sendNotification");
    }
    executeCommandOnPEF(scommand) {
        console.log("executeCommandOnPEF");
    }
    incrementWidgetWidth() {
        console.log("incrementWidgetWidth");
    }
    decrementWidgetWidth() {
        console.log("decrementWidgetWidth");
    }
    resetWidgetWidth() {
        console.log("resetWidgetWidth");
    }
    dispatchEvent(event) {
        console.log("dispatchEvent");
    }
    openUrl(url) {
        window.open(url);
    }
    openProcess(url) {
        window.open(url);
    }
    openTab(id, title, url) {
        window.open(url);
    }
    selectTab(id) {
        console.log("selectTab, id : " + id);
    }
    ;
}

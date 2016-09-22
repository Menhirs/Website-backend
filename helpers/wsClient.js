
function ClientData (channel,socket) {
    var theClient = this;
    this.sessionID = 0;
    this.channel = channel;
    this.application = this.channel.application;
    this.socket = socket;
    this.Initialize = function () {
        var result = false;
        var sessionID = socket.handshake.sessionID;
        var sessionData = socket.handshake.sessionData;
        theClient.sessionID = sessionID;
        theClient.sessionData = sessionData;
        for (var key in theClient.channel.clientCallbacks )
        {
            socket.on(key, theClient.channel.clientCallbacks[key]);
        }
        return true;
    };
    this.Send = function (type,data) {
        theClient.socket.emit(type,data);
    }
    this.exposedData =  {
        Initialize: this.Initialize,
        Send: this.Send,
        GetChannel: function () { return theClient.channel; },
        GetApplication: function () { return theClient.application; }
    };
    socket.UserData = this.exposedData;
    return this.exposedData;
}

module.exports = function (name,socket) {
    return new ClientData (name,socket);
}

function ChannelData (name,parent,app) {
    var theChannel = this;
    this.application = app;
    this.parent = parent;
    this.name= name;
    this.sockets = null;
    this.clientCallbacks = {};
    this.connections = {};
    this.Open = function () {
        theChannel.sockets = theChannel.application.socket.of('/'+theChannel.name);
        theChannel.sockets.authorization(theChannel._authentification);
        theChannel.sockets.on('connection', theChannel._onConnection );
    }
    this.Close = function () {
    }
    this.Broadcast = function(type,data)
    {
        theChannel.sockets.emit(type,data);
    }
    this.AddCallback=function(event,cb)
    {
        theChannel.clientCallbacks[event]=cb;
    }
    this._onConnection = function (socket) {
        var client = require('./wsClient') ( theChannel, socket );
        if ('undefined' == typeof theChannel.connections[socket.handshake.sessionID]) {
            theChannel.connections[socket.handshake.sessionID] = {};
            theChannel.connections[socket.handshake.sessionID].sessionID = socket.handshake.sessionID;
            theChannel.connections[socket.handshake.sessionID].sessionData = socket.handshake.sessionData;
            theChannel.connections[socket.handshake.sessionID].client = client;
            theChannel.connections[socket.handshake.sessionID].count = 1;
            theChannel.connections[socket.handshake.sessionID].sockets = {};
            theChannel.connections[socket.handshake.sessionID].sockets [ socket.id ] = socket;
            if ( theChannel.exposedData.events.OnClientFirstConnection != null )
                theChannel.exposedData.events.OnClientFirstConnection ( theChannel.exposedData, client );
        }
        else {
            theChannel.connections[socket.handshake.sessionID].count ++;
            theChannel.connections[socket.handshake.sessionID].sockets [ socket.id ] = socket;
        }
        socket.sessionID = socket.handshake.sessionID;
        client.Initialize ();
        socket.on ('disconnect', theChannel._onDisconnection );
        if ( false ) {
        }
    }
    this._onDisconnection = function (data) {
        if ('undefined' == typeof theChannel.connections[this.sessionID]) {
            console.log ( "gloups" );
        }
        else {
            var userConnections = theChannel.connections[this.sessionID];
            userConnections.count --;
            if (userConnections.sockets [ this.id ])
                delete userConnections.sockets [ this.id ];
            if (userConnections.count == 0)
                if ( theChannel.exposedData.events.OnClientDeconnection != null )
                    theChannel.exposedData.events.OnClientDeconnection ( theChannel.exposedData, this.UserData );
        }
    }
    this._authentification = function (handshakeData, callback) {
            var cookies = theChannel.application.cookie.parse(handshakeData.headers.cookie);
            var sessionID;
            if (cookies['connect.sid']) {
                sessionID = theChannel.application.connect.utils.parseSignedCookie(cookies['connect.sid'], theChannel.application.sessionSecret);
            }
            if (!sessionID) {
                callback('No session', false);
            } else {
                handshakeData.sessionID = sessionID;
                theChannel.application.sessionStore.get(sessionID, function (err, session) {
                        if (!err && session ) {
                            handshakeData.sessionData = session;
                            callback(null, true);
                        } else {
                            callback(err || 'User not authenticated', false);
                        }
                    });
            }
        };
    this.exposedData = {
            Open: this.Open,
            Close: this.Close,
            GetName: function () { return theChannel.name; },
            GetApplication: function () { return theChannel.application; },
            Broadcast: this.Broadcast,
            AddCallback: this.AddCallback,
            events: {
                OnClientFirstConnection: null,
                OnClientDeconnection: null
            }
        };
    return this.exposedData; 
}

module.exports = function (name,parent,app) {
    return new ChannelData (name,parent,app);
}

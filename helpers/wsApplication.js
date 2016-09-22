
function ApplicationData (/*name,dir,*/data)
{
    var theApp = this;
    this.name = data.name;
    this.path = require('path');
    this.express = require('express');
    this.app = this.express();
    this.http = require('http');
    this.server = this.http.createServer(this.app);
    this.port = process.env.PORT || data.port || 1337;
    this.templateEngine = require(data.templateEngine.name)(data.templateEngine.config);
    /**/
    this.sessionSecret = "some private string";
    this.connect = require('express/node_modules/connect');
    this.cookie = require('express/node_modules/cookie');
    this.session = require('express-session');
    this.FileStore = require('session-file-store')(this.session);
    this.sessionStore = new this.FileStore ();
    /**/
    this.io = require('socket.io');
    this.channels = {};
    this.connections = {};
    this.socket = null;
    this.app.configure(function() {
            this.engine(data.templateEngine.name, theApp.templateEngine.render);
            this.set('views', data.globals.TPLDIRECTORY);
            this.set('view engine', data.templateEngine.name);
            this.use(theApp.express.static(data.globals.PUBDIRECTORY));
            /**/
            this.use(theApp.express.cookieParser());
            this.use(theApp.session({
                store: theApp.sessionStore,
                secret: theApp.sessionSecret,
                resave: true,
                saveUninitialized: true
            })
            );
            /**/
            this.use(theApp.express.bodyParser());
        });

    this.Launch = function ()
    {
        theApp.socket = theApp.io.listen(theApp.server, { log: false });
        for ( var key in theApp.channels )
            theApp.channels[key].Open ();
        theApp.server.listen(theApp.port);
    }
    this.CreateChannel = function (name, parent=null) {
        var channel = require('./wsChannel') (name,parent,theApp);
        theApp.channels[name] = channel;
        return channel;
    }
    this.Broadcast = function(type,data)
    {
        for ( var key in this.channels )
        theApp.channels[key].Broadcast(type,data);
    }
    this.GetRoute = function(route,cb)
    {
        theApp.app.get(route,cb);
    }
    this.PostRoute = function(route,cb)
    {
        theApp.app.post(route,cb);
    }
    return {
        Launch: this.Launch,
        CreateChannel: this.CreateChannel,
        Broadcast: this.Broadcast,
        GetRoute: this.GetRoute,
        PostRoute: this.PostRoute,
        RenderTemplate: function (file,data) {
            var html = theApp.templateEngine.render(file, data);
            return html;
        }
    };
}

module.exports = function (data) {
    return new ApplicationData (data);
}

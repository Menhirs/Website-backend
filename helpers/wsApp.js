String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var CWD = process.cwd ();
var args = process.argv.slice(2);

var cfgPath = require('path').dirname(args[0]);
var appConfig;
if (require('path').isAbsolute(cfgPath))
    appConfig = loadJSON ( args[0] );
else
    appConfig = loadJSON ( require('path').join(CWD, args[0] ) );

var globals = {};
globals [ "CWD" ] = CWD;
if (require('path').isAbsolute(cfgPath))
    globals [ "SITEDIRECTORY" ] = require('path').join ( cfgPath, appConfig.directory );
else
    globals [ "SITEDIRECTORY" ] = require('path').join ( CWD, cfgPath, appConfig.directory );
globals [ "PUBDIRECTORY" ] = require('path').join ( globals [ "SITEDIRECTORY" ], appConfig.subdirectories.static );
globals [ "DESCDIRECTORY" ] = require('path').join ( globals [ "SITEDIRECTORY" ], appConfig.subdirectories.descriptors );
globals [ "TPLDIRECTORY" ] = require('path').join ( globals [ "SITEDIRECTORY" ], appConfig.subdirectories.templates );

function iterateHim(name,obj,cb)
{
    for(var propt in obj){
        if ( typeof obj[propt] === 'object' ) obj[propt] = iterateHim ( name+'.'+propt, obj[propt], cb );
        else obj[propt] = cb(name,propt,obj);
    }
    return obj;
}
function replaceGlobals(v)
{
    var tmp = v;
    for (var g in globals) {
        tmp = tmp.replaceAll('%'+g+'%',globals[g]);
    }
    return tmp;
}
appConfig = iterateHim ("appConfig", appConfig, function (parent,name,ref) {
    if ( typeof ref[name] === 'string' ) return replaceGlobals(ref[name]);
    return ref[name];
});
appConfig.globals = globals;

const Application = require('./wsApplication')(appConfig);

var striptags = require('striptags');

/*
    load content of a JSON file disabling cache
*/
function loadJSON(file,nocache=true)
{
    if (nocache)
        delete require.cache[require.resolve(file)];
    var data = require ( file );
    return data;
}

/* get callbacks */
function Root(req, res, next) {
    res.render('layout', { site: appConfig.title, header: appConfig.header });
}
/* post callbacks */

/* site navigation callbacks */
function ClientGetPage(data){
    this.currentPage = data;
    var thePage;
    theClient = this.UserData;
    try {
        thePage = loadJSON ( CWD+'/site/pages/'+data+'.json' );
    }
    catch (e) {
        thePage = loadJSON ( CWD+'/site/pages/404.json' );
    }
    var baseContent="";
    if (thePage.template != "")
        baseContent  = Application.RenderTemplate('pages/'+thePage.template,{});
    if ( thePage.columns > 0 ) {
        var cols = [];
        for ( var i = 0 ; i < thePage.columns ; i ++ ) cols.push ('<div class="column col_'+thePage.columns+'">');
        var i = 0;
        for (var id in thePage.articles )
        {
            cols [ i ] += '<article id="'+thePage.articles[id]+'" class="articleToLoad block-article"></article>';
            i = (i+1)%thePage.columns;
        }
        baseContent+='<div class="row">';
        for ( var i = 0 ; i < thePage.columns ; i ++ ) baseContent += cols[i]+'</div>';
        baseContent+='</div>';
    }
    theClient.Send ('pageContent', {
            id: thePage.id,
            title: thePage.title,
            content: baseContent,
            require: thePage.scripts
        });
};

function ClientGetArticle(data){
    var theArticle;
    theClient = this.UserData;
    try {
        theArticle = loadJSON ( CWD+'/site/articles/'+data+'.json' );
    }
    catch (e) {
        theArticle = loadJSON ( CWD+'/site/articles/nocontent.json' );
    }
    var baseContent="";
    if (theArticle.template != "")
        baseContent  = Application.RenderTemplate('articles/'+theArticle.template,{});
    theClient.Send ('articleContent', {
            id: data,
            content: baseContent
        });
};

/* Application configuration */
Application.GetRoute('/', Root);

/*
    Chat Panel Manager

function ConnectClient(theChannel,theClient)
{
}
function DisconnectClient (theChannel,theClient)
{
    theChannel.Broadcast('bye', { who: theClient.GetUsername (), when: Date.now() });
}
function ClientJoin(data){
    theClient = this.UserData;
    var err = Application.ExistsUser(data);
    if (err!==null) {
        theClient.Send ( 'notconnected', { error: err } );
    } else {
        theClient.SetUsername ( data );
        theClient.Send ( 'connected', { login: data } );
        theClient.GetChannel ().Broadcast('join', { who: theClient.GetUsername (), when: Date.now() });
    }
};
function ClientWrite(data){
    theClient = this.UserData;
    theClient.GetChannel ().Broadcast('message', { who: theClient.GetUsername (), what: striptags(data), when: Date.now() });
};
var mainRoom = Application.CreateChannel('chat');
mainRoom.events.OnClientFirstConnection = ConnectClient;
mainRoom.events.OnClientDeconnection = DisconnectClient;
mainRoom.AddCallback('join',ClientJoin);
mainRoom.AddCallback('write',ClientWrite);
*/

var pageProvider = Application.CreateChannel('httpRequest');
pageProvider.AddCallback('getPage',ClientGetPage);
pageProvider.AddCallback('getArticle',ClientGetArticle);
pageProvider.AddCallback('pageID',function(data){
    this.pageID = data;
    this.currentPage = '';
});

Application.Launch ();
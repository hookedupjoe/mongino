var express = require('express');
var http = require('http');
var app = express();
var path = require('path');

const { WebSocketServer } = require('ws');
const { parse } = require('url');

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
 });


app.use(express.static('ui-app'));

cookieParser = require('cookie-parser'),
bodyParser = require('body-parser');

//--- Use standard body and cookie parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


var scope = {};
scope.locals = {
    path: {
        root: path.resolve(__dirname)
    }
};
scope.locals.path.start = scope.locals.path.root + "/server-app";
scope.locals.path.libraries = scope.locals.path.root + "/server-libs";
scope.locals.path.ws = {root:scope.locals.path.root + "/ws"};

var $ = require(scope.locals.path.libraries + '/globalUtilities.js').$;
$.scope = scope;

$.classes = $.classes || {}
$.classes.WebSocketServer = WebSocketServer;

require('./server-app/start').setup(app, scope);
var server = http.createServer(app);

server.on('upgrade', function upgrade(request, socket, head) {
    try {
        var url = parse(request.url);
        var pathname = url.pathname;
        var tmpParts = pathname.split('/');
        if( tmpParts.length == 4 && tmpParts[0] == ''){
            var tmpURLBase = tmpParts.join('/');
            var tmpFilePath = scope.locals.path.start + tmpURLBase + '.js';
            var tmpAppWSReq = require(tmpFilePath);
            if (typeof(tmpAppWSReq.setup) == 'function') {
                var tmpWSS = tmpAppWSReq.setup(scope, {websocket:true});
                if( tmpWSS && tmpWSS.handleUpgrade ){
                        tmpWSS.handleUpgrade(request, socket, head, function done(ws) {
                            tmpWSS.emit('connection', ws, request);
                        });
                } else {
                    console.error('no winsock process available',tmpURL)
                    socket.destroy();
                }
            }
        } else {
            console.error('unexpected url',tmpURL)
            socket.destroy();
        }
        
    
    } catch (error) {
        console.log('error',error);
        socket.destroy();
    }
});  

server.listen(process.env.PORT || 33462, function () {
    var host = server.address().address;
    var port = server.address().port;
    if( host == "::"){
        console.log( 'host', host);
        console.log('Mongino UI on port:' + port + ".");
        console.log('Launch it here');
        console.log("http://localhost:" + port);
        console.log("");
    }
});
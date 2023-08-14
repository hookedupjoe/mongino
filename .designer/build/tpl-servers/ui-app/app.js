var express = require('express');
var http = require('http');
require('dotenv').config();
var webApp = express();
const { app, BrowserWindow } = require('electron')
var path = require('path');

const { WebSocket, WebSocketServer } = require('ws');
const { parse } = require('url');

const args = process.argv

var showFrame = true;
var showDev = false;
var loadURL = '';
var loadFN = '';

var startPos = {
    x: 0,
    y: 0,
    width: 1024,
    height: 768
}

if (args && args.length) {
    for (var iPos in args) {
        var tmpArg = args[iPos];
        if (tmpArg == '--hideframe') {
            showFrame = false
        } else if (tmpArg == '--showdev') {
            showDev = true
        } else {
            try {
                var tmpParts = tmpArg.split('=');
                if (tmpParts.length == 2) {
                    var tmpArgName = tmpParts[0];
                    var tmpArgVal = tmpParts[1];
                    if (tmpArgName == 'x' || tmpArgName == 'y' || tmpArgName == 'width' || tmpArgName == 'height') {
                        startPos[tmpArgName] = parseInt(tmpArgVal);
                    }
                }
            } catch (theErr) {
                console.log("error getting params", theErr)
            }
        }
    }
}

webApp.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});


webApp.use(express.static('ui-app'));

cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser');

//--- Use standard body and cookie parsers
webApp.use(bodyParser.json());
webApp.use(bodyParser.urlencoded({ extended: false }));
webApp.use(cookieParser());


var scope = {};
scope.locals = {
    path: {
        root: path.resolve(__dirname)
    }
};
scope.locals.path.start = scope.locals.path.root + "/server-app";
scope.locals.path.libraries = scope.locals.path.root + "/server-libs";
scope.locals.path.ws = { root: scope.locals.path.root + "/ws" };

var $ = require(scope.locals.path.libraries + '/globalUtilities.js').$;
$.scope = scope;

$.classes = $.classes || {}
$.classes.WebSocketServer = WebSocketServer;
$.classes.WebSocket = WebSocket;

require('./server-app/start').setup(webApp, scope);
var server = http.createServer(webApp);

server.on('upgrade', function upgrade(request, socket, head) {
    try {
        var url = parse(request.url);
        var pathname = url.pathname;
        var tmpParts = pathname.split('/');
        if (tmpParts.length == 4 && tmpParts[0] == '') {
            var tmpURLBase = tmpParts.join('/');
            var tmpFilePath = scope.locals.path.start + tmpURLBase + '.js';
            var tmpAppWSReq = require(tmpFilePath);
            if (typeof (tmpAppWSReq.setup) == 'function') {
                var tmpWSS = tmpAppWSReq.setup(scope, { websocket: true });
                if (tmpWSS && tmpWSS.handleUpgrade) {
                    tmpWSS.handleUpgrade(request, socket, head, function done(ws) {
                        tmpWSS.emit('connection', ws, request);
                    });
                } else {
                    console.error('no winsock process available', tmpURL)
                    socket.destroy();
                }
            }
        } else {
            console.error('unexpected url', tmpURL)
            socket.destroy();
        }


    } catch (error) {
        console.log('error', error);
        socket.destroy();
    }
});

server.listen(process.env.PORT || 33462, function () {
    var host = server.address().address;
    var port = server.address().port;
    if (host == "::") {
        console.log('host', host);
        console.log('Mongino UI on port:' + port + ".");
        console.log('Launch it here');
        console.log("http://localhost:" + port);
        console.log("");
    }
});

if (app && app.whenReady) {


    var browserConfig = {
        width: startPos.width,
        height: startPos.height,
        x: startPos.x,
        y: startPos.y,
        webPreferences: {
            acceptFirstMouse: true,
            useContentSize: true,
            nodeIntegration: true
        }
    }

    if (showFrame !== true) {
        browserConfig.frame = false;
        browserConfig.transparent = true;
    }


    const createWindow = () => {
        const win = new BrowserWindow(browserConfig)


        win.loadFile('ui-app/index.html');
        win.setMenuBarVisibility(false);

        win.focus();
        if (showDev == true) {
            win.webContents.openDevTools();
        }

        return win;
    }

    app.whenReady().then(() => {
        createWindow()
    })
}

var express = require('express');
var http = require('http');
require('dotenv').config();
var webApp = express();
const { app, BrowserWindow, ipcMain } = require('electron')
const { contextBridge, ipcRenderer } = require('electron')


function handleSetTitle (event, title) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win.setTitle(title)
  }
  

var path = require('path');
const chokidar = require('chokidar');

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

try {
    //--- Application backend updates hot swappable
    var tmpAppServerFilesLoc = $.scope.locals.path.start + '/appserver/';
    chokidar.watch(tmpAppServerFilesLoc, { ignored: /index\.js$/ })
        .on('change', (path) => {
            try {
                if (require.cache[path]) delete require.cache[path];
                console.log('New file loaded for ' + path);
            } catch (theChangeError) {
                console.log("Could not hot update: " + path);
                console.log("The reason: " + theChangeError);
            }
        });
} catch (ex) {
    console.log('error in watch setup for apps',ex)
}

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
        console.log('error in winsock processing', error);
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


    browserConfig.webPreferences = {
        preload: path.join(__dirname, 'preload.js')
    }

    const createWindow = () => {
        const win = new BrowserWindow(browserConfig)

        ipcMain.on('set-title', (event, title) => {
            const webContents = event.sender
            const win = BrowserWindow.fromWebContents(webContents)
            win.setTitle(title);
            return 'title set';
        })

        win.once('ready-to-show', () => {
            win.setMenuBarVisibility(false);
            win.focus();
            if (showDev == true) {
                win.webContents.openDevTools();
            }
        })

        win.loadFile('ui-app/index.html');

        return win;
    }

    app.whenReady().then(() => {
        ipcMain.handle('ping', function(){return 'pong'})

        ipcMain.handle('get-startup-info', function(){
            return {
                port: process.env.PORT || '33462'
            }
        })

        ipcMain.handle('api', function(theEvent, theType, theName, theOptions){
            var tmpFilePath = $.scope.locals.path.start + '/ipcapi/' + theType + '/' + theName + '.js';
            var tmpProcessReq = require(tmpFilePath);
            if (typeof(tmpProcessReq.setup) == 'function') {
                var tmpToRun = tmpProcessReq.setup($.scope);
                return tmpToRun(theType, theName, theOptions);
            } else {
                return ThisApp.util.rejectedPromise('invalid type or action')
            }
        //    return scope.locals.$.file.getJsonFile(scope.locals.path.root + '/test.json');
        })
        
        createWindow()
    })
}

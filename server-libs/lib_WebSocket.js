/*
  Standard WebSocket Library
*/
'use strict';

const { WebSocket, WebSocketServer } = require('ws');

const WebSocketManager = class {
    constructor(theOptions) {
      this.options = theOptions || {};
    }
    setup(scope){
        this.scope = scope;
    }
    s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    getUniqueID() {
        return this.s4() + this.s4() + '-' + this.s4();
    };

  };

const mgr = new WebSocketManager();

//==== WebSocketRoom === === === === === === === === === === 

const WebSocketRoom = class {
    constructor(theOptions) {
      this.options = theOptions || {};
      this.name = this.options.name || 'default';
      this.server = this.options.server || false;
      this.onConnect = this.options.onConnect || false;
      this.onMessage = this.options.onMessage || false;
      this.onSocketAdd = this.options.onSocketAdd || false;
      this.onSocketRemove = this.options.onSocketRemove || false;

      //--- Set pingInterval t0 0 to not ping clients
      //      else set using a MS value
      this.pingInterval = this.options.pingInterval || 120000;

      
      var self = this;
      if( this.options.autoManage !== false && this.server){
        //--- Automaically handle access management

        this.server.on('connection', function connection(ws,req) {

            try {

                ws.isAlive = true;

                self.addClient(ws, req);
                ws.on('close', function () {
                    self.removeClient(this.id);
                })

                ws.on('pong', function () { this.isAlive = true; });
                ws.on('error', console.error);
                ws.on('message', function message(data, isBinary) {
                    if (self.onMessage) {
                        self.onMessage(this, data, isBinary)
                    }
                });
                if (self.onConnect) {
                    //--- Has .id added at this point
                    self.onConnect(ws);
                }



            } catch (error) {
                console.error('Error on connection',error)
            }
            
        
        });

        if( this.pingInterval > 0 ){
            const interval = setInterval(function ping() {
                self.server.clients.forEach(function each(ws) {
                    if (ws.isAlive === false) return ws.terminate();
                    ws.isAlive = false;
                    ws.ping();
                });
            }, this.pingInterval);
            
            this.server.on('close', function close() {
                clearInterval(interval);
            });
        }

      }
      
      this.reset();
    }


    reset(){
        this.clientIndex = {};
    }

    getClientIndex(){
        return this.clientIndex;
    }

    
    getClient(theID){
        if(this.clientIndex[theID]){
            return this.clientIndex[theID];
        }
        return false;
    }

    removeClient(theID){
        if(this.clientIndex[theID]){
            delete this.clientIndex[theID];
        }
        if( this.onSocketRemove ){
            this.onSocketRemove(theID)
        }
    }

    addClient(ws,req){        
        ws.id = req.headers['sec-websocket-key'] || mgr.getUniqueID();
        this.clientIndex[ws.id] = {
            id: ws.id,
            url: req.url,
            ws: ws
        }
        if( this.onSocketAdd ){
            this.onSocketAdd(ws.id)
        }
    }

    sendDataToClient(theID, data, isBinary){
        if( typeof(data) == 'object'){
            data = JSON.stringify(data);
        }
        var tmpClient = this.clientIndex[theID];
        if( tmpClient && tmpClient.ws ){
            tmpClient.ws.send(data, { binary: isBinary });
        }
    }
    //--- pass blank for theSenderID to send to all
    sendDataToAll(data, isBinary, theSenderID){
        if( typeof(data) == 'object'){
            data = JSON.stringify(data);
        }
        this.server.clients.forEach(function each(ws) {
            if( ws.id !== theSenderID ){
                ws.send(data, { binary: isBinary });
            }
        });
    }

    getRoomName() {
      return this.name;
    }
  };


  module.exports.WebSocketRoom = WebSocketRoom;
  module.exports.WebSocketServer = WebSocketServer;
  module.exports.WebSocket = WebSocket;
  module.exports.mgr = mgr;

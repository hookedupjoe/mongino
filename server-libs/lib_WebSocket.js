/*
  Standard WebSocket Library
*/
'use strict';

//let $ = require("./globalUtilities").$;
const { WebSocket, WebSocketServer } = require('ws');

//$.WebSocketManager = new WebSocketManager();

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

//--- ToDo: Add periodic ping to assure clients still alive
const WebSocketRoom = class {
    constructor(theOptions) {
      this.options = theOptions || {};
      this.name = this.options.name || 'default';
      this.server = this.options.server || false;
      this.onMessage = this.options.onMessage || false;
      this.onSocketAdd = this.options.onSocketAdd || false;
      this.onSocketRemove = this.options.onSocketRemove || false;

      var self = this;
      if( this.options.autoManage === true && this.server){
        //--- Automaically handle access management

        this.server.on('connection', function connection(ws,req) {

            self.addClient(ws,req);
            ws.on('close', function() {
               self.removeClient(this.id);
            })

            ws.on('error', console.error);
            ws.on('message', function message(data, isBinary) {
                if( self.onMessage ){
                    self.onMessage(this,data,isBinary)
                }
                
            });
            
        });
      }
      this.reset();
    }

    reset(){
        this.clientIndex = {};
    }

    getClientIndex(){
        return this.clientIndex;
    }

    addSocket(ws,req){
        var self = this;
        this.addClient(ws,req);

        ws.on('error', console.error);

        ws.on('close', function() {
            self.removeClient(this.id);
        })

        ws.on('message', function message(data, isBinary) {
          self.onMessage(this.id,data,isBinary)
        });
    }

    getClient(theID){
        if(this.clientIndex[theID]){
            return this.clientIndex[theID];
        }
        return false;
    }

    removeClient(theID){
        console.log('remove',theID);
        if(this.clientIndex[theID]){
            delete this.clientIndex[theID];
        }
        if( this.onSocketRemove ){
            this.onSocketRemove(theID)
        }
        console.log('clientIndex',this.clientIndex);
    }

    addClient(ws,req){        
        //req.headers['sec-websocket-key'] || ... (use this?)
        ws.id = req.headers['sec-websocket-key'] || mgr.getUniqueID();
        console.log('add',ws.id);
        this.clientIndex[ws.id] = {
            id: ws.id,
            url:req.url
        }
        if( this.onSocketAdd ){
            this.onSocketAdd(ws.id)
        }
        console.log('clientIndex',this.clientIndex);
    }


    getRoomName() {
      return this.name;
    }
  };


  //module.exports.WebSocketManager = WebSocketManager;
  module.exports.WebSocketRoom = WebSocketRoom;
  module.exports.WebSocketServer = WebSocketServer;
  module.exports.WebSocket = WebSocket;
  module.exports.mgr = mgr;
  

// //--- Make classes available off the manager for ease of use
// $.WebSocketManager.WebSocketRoom = WebSocketRoom;
// $.WebSocketManager.WebSocketServer = WebSocketServer;
// $.WebSocketManager.WebSocket = WebSocket;

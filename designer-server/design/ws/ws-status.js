'use strict';
const THIS_MODULE_NAME = 'ws-status';
const THIS_MODULE_TITLE = 'Create websock interface for real time status';
var isSetup = false;
var wssMain = false;
module.exports.setup = function setup(scope, options) {
    var config = scope;
    var options = options || {};
    var $ = config.locals.$;

    console.log( 'isSetup', isSetup);
    function Route() {
        this.name = THIS_MODULE_NAME;
        this.title = THIS_MODULE_TITLE;
    }
    var base = Route.prototype;

    var $ = config.locals.$;
    var bld = $.bld;

    if( options.websocket === true ){
        const { WebSocketServer } = require('ws');

        if( !isSetup ){
            wssMain = new WebSocketServer({ noServer: true });
            wssMain.on('connection', function connection(ws) {
                ws.on('error', console.error);
                ws.on('message', function message(data) {
                    console.log('ws-status received: %s', data);
                    ws.send('ws-status says howdy');
                });
                ws.send('ws-status says welcome');
            });
            isSetup = true;
            console.log('new websock')
        }
        
        return wssMain;
    }
   



    //--- Load the prototype
    base.run = function (req, res, next) {
        var self = this;

        return new Promise( async function (resolve, reject) {
            try {

                var tmpRet = {status: true};
                resolve(tmpRet);
            

            }
            catch (error) {
                console.log('Err : ' + error);
                reject(error);
            }

        });



    }

   



    //====== IMPORTANT --- --- --- --- --- --- --- --- --- --- 
    //====== End of Module / setup ==== Nothing new below this
    return  async function processReq(req, res, next) {
        try {
            var tmpRoute = new Route();
            var tmpResults = await(tmpRoute.run(req, res, next));

            //--- Getting documents to use directly by source, 
            //    .. do not wrap the success flag
            res.json(tmpResults)
        } catch (ex) {
            res.json({ status: false, error: ex.toString() })
        }
    }
};






/*
Entry point for Application Server Side Functionality
*/
'use strict';

module.exports.setup = function setup(scope) {

    let $ = scope.locals.$;
    scope.locals.path.appserver = scope.locals.path.ws.uiAppServers;
    
    return  async function processReq(req, res, next) {
        

        var tmpType = req.params.type || ''
        var tmpName = req.params.name || ''
        var tmpRet = {}
        
        tmpRet.type = tmpType;
        tmpRet.name = tmpName;
        tmpName = tmpName
            .replace('.json', '')
            .replace('/control.js', '')
            .replace('.js', '');

        try {
            
        var tmpFilePath = scope.locals.path.start + '/appserver/' + tmpType + '/' + tmpName + '.js';
        var tmpProcessReq = require(tmpFilePath);
        if (typeof(tmpProcessReq.setup) == 'function') {
            var tmpToRun = tmpProcessReq.setup(scope);
            tmpToRun(req, res, next);
            return
        } else {
            res.json({status:false, error: "Could not find action " + tmpName})
            return
        }

        
        } catch (ex) {
            res.json({status:false, error: ex.toString()})
        }
    };


};

/*
Entry point for Designer
*/
'use strict';

module.exports.setup = function setup(scope) {

    let $ = scope.locals.$;
    scope.locals.path.design = scope.locals.path.start + "/design"
    
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

            
        var tmpIsAllowed = true;
        var tmpAccessType = 0; //--- ToDo: Determine access type based on action
        //--- May have passed anonymous?
        if( req.authUser ){
            tmpIsAllowed = await $.AuthMgr.isAllowed(req.authUser.id,{system:'design'}, tmpAccessType)
        }

        
        if( !(tmpIsAllowed) ){
            return res.sendStatus(401);
        }
        
            
        var tmpFilePath = scope.locals.path.design + '/' + tmpType + '/' + tmpName + '.js';
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

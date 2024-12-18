/*
Entry point for Application Data
*/
'use strict';

module.exports.setup = function setup(scope) {

    let $ = scope.locals.$;
    scope.locals.path.appdata = scope.locals.path.start + "/appdata"
    
    return  async function processReq(req, res, next) {

       
        
        var tmpType = req.params.type || ''
        var tmpName = req.params.name || ''

        var tmpAppID = req.headers['act-app-id'] || '';

        if( tmpAppID ){
            //--- Always use header value, even if appid passed
            req.body.appid = tmpAppID;
        //--- Optional ... do not allow if not in header?
        //     Maybe only designer level access can specify app?
        // } else {
        //     return res.sendStatus(401);
        }

        var tmpAppInfo = false;
        var tmpAccountID = '';
        var tmpDBName = '';
        if( req.body && req.body.appid ){
            tmpAppID = req.body.appid
            tmpAppInfo = $.appIndex[req.body.appid];
            
            if( tmpAppInfo ){
                tmpAccountID = tmpAppInfo['data-account-id'] || '_home';
                tmpDBName = tmpAppInfo['data-db-name'] || tmpAppInfo.name;
                tmpDBName = $.MongoManager.options.prefix.db + tmpDBName;
            }
            //--- Load account and dbname from app details

            //--- ToDo: Remove this from here - add to header????
            if( tmpAccountID && tmpDBName ){
                req.body.accountid = tmpAccountID;
                req.body.dbname = tmpDBName;
            }
            
        }
        if( !(tmpAppID)){
            //--- If no app ID is passed, they don't know what they are doing - show denied?
            //console.log('no app id');
            //----ToDo: Assure system admin/dev for this update
            //return res.sendStatus(401);
        }

        var tmpIsAllowed = false;
        var tmpAccessType = 0; //--- ToDo: Determine access type based on action or method

        if( tmpName == 'get-appdocs.json'){
            tmpAccessType = 0;
        } else if( tmpName == 'save-doc.json' || tmpName == 'recycle-docs.json'){
            tmpAccessType = 2;
        }
        

        //--- May have passed anonymous?
        var tmpDBName = req.body.dbname;

        
        
        if( req.authUser ){
            if( !(tmpDBName) ){
                tmpIsAllowed = await $.AuthMgr.isAllowed(req.authUser.id,{system:'design'}, 0)
            } else {
                tmpIsAllowed = await $.AuthMgr.isAllowed(req.authUser.id,{db:tmpDBName}, tmpAccessType)
            }
        } else {
            if( tmpDBName ){
                tmpIsAllowed = await $.AuthMgr.isAllowed('',{db:tmpDBName}, tmpAccessType)
            }
        }
       
        if( !(tmpIsAllowed) ){
            return res.sendStatus(401);
        }
        
        var tmpRet = {}
        
        tmpRet.type = tmpType;
        tmpRet.name = tmpName;
        tmpName = tmpName
            .replace('.json', '')
            .replace('/control.js', '')
            .replace('.js', '');

        try {
        var tmpBasePath = scope.locals.path.appdata.replace('preview-server','designer-server');
        var tmpFilePath = tmpBasePath + '/' + tmpType + '/' + tmpName + '.js';
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
            console.log('error here')
            res.json({status:false, error: ex.toString()})
        }
    };


};

/*
Entry point for Application Server Side Functionality
*/
'use strict';

module.exports.setup = function setup(scope) {

    let $ = scope.locals.$;
    scope.locals.path.appserver = scope.locals.path.ws.uiAppServers;
    
    return  async function processReq(req, res, next) {
        // if( req.authUser ){
        //     //--- validate access?
        // } else {
            
        //     if( $.isUsingPassport ){
        //         console.log('app server no');
        //         return res.sendStatus(401)
        //     }
        //     console.log('Anonymous Access')
        // }

        


        var tmpAppID = req.headers['act-app-id'] || '';
        if( !(tmpAppID) ){
            const tmpURL = new URL(req.headers.referer);
            var tmpAppName = req.headers.referer.replace(tmpURL.origin,'').replace(/\//g,'');
            tmpAppID = tmpAppName;
        }
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

        var tmpIsAllowed = true;
        var tmpAccessType = 0; //--- ToDo: Determine access type based on action
        //--- May have passed anonymous?
        if( req.authUser ){
            var tmpDBName = req.body.dbname;
            tmpIsAllowed = await $.AuthMgr.isAllowed(req.authUser.id,{db:req.body.dbname}, tmpAccessType)
        } else {
            tmpIsAllowed = await $.AuthMgr.isAllowed('',{db:req.body.dbname}, tmpAccessType)
        }

        
        if( !(tmpIsAllowed) ){
            //return res.sendStatus(401);
        }
        
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
            
        var tmpFilePath = scope.locals.path.appserver + tmpAppID + '/appserver/' + tmpType + '/' + tmpName + '.js';
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

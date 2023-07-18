/*
  Standard MongoDB Access Library
*/
'use strict';
const bcrypt = require("bcrypt")
const { ObjectId } = require('mongodb');

let $,
    scope,
    AuthMgr;

    
function setup(theScope) {
    scope = theScope;
    $ = scope.$;
    AuthMgr = new AuthManager();
    $.AuthMgr = AuthMgr;
    //console.log('setup auth',typeof($.AuthMgr));
}

module.exports.setup = setup;

function AuthManager(theOptions) {
    this.authOptions = theOptions || {};
    
}
var meAuthManager = AuthManager.prototype;
module.exports.AuthManager = AuthManager;

meAuthManager.saveUser = async function(theUser, theOptions){
    return new Promise( async function (resolve, reject) {
        try {
            var tmpUser = theUser;
            
            var tmpAccount = await $.MongoManager.getAccount('_home');
            var tmpDB = await tmpAccount.getDatabase($.MongoManager.options.names.directory);
            var tmpDocType = 'user';
            var tmpCollName = $.MongoManager.options.prefix.datatype + tmpDocType;

            var tmpAddRet = false;
            var tmpID = tmpUser.data._id || false;
            if( tmpID == 'system_admin_user'){
                reject('Invalid requeset');
            }
            //--- Remove ID (even if blank) for add / edit operations
            if( tmpUser.data.hasOwnProperty('_id')){
                delete tmpUser.data._id;
            }
            if( tmpUser.data.password ){
                tmpUser.data.password = await bcrypt.hash(tmpUser.data.password, 10);
            }
            
            if( tmpID ){
                var tmpCollection = await tmpDB.getCollection(tmpCollName);
                var tmpUD =  { $set: tmpUser.data };
                tmpAddRet = await tmpCollection.updateOne({_id: new ObjectId(tmpID)}, tmpUD)

            } else {
                tmpAddRet = await tmpDB.createDoc(tmpCollName, tmpUser.data);
            }
           
            var tmpRet = {success:true};
            tmpRet = $.merge(false, tmpRet, tmpAddRet);

            resolve(tmpRet);

        }
        catch (error) {
            console.log('Err : ' + error);
            reject(error);
        }

    });

}

meAuthManager.getUsers = async function(){
    return new Promise( async function (resolve, reject) {
        try {
            var tmpAccount = await $.MongoManager.getAccount('_home');
            var tmpDB = await tmpAccount.getDatabase($.MongoManager.options.names.directory);
            var tmpDocType = 'user';
            var tmpMongoDB = tmpDB.getMongoDB();
            var tmpDocs = await tmpMongoDB.collection($.MongoManager.options.prefix.datatype + tmpDocType).find().filter({__doctype:tmpDocType}).toArray();
            var tmpRet = {success:true};
            tmpRet = $.merge(false, tmpRet, {data:tmpDocs});
            resolve(tmpRet);
        }
        catch (error) {
            console.log('Err : ' + error);
            reject(error);
        }
    });
}



meAuthManager.getSystemAclEntries = async function(theOptions){
    return new Promise( async function (resolve, reject) {
        try {
            var tmpAccount = await $.MongoManager.getAccount(theOptions.accountid);
            var tmpDB = await tmpAccount.getDatabase($.MongoManager.options.names.directory);
            var tmpDocType = 'systemaclentry';
            var tmpCollName = $.MongoManager.options.prefix.datatype + tmpDocType;
            
            var tmpMongoDB = tmpDB.getMongoDB();
            var tmpDocs = await tmpMongoDB.collection(tmpCollName).find({}).filter({__doctype:tmpDocType}).toArray();
            var tmpRet = {success:true};
            tmpRet = $.merge(false, tmpRet, {data:tmpDocs});
            resolve(tmpRet);
        }
        catch (error) {
            console.log('Err : ' + error);
            reject(error);
        }
    });
}

meAuthManager.getAclEntries = async function(theOptions){
    return new Promise( async function (resolve, reject) {
        try {
            var tmpAccount = await $.MongoManager.getAccount(theOptions.accountid);
            var tmpDB = await tmpAccount.getDatabase(theOptions.dbname);
            var tmpDocType = 'aclentry';
            var tmpCollName = $.MongoManager.options.names.aclcollection;
            
            var tmpMongoDB = tmpDB.getMongoDB();
            var tmpDocs = await tmpMongoDB.collection(tmpCollName).find({}).filter({__doctype:tmpDocType}).toArray();
            var tmpRet = {success:true};
            tmpRet = $.merge(false, tmpRet, {data:tmpDocs});
            resolve(tmpRet);
        }
        catch (error) {
            console.log('Err : ' + error);
            reject(error);
        }
    });
}

meAuthManager.saveAclEntry = async function(theEntry){
    return new Promise( async function (resolve, reject) {
        try {
            var tmpAccount = await $.MongoManager.getAccount(theEntry.accountid);
            var tmpIsSystem = false;
            if( theEntry.options && theEntry.options.acltype == 'system'){
                tmpIsSystem = true;
            }
            var tmpDB = '';
            if( tmpIsSystem ){
                tmpDB = await tmpAccount.getDatabase($.MongoManager.options.names.directory);
            } else {
                tmpDB = await tmpAccount.getDatabase(theEntry.dbname);
            }
            //var tmpDocType = 'aclentry';
            var tmpCollName = $.MongoManager.options.names.aclcollection;

            if( tmpIsSystem ){
                tmpCollName = $.MongoManager.options.prefix.datatype + 'systemaclentry';
            }

            var tmpAddRet = false;
            var tmpID = theEntry.data._id || false;
            //--- Remove ID (even if blank) for add / edit operations
            if( theEntry.data.hasOwnProperty('_id')){
                delete theEntry.data._id;
            }
            if( tmpID ){
                var tmpCollection = await tmpDB.getCollection(tmpCollName);
                var tmpUD =  { $set: theEntry.data };
                tmpAddRet = await tmpCollection.updateOne({_id: new ObjectId(tmpID)}, tmpUD)

            } else {
                tmpAddRet = await tmpDB.createDoc(tmpCollName, theEntry.data);
            }
           
            var tmpRet = {success:true};
            tmpRet = $.merge(false, tmpRet, tmpAddRet);

            resolve(tmpRet);

        }
        catch (error) {
            console.log('Err : ' + error);
            reject(error);
        }

    });

}



meAuthManager.recycleUsers = async function(theOptions){
    return new Promise( async function (resolve, reject) {
        try {
            var tmpAccount = await $.MongoManager.getAccount();
            var tmpDB = '';
            tmpDB = await tmpAccount.getDatabase($.MongoManager.options.names.directory);

            var tmpDocType = 'user';
            var tmpCollName =$.MongoManager.options.prefix.datatype + tmpDocType;

            var tmpProcIds = [];

            var tmpColl = await tmpDB.getCollection(tmpCollName)
            for( var iPos in theOptions.ids ){
                var tmpID = theOptions.ids[iPos];
                tmpProcIds.push(new ObjectId(tmpID));
            }
            var tmpUD =  { $set: { '__doctype' : '_deleted' } }
            var tmpQuery = { _id: { $in: tmpProcIds } };
            var tmpRunRet = await tmpColl.updateMany(tmpQuery, tmpUD);
            var tmpRet = {success:true};
            tmpRet = $.merge(false, tmpRet, tmpRunRet);

            resolve(tmpRet);

        }
        catch (error) {
            console.log('Err : ' + error);
            reject(error);
        }

    });

}

meAuthManager.recycleAclEntries = async function(theOptions){
    return new Promise( async function (resolve, reject) {
        try {
            var tmpIsSystem = false;
            if( theOptions.options && theOptions.options.acltype == 'system'){
                tmpIsSystem = true;
            }
   
            var tmpAccount = await $.MongoManager.getAccount(theOptions.accountid);
           ///var tmpDB = await tmpAccount.getDatabase(theOptions.dbname);
            var tmpDB = '';
            if( tmpIsSystem ){
                tmpDB = await tmpAccount.getDatabase($.MongoManager.options.names.directory);
            } else {
                tmpDB = await tmpAccount.getDatabase(theOptions.dbname);
            }

            var tmpDocType = 'aclentry';
            var tmpCollName = $.MongoManager.options.names.aclcollection;
            if( tmpIsSystem ){
                tmpCollName = $.MongoManager.options.prefix.datatype + 'systemaclentry';
            }
            var tmpProcIds = [];

            var tmpColl = await tmpDB.getCollection(tmpCollName)
            for( var iPos in theOptions.ids ){
                var tmpID = theOptions.ids[iPos];
                tmpProcIds.push(new ObjectId(tmpID));
            }
            var tmpUD =  { $set: { '__doctype' : '_deleted' } }
            var tmpQuery = { _id: { $in: tmpProcIds } };
            var tmpRunRet = await tmpColl.updateMany(tmpQuery, tmpUD);
            var tmpRet = {success:true};
            tmpRet = $.merge(false, tmpRet, tmpRunRet);

            resolve(tmpRet);

        }
        catch (error) {
            console.log('Err : ' + error);
            reject(error);
        }

    });

}

meAuthManager.isSystemAllowed = async function(theUserId){
    return new Promise( async function (resolve, reject) {
        try {
            if( theUserId == 'system_admin_user'){
                resolve(true);
            }

            var tmpCollName = tmpCollName = '-mo-dt-systemaclentry'
            var tmpDocType = 'systemaclentry';
            var tmpDBName = $.MongoManager.options.names.directory; 

            var tmpAccount = await $.MongoManager.getAccount('_home');
            var tmpDB = await tmpAccount.getDatabase(tmpDBName);
            var tmpMongoDB = tmpDB.getMongoDB();
            var tmpFilter = {"__doctype": tmpDocType,"entryname": theUserId, "type": "person"};
            var tmpDocs = await tmpMongoDB.collection(tmpCollName).find({}).filter(tmpFilter).toArray();
            if( !(tmpDocs) || tmpDocs.length == 0){
                resolve(false);
            } else {
                //--- ToDo: Check access level
                resolve(true);
            }
            resolve(true);
        }
        catch (error) {
            console.log('Error in isAllow: ' + error);
            resolve(false);
        }
    });
}


meAuthManager.isAllowed = async function(theUserId, theResource, thePermission){
    var self = this;
    return new Promise( async function (resolve, reject) {
        try {
            if( theUserId == 'system_admin_user'){
                resolve(true);
            }
            
            var tmpIsDesign = ( theResource.system == 'design' );
           

            var tmpCollName = $.MongoManager.options.names.aclcollection;
            var tmpDocType = 'aclentry';
            var tmpDBName = theResource.database || theResource.db || '';
            
            var tmpResType = '';
            var tmpResID = '';

            if( tmpDBName ){
                tmpResType = 'db';
                tmpResID = tmpDBName;
            }

            //--- Just in case an api call is made with / in the end
            if( tmpDBName.indexOf('?') > -1 ){
                tmpDBName = '';
            }

            if( tmpIsDesign || !(tmpDBName)){
                if( await self.isSystemAllowed(theUserId) ){
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
            if( !(tmpResID) ){
                resolve(false);
            }

            var tmpAccount = await $.MongoManager.getAccount('_home');
            var tmpDB = await tmpAccount.getDatabase(tmpDBName);
            var tmpMongoDB = tmpDB.getMongoDB();
            var tmpFilter, tmpDocs;
            //--- See if no username , check anonymous access, kick out
            if( !(theUserId) ){
                tmpFilter = {"__doctype": tmpDocType,"entryname": '-mo-anonymous', "type": "person"}; 
                tmpDocs = await tmpMongoDB.collection(tmpCollName).find({}).filter(tmpFilter).toArray();
                if( (tmpDocs) && tmpDocs.length == 1){
                    resolve(true);
                } else {
                    resolve(false);
                }   
            }
            //--- ToDo: Combine filter into one for -mo-user ?
            tmpFilter = {"__doctype": tmpDocType,"entryname": theUserId, "type": "person"};
            tmpDocs = await tmpMongoDB.collection(tmpCollName).find({}).filter(tmpFilter).toArray();
            if( !(tmpDocs) || tmpDocs.length == 0){
                if( await self.isSystemAllowed(theUserId) ){
                    resolve(true);
                } else {
                    tmpFilter = {"__doctype": tmpDocType,"entryname": '-mo-user', "type": "person"};
                    tmpDocs = await tmpMongoDB.collection(tmpCollName).find({}).filter(tmpFilter).toArray();
                    if( (tmpDocs) && tmpDocs.length == 1){
                        resolve(true);
                    } else {
                        resolve(false);
                    }  
                }
            } else {
                //--- ToDo: Check access level
                resolve(true);
            }
            resolve(true);
        }
        catch (error) {
            console.error('Error in isAllowed: ' + error);
            resolve(false);
        }
    });
}

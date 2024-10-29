'use strict';
const THIS_MODULE_NAME = 'save-doc';
const THIS_MODULE_TITLE = 'Data: Save Mongino Doc in MongoDB';
//ToDo: Save and Create as one .. just save?  
//      Add a flag for create?
module.exports.setup = function setup(scope) {
    var config = scope;
    var $ = config.locals.$;
    
    function Route() {
        this.name = THIS_MODULE_NAME;
        this.title = THIS_MODULE_TITLE;
    }
    var base = Route.prototype;
    const { ObjectId } = require('mongodb');
    
    var $ = config.locals.$;

    //--- Load the prototype
    base.run = async function (req, res, next) {
        var self = this;
        return new Promise( async function (resolve, reject) {
            try {
                var tmpBody = req.body || {};
                if (typeof (tmpBody) == 'string') {
                    try {
                        tmpBody = JSON.parse(tmpBody)
                    } catch (ex) {
                        throw("Bad JSON Passed")
                    }
                }
                
                var tmpAccount = await $.MongoManager.getAccount(tmpBody.accountid);
                var tmpDB = await tmpAccount.getDatabase(tmpBody.dbname);
                var tmpDocType = tmpBody.doctype || '';
                var tmpCollName = $.MongoManager.options.prefix.datatype  + tmpDocType;
                // var tmpIsAllowed = false;

                // if( req.session && req.session.passport && req.session.passport.user ){
                //     var tmpUserInfo = req.session.passport.user;
                //     var tmpUserID = tmpUserInfo.id;

                //     console.log('user',tmpUserInfo.id)
                //     tmpIsAllowed = await $.AuthMgr.isAllowed(tmpUserID,{db:tmpBody.dbname}, 0)
                //     console.log('tmpIsAllowed',tmpIsAllowed)
                    
                // } else {
                //     console.log('user is anonymous - not allowed');
                //     reject('Not Authorized');
                //     return;
                // }



                var tmpAddRet = false;
                var tmpID = tmpBody.data._id || false;
                //--- Remove ID (even if blank) for add / edit operations
                if( tmpBody.data.hasOwnProperty('_id')){
                    delete tmpBody.data._id;
                }
                if( tmpID ){
                    var tmpCollection = await tmpDB.getCollection(tmpCollName);
                    var tmpUD =  { $set: tmpBody.data };
                    tmpAddRet = await tmpCollection.updateOne({_id: new ObjectId(tmpID)}, tmpUD)

                } else {
                    tmpAddRet = await tmpDB.createDoc(tmpCollName, tmpBody.data);
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






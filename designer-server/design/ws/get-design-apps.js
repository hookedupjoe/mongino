'use strict';
const THIS_MODULE_NAME = 'get-design-apps';
const THIS_MODULE_TITLE = 'Design: Get Applications in this system';
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

    var $ = config.locals.$;

    //--- Load the prototype
    base.run = async function (req, res, next) {
        var self = this;
        return new Promise( async function (resolve, reject) {
            try {
                // var tmpBody = req.body || {};
                // if (typeof (tmpBody) == 'string') {
                //     try {
                //         tmpBody = JSON.parse(tmpBody)
                //     } catch (ex) {
                //         throw("Bad JSON Passed")
                //     }
                // }

                // var tmpAccount = await $.MongoManager.getAccount(tmpBody.accountid);
                // var tmpDB = await tmpAccount.getDatabase(tmpBody.dbname);
                // var tmpDocType = tmpBody.doctype;
                // var tmpMongoDB = tmpDB.getMongoDB();
                // var tmpDocs = await tmpMongoDB.collection($.MongoManager.options.prefix.datatype + tmpDocType).find().filter({__doctype:tmpDocType}).toArray();
                var tmpRet = {success:true};
                // tmpRet = $.merge(false, tmpRet, {data:tmpDocs});

                var tmpWSDir = scope.locals.path.ws.uiApps;
                
                var tmpFiles = await($.bld.getDirFiles(tmpWSDir))
                var tmpDocs = [];
                for (var index in tmpFiles) {
                    var tmpAppName = tmpFiles[index];
                    var tmpAppBase = tmpWSDir + tmpAppName + '/';
                    var tmpAppDetails = await($.bld.getJsonFile(tmpAppBase + 'app-info.json'))
                    var tmpAppTitle = tmpAppDetails.title || "(untitled)";
                    tmpDocs.push({
                        name:tmpAppName,
                        baseURL:tmpAppBase,
                        details:tmpAppDetails,
                        title: tmpAppTitle
                    })
                   
                }
                tmpRet.data = tmpDocs;
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






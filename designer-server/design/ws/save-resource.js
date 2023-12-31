'use strict';
const THIS_MODULE_NAME = 'save-resource';
const THIS_MODULE_TITLE = 'Process: Save a resource';

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
    base.run = function (req, res, next) {
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

                var tmpWSDir = scope.locals.path.ws.uiApps;
                var tmpPagesDir = scope.locals.path.ws.pages;
                var tmpCatDir = scope.locals.path.ws.catalogs;

                var tmpReq = tmpBody;

                var tmpCatName = tmpReq.catname || '';
                var tmpAppName = tmpReq.appname || '';
                var tmpResName = tmpReq.resname || '';
                var tmpResType = tmpReq.restype || '';
                var tmpPageName = tmpReq.pagename || '';

                var tmpResDetails = {
                    dir: ''
                };
                if( tmpResType ){
                    tmpResDetails = $.bld.detailsIndex.getDetails(tmpResType);
                }
                // if (!(tmpPageName)) {
                //     throw "Page name not provided"
                // }
                if ( typeof(tmpReq.content) != 'string' ){
                    throw 'No text content provided';
                }

                var tmpResBase = '';
                if ( !(tmpAppName || tmpCatName )){
                    throw 'No container app or catalog provided';
                }

                if( tmpAppName ){
                    var tmpAppBase = tmpWSDir + tmpAppName + '/';

                    var tmpAppDetails = await($.bld.getJsonFile(tmpAppBase + 'app-info.json'))
                    var tmpAppTitle = tmpAppDetails.title || '';
    
                    if (!(tmpAppTitle)) {
                        throw ("Application " + tmpAppName + " not found at " + tmpAppBase);
                    }
                    tmpResBase = tmpAppBase + 'catalog/';

                } else if( tmpCatName ){
                    var tmpCatBase = tmpCatDir + tmpCatName + '/';

                    var tmpCatDetails = await($.bld.getJsonFile(tmpCatBase + 'cat-info.json'))
                    var tmpCatTitle = tmpCatDetails.title || '';
    
                    if (!(tmpCatTitle)) {
                        throw ("Catalog " + tmpCatName + " not found at " + tmpCatBase);
                    }
                    tmpResBase = tmpCatBase;
                }

                
                var tmpPagesBase = tmpPagesDir;
                if( tmpPageName ){
                    tmpPagesBase = tmpAppBase + 'app/pages/';

                    var tmpPages = await($.bld.getDirFiles(tmpPagesBase))

                    if (tmpPages.indexOf(tmpPageName) == -1) {
                        throw "Page " + tmpPageName + " does not exists"
                    }
                    tmpResBase = tmpPagesBase + tmpPageName;
                }
       

                var tmpContentBase = tmpResBase + '/' + tmpResDetails.dir;

                await($.fs.ensureDir(tmpContentBase + '/'));

                var tmpFN = tmpContentBase + '/' + tmpResName;

                if( tmpResDetails.name == "Control" ){
                    await($.fs.ensureDir(tmpFN + '/'));
                }

                if( tmpResDetails.name == "Control"){
                    if(!tmpFN.endsWith('.js')){
                        tmpFN += '/control.js';
                    }
                } else if( tmpResDetails.name == "Panel"){
                    if(!tmpFN.endsWith('.json')){
                        tmpFN += '.json';
                    }
                } else if( !(tmpFN.endsWith('.html'))){
                    tmpFN += '.html';
                }

                if( !(tmpReq.content) ){
                    tmpReq.content = $.bld.getDefaultContentForResource(tmpResDetails.name);
                }
                await($.fs.writeFile(tmpFN, tmpReq.content));

                var tmpRet = {
                    status: true,
                    filename: tmpFN
                }

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


    function wrapIt(theString) {
        return '\r\n\r\n' + theString + '\r\n\r\n'
    }
};






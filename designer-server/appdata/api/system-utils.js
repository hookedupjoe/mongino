'use strict';
const THIS_MODULE_NAME = 'system-utils';
const THIS_MODULE_TITLE = 'Data: Utilities';

module.exports.setup = function setup(scope) {
    var config = scope;
    var $ = config.locals.$;
    
    function Route() {
        this.name = THIS_MODULE_NAME;
        this.title = THIS_MODULE_TITLE;
    }
    var base = Route.prototype;
    
    var $ = config.locals.$;

    
async function getPMList() {
    // Exec output contains both stderr and stdout outputs
    const running = await $.exec('pm2 jlist')

  
    return { 
        running: JSON.parse(running.stdout.trim())
    }
  };

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
                
                
                //var tmpGitInfo = await $.getGitUser();
                var tmpPMList = ( await getPMList() );
                var tmpPMListObj = {};
                try {
                    tmpPMListObj = JSON.parse(tmpPMList.trim());
                } catch (error) {
                    
                }
                //console.log('tmpPMListObj',tmpPMListObj);
               
                //gitInfo: tmpGitInfo,

                var tmpRet = {success:true, pmList:tmpPMList, pmObj:tmpPMListObj };
                //tmpRet = $.merge(false, tmpRet, tmpAddRet);

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






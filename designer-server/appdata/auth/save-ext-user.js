'use strict';
const THIS_MODULE_NAME = 'save-ext-user';
const THIS_MODULE_TITLE = 'Auth: Save External User';
//ToDo: Also create mongo user details?
//      roles?
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
        var tmpBody = req.body || {};
            if (typeof (tmpBody) == 'string') {
                try {
                    tmpBody = JSON.parse(tmpBody)
                } catch (ex) {
                    throw("Bad JSON Passed")
                }
            }
            console.log('req.params',req.params);
            return $.AuthMgr.saveExtUser(tmpBody);

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





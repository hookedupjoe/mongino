(function (ActionAppCore, $) {

	var ControlSpecs = { 
		options: {
			padding: false
		},
		content: [{
	"ctl": "layout",
	"name": "lo",
	"north": [
		{
			"ctl": "div",
			"name": "header",
			"text": '<div class="ui right aligned segment basic pad0 mar4"><div class="ui button compact small xtoright" action="closeFlyover">Close</div></div>'
		}
	],
	"center": [
		{
			"ctl": "control",
			"controlname":"ACLEntries",
			"catalog": "_data",
			"name": "body"
		}
	]
}]
	
      
	}

	var ControlCode = {};

    ControlCode.setup = setup;
    function setup(){
        //console.log("Ran setup")
    }

    ControlCode._onInit = _onInit;
    function _onInit(){
     
    }
    ControlCode._onPreInit = function(theOptions){
       this.details = {};
       var tmpOptions = theOptions || {};
       if( tmpOptions.details && tmpOptions.details.appname){
         this.setAppName(tmpOptions.details.appname);
       }
       
       console.log('pre init theOptions',theOptions)
      
      
    }

    // ControlCode.getAppName = getAppName;
    // function getAppName(){
    //     return  this.details.appname;
    // }    
    
    ControlCode.setAppName = setAppName;
    function setAppName(theAppName){
         this.details.appname = theAppName;
        this.isDesignerEditor = true;
    }

	var ThisControl = {specs: ControlSpecs, options: { proto: ControlCode, parent: ThisApp }};
	return ThisControl;
})(ActionAppCore, $);
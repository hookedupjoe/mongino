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
			"controlname":"ReportViewerFrame",
			"catalog": "designer",
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

	var ThisControl = {specs: ControlSpecs, options: { proto: ControlCode, parent: ThisApp }};
	return ThisControl;
})(ActionAppCore, $);
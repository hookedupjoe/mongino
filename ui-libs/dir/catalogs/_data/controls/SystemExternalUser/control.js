(function (ActionAppCore, $) {

	var ControlSpecs = {
	"content": [
		{
			"ctl": "title",
			"size": "Large",
			"color": "blue",
			"name": "title",
			"text": "External User"
		},
		{
			"ctl": "message",
			"color": "blue",
			"size": "large",
			"name": "welcome-info",
			"text": "User information for external user"
		},
		{
			"ctl": "fieldrow",
			"items": [
				{
					"label": "User ID",
					"type":"password",
					"ctl": "field",
					"name": "username",
					"req": true
				},
				{
					"label": "Provider",
					"ctl": "field",
					"name": "provider",
					"req": true
				}
			],
			"name": "user-row"
		},
		{
			"label": "Display Name",
			"ctl": "field",
			"name": "displayName",
			"req": false
		},
		
			{
				"name": "__doctype",
				"ctl": "hidden",
				"value": "externaluser"
			},
			{
				"name": "_id",
				"ctl": "hidden"
			},
			
			{
				"name": "__title",
				"ctl": "hidden"
			}
		
	],
	"options": {
		readonly: true
	}
}

	var ControlCode = {};

    ControlCode.setup = setup;
    function setup(){
        console.log("Ran setup")
    }

    ControlCode._onInit = _onInit;
    function _onInit(){
        //console.log("Ran _onInit")
    }

	var ThisControl = {specs: ControlSpecs, options: { proto: ControlCode, parent: ThisApp }};
	return ThisControl;
})(ActionAppCore, $);
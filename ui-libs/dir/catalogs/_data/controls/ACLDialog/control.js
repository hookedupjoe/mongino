(function (ActionAppCore, $) {

    var ControlSpecs = {
      options: {
        padding: false
      },
      content: [{
        "ctl": "layout",
        "name": "lo",
        "north": [{
          "ctl": "div",
          "name": "header",
          "text": '<div class="ui right aligned segment basic pad0 mar4"><div class="ui button compact small xtoright" action="closeFlyover">Close</div></div>'
        }],
        "center": [{
          "ctl": "control",
          "catalog": "_data",
          "controlname": "ACLEntries",
          "name": "aclentries"
        }]
      }]
  
  
    }
  
    var ControlCode = {};
  
    ControlCode.setup = setup;
    function setup() {
      //console.log("Ran setup")
    }
  
    ControlCode._onInit = _onInit;
    function _onInit() {
      // window.activeFlyover = this;
  
      // var tmpToOpen = {
      //   "ctl": "control",
      //   "controlname": "FieldTestDocs",
      //   "catalog": "__app",
      //   "name": "body"
      // }
  
  
    }
    ControlCode.open = open;
    function open(theOptions) {
      this.loadOptions(theOptions);
      var tmpLoadEl = ThisApp.getSpot$('flyover-menu');
      var self = this;
      this.loadToElement(tmpLoadEl, theOptions).then(function(){
        ThisApp.fullScreenFlyover();
        ThisApp.delay(10).then(function(){
          self.parts.aclentries.getViewControl().refresh()
        })
      })
      
    }
  
    
    ControlCode.loadOptions = function(theOptions) {
      this.details = this.details || {};
      var tmpOptions = theOptions || {};
      if (tmpOptions.details && tmpOptions.details.appname) {
        this.setAppName(tmpOptions.details.appname);
      }
    }
  
  
    ControlCode._onPreInit = function(theOptions) {
      this.isDesignerEditor = true;
      this.details = {};
      this.loadOptions(theOptions);
  
    }
  
    // ControlCode.getAppName = getAppName;
    // function getAppName(){
    //     return  this.details.appname;
    // }
  
    ControlCode.setAppName = setAppName;
    function setAppName(theAppName) {
      this.details.appname = theAppName;
    }
  
    var ThisControl = {
      specs: ControlSpecs,
      options: {
        proto: ControlCode,
        parent: ThisApp
      }};
    return ThisControl;
  })(ActionAppCore, $);
(function (ActionAppCore, $) {

    var ControlSpecs = {
      options: {
        padding: false,
        required: {
          templates: {
              map:
              {
                  "UserAdminDashHome": {source: "_data", name: "UserAdminDashHome"}
              }
          }
        }
      },
      content: [{
        "ctl": "layout",
        "name": "lo",
        "north": [{
          ctl: "control",
          name: "header",
          catalog: "_designer",
          controlname: "MainHeader"
        }],
        "center": [{
          ctl: "control",
          name: "tabs",
          catalog: "_designer",
          controlname: "TabsContainer"
        }]
  
      }]
    }
  
    var ControlCode = {};
  
    ControlCode.setup = setup;
    function setup() {
      //
    }
  
    
    
    
    ControlCode.showSystemACL = showSystemACL;
    function showSystemACL(theParams, theTarget){
        this.openSystemACLTab();
    }
    
    
    ControlCode.openSystemACLTab = function(){
      var tmpTabKey = 'tab-sys-acl';
      var tmpTabTitle = 'System ACL';
      var tmpIcon = 'key';
      var tmpParams = {};
      this.tabs.openTab({
        tabname: tmpTabKey,
        tabtitle: '<i class="icon ' + tmpIcon + ' blue"></i> ' + tmpTabTitle,
        controlname: 'SystemACLEntries',
        catalog: '_data',
        closable: true,
        setup: tmpParams
      });
    }
    ControlCode.showUsersTable = showUsersTable;
    function showUsersTable(theParams, theTarget){
        var tmpParams = ThisApp.getActionParams(theParams, theTarget, ['usertype']);
        console.log('tmpParams',tmpParams);
        if( tmpParams.usertype == "external"){
          return this.openExtUsersTab();
        }
        this.openUsersTab();
    }
    
    ControlCode.openExtUsersTab = function(){
      var tmpTabKey = 'tab-ext-sys-users';
      var tmpTabTitle = 'External Users';
      var tmpIcon = 'user';
      var tmpParams = {};
      this.tabs.openTab({
        tabname: tmpTabKey,
        tabtitle: '<i class="icon ' + tmpIcon + ' orange"></i> ' + tmpTabTitle,
        controlname: 'SystemExternalUsers',
        catalog: '_data',
        closable: true,
        setup: tmpParams
      });
    }
    
  
    ControlCode.openUsersTab = function(){
      var tmpTabKey = 'tab-sys-users';
      var tmpTabTitle = 'Users';
      var tmpIcon = 'user';
      var tmpParams = {};
      this.tabs.openTab({
        tabname: tmpTabKey,
        tabtitle: '<i class="icon ' + tmpIcon + ' blue"></i> ' + tmpTabTitle,
        controlname: 'SystemUsers',
        catalog: '_data',
        closable: true,
        setup: tmpParams
      });
    }
    
    
    ControlCode.refreshDash = function(theContent, theOptTpl){
      this.loadDash(tmpThis.dashData,"UserAdminDashHome");
    }
  
    ControlCode.loadDash = function(theContent, theOptTpl){
      this.loadSpot('dashhome', theContent, theOptTpl);
    }
  
    ControlCode._onInit = _onInit;
    function _onInit() {
      var tmpThis = this;
      this.parts.header.setHeader('System Administration')
      //--- temp
      this.dashData = {
        isLoading:true,
        details: [
        ]
      }
  
      this.tabs = this.parts.tabs;
      this.tabs.addTab({
        item: 'main',
        text: "Home",
        icon: 'home',
        content: '<div myspot="dashhome"></div>'
      });
          
          this.refreshDash();
          (function (ActionAppCore, $) {

            var ControlSpecs = {
              options: {
                padding: false,
                required: {
                  templates: {
                      map:
                      {
                          "UserAdminDashHome": {source: "data", name: "UserAdminDashHome"}
                      }
                  }
                }
              },
              content: [{
                "ctl": "layout",
                "name": "lo",
                "north": [{
                  ctl: 'div',
                  name: 'toolbar',
                  hidden: true,
                  content: [{
                    "ctl": "ui",
                    "name": "search-toolbar",
                    "classes": "labeled icon compact pad5",
                    hidden: false,
                    "content": [ {
                      "ctl": "button",
                      "toLeft": true,
                      "color": "blue",
                      "icon": "plus",
                      compact: true,
                      "name": "btn-page-tb-new",
                      "label": "Add Account",
                      "onClick": {
                        "run": "action",
                        "action": "newDoc"
          
                      }
                    }]
                  },
                    {
                      ctl: 'divider',
                      fitted: true,
                      clearing: true
                    }]
                }],
                "center": [{
                  ctl: "control",
                  name: "tabs",
                  catalog: "_designer",
                  controlname: "TabsContainer"
                }]
          
              }]
            }
          
            var ControlCode = {};
          
            ControlCode.setup = setup;
            function setup() {
              //
            }
          
            
            
            
            ControlCode.showSystemACL = showSystemACL;
            function showSystemACL(theParams, theTarget){
                this.openSystemACLTab();
            }
            
            
            ControlCode.openSystemACLTab = function(){
              var tmpTabKey = 'tab-sys-acl';
              var tmpTabTitle = 'System ACL';
              var tmpIcon = 'key';
              var tmpParams = {};
              this.tabs.openTab({
                tabname: tmpTabKey,
                tabtitle: '<i class="icon ' + tmpIcon + ' blue"></i> ' + tmpTabTitle,
                controlname: 'SystemACLEntries',
                catalog: '_data',
                closable: true,
                setup: tmpParams
              });
            }
            

         
            
           
            ControlCode.refreshDash = function(theContent, theOptTpl){
              this.loadDash(tmpThis.dashData,"UserAdminDashHome");
            }
          
            ControlCode.loadDash = function(theContent, theOptTpl){
              this.loadSpot('dashhome', theContent, theOptTpl);
            }
          
            ControlCode._onInit = _onInit;
            function _onInit() {
              var tmpThis = this;
              this.parts.header.setHeader('System Administration')
              //--- temp
              this.dashData = {
                isLoading:true,
                details: [
                ]
              }
          
              this.tabs = this.parts.tabs;
              this.tabs.addTab({
                item: 'main',
                text: "Home",
                icon: 'home',
                content: '<div myspot="dashhome"></div>'
              });
                  
                  this.refreshDash();
          
          
            }
          
            var ThisControl = {
              specs: ControlSpecs, options: {
                proto: ControlCode, parent: ThisApp
              }};
            return ThisControl;
          })(ActionAppCore, $);
  
    }
  
    var ThisControl = {
      specs: ControlSpecs, options: {
        proto: ControlCode, parent: ThisApp
      }};
    return ThisControl;
  })(ActionAppCore, $);
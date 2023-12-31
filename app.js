/**
 * Mongino / Action App Designer
 * 
 *   Author: Joseph Francis, 2017-2023
 *   License: LGPL
 * 
 *  */


var path = require('path'),
    http = require('http'),
    fs = require('fs-extra'),
    deployedScope = {},
    scope = {};

const { WebSocket, WebSocketServer } = require('ws');
const { parse } = require('url');

var https = require('https');
const jwt = require('jsonwebtoken');
const ejs = require('ejs');

require('dotenv').config();

const LocalStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const AmazonStrategy = require('passport-amazon').Strategy;
const SpotifyStrategy = require('passport-spotify').Strategy;

var request        = require('request');


const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_SECRET;

const GOOGLE_CLIENT_ID_DEPLOYED = process.env.GOOGLE_CLIENT_ID_DEPLOYED;
const GOOGLE_CLIENT_SECRET_DEPLOYED = process.env.GOOGLE_SECRET_DEPLOYED;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_SECRET;

const GITHUB_CLIENT_ID_DEPLOYED = process.env.GITHUB_CLIENT_ID_DEPLOYED;
const GITHUB_CLIENT_SECRET_DEPLOYED = process.env.GITHUB_SECRET_DEPLOYED;

const AMAZON_CLIENT_ID = process.env.AMAZON_CLIENT_ID;
const AMAZON_CLIENT_SECRET = process.env.AMAZON_SECRET;

const AMAZON_CLIENT_ID_DEPLOYED = process.env.AMAZON_CLIENT_ID_DEPLOYED;
const AMAZON_CLIENT_SECRET_DEPLOYED = process.env.AMAZON_SECRET_DEPLOYED;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_SECRET;

const SPOTIFY_CLIENT_ID_DEPLOYED = process.env.SPOTIFY_CLIENT_ID_DEPLOYED;
const SPOTIFY_CLIENT_SECRET_DEPLOYED = process.env.SPOTIFY_SECRET_DEPLOYED;

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_SECRET;

const TWITCH_CLIENT_ID_DEPLOYED = process.env.TWITCH_CLIENT_ID_DEPLOYED;
const TWITCH_CLIENT_SECRET_DEPLOYED = process.env.TWITCH_SECRET_DEPLOYED;

var tmpBaseCallback = 'http://localhost:33480/';
if( process.env.PASSPORT_BASE_CALLBACK ){
  tmpBaseCallback = process.env.PASSPORT_BASE_CALLBACK;
}

var tmpDeployedBaseCallback = 'http://localhost:33481/';
if( process.env.PASSPORT_BASE_CALLBACK_DEPLOYED ){
  tmpDeployedBaseCallback = process.env.PASSPORT_BASE_CALLBACK_DEPLOYED;
}


// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
//--- Use this token for admin use APIs --> console.log('accessToken',accessToken);
    var options = {
      url: 'https://api.twitch.tv/helix/users',
      method: 'GET',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Authorization': 'Bearer ' + accessToken
      }
    };
  
    request(options, function (error, response, body) {
      if (response && response.statusCode == 200) {
        done(null, JSON.parse(body));
      } else {
        done(JSON.parse(body));
      }
    });
  }
  

var isUsingData = false;
var startupDataString = '';
var homeAccountConfig = {};

const MONGINO_DB_HOME_ACCOUNT_ADDRESS = process.env.MONGINO_DB_HOME_ACCOUNT_ADDRESS;
if (MONGINO_DB_HOME_ACCOUNT_ADDRESS) {
    const MONGINO_DB_HOME_ACCOUNT_PORT = process.env.MONGINO_DB_HOME_ACCOUNT_PORT;
    const MONGINO_DB_HOME_ACCOUNT_USERNAME = process.env.MONGINO_DB_HOME_ACCOUNT_USERNAME;
    const MONGINO_DB_HOME_ACCOUNT_PASSWORD = process.env.MONGINO_DB_HOME_ACCOUNT_PASSWORD;
    var tmpAcct = '';
    homeAccountConfig.id = "_home";
    homeAccountConfig.address = MONGINO_DB_HOME_ACCOUNT_ADDRESS;
    homeAccountConfig.port = MONGINO_DB_HOME_ACCOUNT_PORT

    if (MONGINO_DB_HOME_ACCOUNT_USERNAME) {
        tmpAcct = MONGINO_DB_HOME_ACCOUNT_USERNAME;
        homeAccountConfig.username = MONGINO_DB_HOME_ACCOUNT_USERNAME;
        if (MONGINO_DB_HOME_ACCOUNT_PASSWORD) {
            tmpAcct += ':' + MONGINO_DB_HOME_ACCOUNT_PASSWORD;
            homeAccountConfig.password = MONGINO_DB_HOME_ACCOUNT_PASSWORD
        }
    }
    startupDataString = 'mongodb://' + tmpAcct + '@' + MONGINO_DB_HOME_ACCOUNT_ADDRESS + ':' + MONGINO_DB_HOME_ACCOUNT_PORT + '/?retryWrites=true&w=majority';
    isUsingData = true;
}



const session = require('express-session');

scope.locals = {
    name: 'mongino-designer',
    title: 'Mongino',
    path: {
        root: path.resolve(__dirname)
    }
};
scope.locals.path.start = scope.locals.path.root + "/designer-server";
scope.locals.path.libraries = scope.locals.path.root + "/server-libs";

var $ = require(scope.locals.path.libraries + '/globalUtilities.js').$;
// $.classes = $.classes || {}
// $.classes.WebSocketServer = WebSocketServer;
// $.classes.WebSocket = WebSocket;
//--- Passport Auth ------------------
var isUsingPassport = (process.env.AUTH_TYPE == 'passport');

//--- POC WS
var isUsingWebsockets = true; //ToDo: Pull from somewhere if used
var wssMain = false;

$.isUsingPassport = isUsingPassport;

//--- POC WS
$.isUsingWebsockets = isUsingWebsockets

$.designerConfig = {};

$.designerConfig.isUsingPassport = isUsingPassport;
$.designerConfig.isUsingData = isUsingData;


$.designerConfig.passport = {};

    if( GOOGLE_CLIENT_ID ){
        $.designerConfig.passport.google = true;
    }
    if( GITHUB_CLIENT_ID ){
        $.designerConfig.passport.github = true;
    }
    if( AMAZON_CLIENT_ID ){
        $.designerConfig.passport.amazon = true;
    }
    if( SPOTIFY_CLIENT_ID ){
        $.designerConfig.passport.spotify = true;
    }
    if( TWITCH_CLIENT_ID ){
        $.designerConfig.passport.twitch = true;
    }

$.setup(scope);

$.scope = scope;
var bld = $.bld;

deployedScope.locals = {
    name: 'mongino-deployed-server',
    title: 'Mongino Deployed Server',
    path: {
        root: path.resolve(__dirname)
    }
}
deployedScope.locals.path.start = scope.locals.path.root + "/preview-server";
deployedScope.locals.path.libraries = scope.locals.path.root + "/server-libs";


const bcrypt = require("bcrypt")
var express = require('express'),
    app = express(),
    deployed = express(),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser');

//--- Use standard body and cookie parsers
app.use(bodyParser.json({ limit: '1000kb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
function mAllowHeaders(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Accept");
    //--- If OPTIONS check, just send back headers
    if ((req.method == 'OPTIONS')) {
        res.send('')
    } else {
        next();
    }
}
app.all('*', mAllowHeaders);


const MongoStore = require('connect-mongo');
var passport = require('passport');
$.passport = passport;
function processAuth(req, res, next) {
    //--- ToDo: Cache user info?
    // if( req.session && req.session.authUser ){
    //     req.authUser = req.session.authUser;
    //     console.log('found existing',req.authUser);
    //     next();
    // }
    if (req.session && req.session.passport && req.session.passport.user) {
        var tmpUser = req.session.passport.user;
        var tmpUserData = tmpUser.data || {};
        if( tmpUserData.length == 1 ){
            tmpUserData = tmpUserData[0];
        }
        var tmpUserKey = tmpUser.id || tmpUserData.id;
        if (tmpUser.provider || tmpUserData.provider) {
            var tmpProvider = tmpUser.provider || tmpUserData.provider;
            tmpUserKey = tmpProvider + "-" + tmpUserKey;
        }
        var tmpDispName = tmpUser.displayName || tmpUserData.displayName || tmpUser.display_name || tmpUserData.display_name
        req.authUser = {
            id: tmpUserKey,
            provider: tmpUser.provider || 'local',
            displayName: tmpDispName
        }
        //--- ToDo: Cache user info?
        //req.session.authUser = req.authUser;
        //console.log('set initial req.authUser',req.authUser);
        next()
    } else {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]

        if (token == null) {
            req.authUser = false;
            next()
        } else {
            jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
                if (err) {
                    req.authUser = false;
                } else {
                    var tmpCurr = {
                        id: user.id,
                        displayName: user.displayName
                    }
                    req.authUser = tmpCurr;
                }
                next()
            })
        }
    }
}



if (isUsingPassport) {
    passport.serializeUser(function (user, cb) {
        cb(null, user);
    });
    passport.deserializeUser(function (obj, cb) {
        cb(null, obj);
    });

}


async function authUser(theUsername, thePassword, done) {
    //console.log('authUser', theUsername, thePassword)
    if (theUsername == process.env.MONGINO_AUTH_ADMIN_USERNAME && thePassword == process.env.MONGINO_AUTH_ADMIN_PASSWORD) {
        var tmpRetDoc = { id: 'system_admin_user', displayName: 'System Admin' };
        return done(null, tmpRetDoc)
    }

    var tmpAccount = await $.MongoManager.getAccount('_home');
    var tmpDB = await tmpAccount.getDatabase($.MongoManager.options.names.directory);
    var tmpDocType = 'user';
    var tmpMongoDB = tmpDB.getMongoDB();
    var tmpDocs = await tmpMongoDB.collection($.MongoManager.options.prefix.datatype + tmpDocType)
        .find({ username: theUsername })
        .filter({ username: theUsername, __doctype: tmpDocType })
        .toArray();

    if (tmpDocs && tmpDocs.length == 1) {
        var tmpUserDoc = tmpDocs[0];
        if (tmpUserDoc.username != theUsername) {
            return done(null, false);
        }
        var tmpIsGood = await bcrypt.compare(thePassword, tmpUserDoc.password);
        if (!(tmpIsGood)) {
            return done(null, false);
        }
        var tmpRetDoc = { id: tmpUserDoc.username, displayName: tmpUserDoc.firstname + ' ' + tmpUserDoc.lastname };
        return done(null, tmpRetDoc)
    } else {
        return done(null, false)
    }
}

function initOAuth(theExpress, theIsDeployed){
    var tmpApp = theExpress;
    var tmpPostFix = '';
    if( theIsDeployed ){
        tmpPostFix = 'app';
    }
                 
    tmpApp.get('/auth/google/callback',
        passport.authenticate('google'+tmpPostFix, { failureRedirect: '/error' }),
        function (req, res) {
            // Successful authentication, redirect success.
            res.redirect('/authcomplete');
        }
    );

    tmpApp.get('/auth/github/callback',
        passport.authenticate('github'+tmpPostFix, { failureRedirect: '/error' }),
        function (req, res) {
        // Successful authentication, redirect success.
        res.redirect('/authcomplete');
        }
    );

    tmpApp.get('/auth/amazon/callback',
    passport.authenticate('amazon'+tmpPostFix, { failureRedirect: '/error' }),
    function (req, res) {
    res.redirect('/authcomplete');
    }
    );

    tmpApp.get('/auth/spotify/callback',
    passport.authenticate('spotify'+tmpPostFix, { failureRedirect: '/error' }),
    function (req, res) {
    res.redirect('/authcomplete');
    }
    );


    tmpApp.get('/auth/twitch/callback',
        passport.authenticate('twitch'+tmpPostFix, { failureRedirect: '/error' }),
        function (req, res) {
        // Successful authentication, redirect success.
        res.redirect('/authcomplete');
        }
    );


}
var _session;
function initAuth(theExpress){
    var tmpApp = theExpress;

     
    if( !(_session)){
        //console.log('new sess')
        _session = session({
            resave: false,
            saveUninitialized: true,
            maxAge: new Date(Date.now() + 3600000),
            store: MongoStore.create({
                mongoUrl: startupDataString,
                mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
                dbName: '-mosys-Directory',
                ttl: 14 * 24 * 60 * 60 // = 14 days. Default
            }),
            secret: process.env.SESSION_SECRET || 'sdflksjflksdjflksdjfieieieiei'
        })
    }

    
    //---ToDo: Use MONGINO_DB_  HOME_ACCOUNT to spin up default connection db for application data
    //         Keep accounts for access to more than one.
    //---ToDo: move to mongo for accounts?
   
    tmpApp.use(_session);

    tmpApp.use(passport.initialize());
    tmpApp.use(passport.session());
    
    tmpApp.use(processAuth)

    
    

}


function initAuthPrompt(theExpress, theIsDeployed){
    var tmpApp = theExpress;
    
    //-- When any directory is loaded (home page or tmpApp)
    tmpApp.all(/\/$/, async function (req, res, next) {
        try {
            var tmpUser = {};
            var tmpUserID = '';
            if( req.authUser && req.authUser.id ){
                tmpUserID = req.authUser.id;
            }
           
            var tmpLoginURL = '/pagelogin?type=page';

            var tmpIsAllowed = false;

            if (req.originalUrl == '/' || !(req.originalUrl) ) {
                if( !(tmpUserID) ){
                    tmpIsAllowed = false;
                    tmpLoginURL += '&page=/';
                } else {
                    tmpIsAllowed = await $.AuthMgr.isAllowed(tmpUserID, { system: 'design' }, 0);
                }
            } else {
                var tmpDBName = req.originalUrl.replace(/\//g, '');
                var tmpParams = '';
                var tmpDBParts = tmpDBName.split('?');
                if( tmpDBParts.length == 2){
                    tmpDBName = tmpDBParts[0];
                    tmpParams = tmpDBParts[1];
                }
                tmpLoginURL += '&page=/' + tmpDBName + '/';
                if( tmpParams ){
                    tmpLoginURL += '?'+tmpParams;
                }


                tmpDBName = $.MongoManager.options.prefix.db + tmpDBName;
                tmpIsAllowed = await $.AuthMgr.isAllowed(tmpUserID, { db: tmpDBName }, 0);
            }

            if (!tmpIsAllowed) {
                res.redirect(tmpLoginURL);
            }

        } catch (error) {
            console.error("Error in oath check", error);
            //--- ToDo: Catch and show error message details to user and/or console?
            res.redirect(tmpLoginURL);
        }

        next();
    });

}


function initAuth2(theExpress, theIsDeployed){
    var tmpApp = theExpress;
    var tmpPostFix = '';
    if( theIsDeployed ){
        tmpPostFix = 'app';
    }

    
    
    tmpApp.post('/logout', function (req, res, next) {
        req.logout(function (err) {
            if (err) { return next(err); }
            res.redirect('/');
        });
    });

     
    tmpApp.get('/appinit.js', function (req, res, next) {
        //console.log(req.session);

        var tmpHTML = [];
        var tmpProvider = 'local';
        if( req.session && req.session.passport && req.session.passport.user && req.session.passport.user.provider){
            tmpProvider = req.session.passport.user.provider;
        }
        tmpHTML.push('(function (ActionAppCore, $) {');
        tmpHTML.push('    ActionAppCore.mongino = ActionAppCore.mongino || {};');
        tmpHTML.push('    ActionAppCore.mongino.user = ActionAppCore.mongino.user || {};');
        tmpHTML.push('    ActionAppCore.mongino.user.displayName="' + req.authUser.displayName + '";');
        tmpHTML.push('    ActionAppCore.mongino.user.id="' + req.authUser.id + '";');
        tmpHTML.push('    ActionAppCore.mongino.user.provider="' + tmpProvider + '";');
        tmpHTML.push('})(ActionAppCore, $);');
        res.send(tmpHTML.join(''));

    });


        
    tmpApp.get('/pagelogin', function (req, res, next) {

        // Render page using renderFile method
        ejs.renderFile('views/pagelogin.ejs', {designerConfig:$.designerConfig},
            {}, function (err, template) {
                if (err) {
                    throw err;
                } else {
                    res.end(template);
                }
            });
    });

    

    tmpApp.get('/codeback', async function (req, res, next) {
        ejs.renderFile('views/codeback.ejs', {},
            {}, function (err, template) {
                if (err) {
                    throw err;
                } else {
                    res.end(template);
                }
            });
    });

    tmpApp.get('/authcomplete', async function (req, res, next) {
        if( req.authUser && req.authUser.id ){
            if( req.authUser.provider && req.authUser.provider != 'local'){
                await $.AuthMgr.extUserLogin(req.authUser);
            }
        }
        ejs.renderFile('views/authcomplete.ejs', {},
            {}, function (err, template) {
                if (err) {
                    throw err;
                } else {
                    res.end(template);
                }
            });
    });

    if( $.designerConfig.passport.google ){
        tmpApp.get('/auth/google',
        passport.authenticate('google'+tmpPostFix, { scope: ['profile', 'email'] }));
    }
 /*  Example of admin level scopees
    ,
            "channel:moderate",
            "chat:edit",
            "chat:read"
    */
    if( $.designerConfig.passport.twitch ){
        tmpApp.get('/auth/twitch',
        passport.authenticate('twitch'+tmpPostFix, { scope: [
            'user_read'
        ] }));
    }

    if( $.designerConfig.passport.github ){
        tmpApp.get('/auth/github',
        passport.authenticate('github'+tmpPostFix, { scope: ['profile', 'email'] }));
    }

    //, 'amazon_music:access'
    if( $.designerConfig.passport.amazon ){
        tmpApp.get('/auth/amazon',
        passport.authenticate('amazon'+tmpPostFix, { scope: ['profile'] }));
    }

    if( $.designerConfig.passport.spotify ){
        tmpApp.get('/auth/spotify',
        passport.authenticate('spotify'+tmpPostFix, { scope: ['user-read-private','user-read-email','user-read-playback-state', 'user-modify-playback-state','user-read-currently-playing', 'app-remote-control', 'streaming'] }));
    }

    tmpApp.post("/login", passport.authenticate('local', {
        successRedirect: "/authcomplete",
        failureRedirect: "/pagelogin?type=page&page=/",
    }))

    
    /* JWT login. */
    tmpApp.post('/login/jwt', function (req, res, next) {

        passport.authenticate('local', { scope: ['profile', 'email'], session: false }, (err, user, info) => {
            if (err || !user) {
                return res.status(400).json({
                    message: info ? info.message : 'Login failed',
                    user: user
                });
            }

            req.login(user, { session: false }, (err) => {
                if (err) {
                    res.send(err);
                }

                const token = jwt.sign(user, process.env.JWT_SECRET);

                return res.json({ user, token });
            });
        })
            (req, res);

    });
    
    
    //-- stop pages from loading with index.html -vs- main entry point
    tmpApp.all(/index.html/, function (req, res, next) {

        try {
            var tmpCheckPos = req.url.toLowerCase().indexOf('index.html');
            if (tmpCheckPos > -1) {
                var tmpURL = req.url.substring(0, tmpCheckPos);
                res.redirect(tmpURL);
            }
        } catch (error) {
            //--- OK?
            console.log('Error attempting to check for index', error);
        }

        next();
    });

    
    


}


//=== Must have Mongo data enabled to use any security
if( $.designerConfig.isUsingData ){
    passport.use(new LocalStrategy(authUser))
    initAuth(app);
    initAuthPrompt(app);
    initAuth2(app);
    initAuth(deployed);
    initAuthPrompt(deployed);
    //initAuth2(deployed, true);
}


app.get('/designer/details.js', async function (req, res, next) {
    var tmpRet = {
        sitetype: "Local"
    };
    var tmpConfigPath = $.scope.locals.path.ws.root + '/config/';
    await $.fs.ensureDir(tmpConfigPath);
    var tmpSettings = await $.bld.getJsonFile(tmpConfigPath + '/designer-settings.json');

    if (tmpSettings) {
        tmpRet = tmpSettings;
    }

    tmpRet.config = $.designerConfig;


    var tmpRet = 'ActionAppCore.designerDetails = ' + JSON.stringify(tmpRet);
    return res.send(tmpRet);
});


function setup() {

    return new Promise(async function (resolve, reject) {
        try {
            var tmpSettingsDir = bld.settingsHome();
            var tmpWSDirectory = '';
            //--- See if setup, if not, do the setup screen
            if (tmpSettingsDir) {
                await fs.ensureDir(tmpSettingsDir);

                var tmpSetup = await bld.getJsonFile(tmpSettingsDir + '/setup.json');


                if (tmpSetup && tmpSetup.rootDir) {
                    tmpWSDirectory = tmpSetup.rootDir
                } else {
                    //--- Build Initial Confiruration and Directories
                    var tmpRootDir = ($.os.homedir() + '/mongino/');
                    tmpRootDir = tmpRootDir.replace('[home]', $.os.homedir());

                    if (!(tmpRootDir.endsWith('/'))) {
                        tmpRootDir += '/';
                    }
                    var tmpSetupDetails = {
                        rootDir: tmpRootDir
                    }

                    tmpWSDirectory = tmpRootDir;

                    const tmpSettingsDir = bld.settingsHome();
                    await $.fs.ensureDir(tmpSettingsDir);
                    await bld.saveJsonFile(tmpSettingsDir + 'setup.json', tmpSetupDetails);

                    await $.fs.ensureDir(tmpSetupDetails.rootDir);
                    await $.fs.ensureDir(tmpSetupDetails.rootDir + 'ui-apps/');
                    await $.fs.ensureDir(tmpSetupDetails.rootDir + 'deploy/');
                }
            }



            scope.locals.path.ws = {
                root: tmpWSDirectory,
                deployExt: tmpWSDirectory + "deployExt/",
                deploy: tmpWSDirectory + "deploy/",
                uiApps: tmpWSDirectory + "ui-apps/",
                uiAppServers: tmpWSDirectory + "ui-servers/",
                catalogs: tmpWSDirectory + "catalogs/",
                catalog: tmpWSDirectory + "catalog/",
                pages: tmpWSDirectory + "catalog/pages/",
                serverApps: tmpWSDirectory + "designer-servers/"
            }

            deployedScope.locals.path.ws = {
                uiAppServers: scope.locals.path.ws.deploy + "/ui-servers/",
            }
            
            await $.fs.ensureDir(scope.locals.path.ws.uiAppServers)

            if (homeAccountConfig) {
                require(scope.locals.path.libraries + '/lib_Mongo.js');
                $.MongoManager.setAccountConfig('_home', homeAccountConfig);
            }

            await $.appIndexRefresh();

            function processWSS(request, socket, head) {
                try {
                    var tmpScope = this;
                    var url = parse(request.url);
                    var pathname = url.pathname;
                    
                    if (pathname === '/main' && wssMain) {
                        wssMain.handleUpgrade(request, socket, head, function done(ws) {
                            wssMain.emit('connection', ws, request);
                        });
                    } else {
                        //var params = new URLSearchParams(url.query);
                        var tmpParts = pathname.split('/');
                        if( !(tmpParts.length != 4 && tmpParts[0] == '') ){
                            console.error('unexpected url',pathname,tmpParts.length,tmpParts)
                            socket.destroy();
                            return;
                        }

                        if( tmpParts[0] == ''){
                            tmpParts.shift();
                        }
                        var tmpURLBase = tmpParts.join('/');
                        
                        var tmpAppID = tmpParts[1];
                        if( tmpAppID ){
                            var tmpFilePath = tmpScope.locals.path.appserver + tmpURLBase + '.js';
                            var tmpAppWSReq = require(tmpFilePath);
                            if (typeof(tmpAppWSReq.setup) == 'function') {
                                var tmpWSS = tmpAppWSReq.setup(tmpScope, {websocket:true});
                                if( tmpWSS && tmpWSS.handleUpgrade ){
                                    try {
                                        tmpWSS.handleUpgrade(request, socket, head, function done(ws) {
                                            tmpWSS.emit('connection', ws, request);
                                        });
                                    } catch (error) {
                                        console.error('Server Error in socket processing',error)
                                        socket.destroy();
                                    }
                                } else {
                                    console.error('no winsock process available')
                                    socket.destroy();
                                }
                            }
                        } else {
                            //--- no valid winsock implementtion
                            console.error('no appid / winsock available')
                            socket.destroy();
                        }
                        
                        


                        
                    }
                
                } catch (error) {
                    console.log('error',error);
                    socket.destroy();
                }
            }


            const chokidar = require('chokidar');

            try {
                //--- ToDo: Make this optional.
                var tmpWatchDir = scope.locals.path.root + "/designer-server"
                //--> Watch All (CLOSE BEFORE COMMIT!)-->      var tmpWatchDir = scope.locals.path.root;

                chokidar.watch(tmpWatchDir, { ignored: /index\.js$/ })
                    .on('change', (path) => {
                        try {
                            if (require.cache[path]){
                                delete require.cache[path];
                                console.log('New file loaded for ' + path);
                            }
                            
                        } catch (theChangeError) {
                            console.log("Could not hot update: " + path);
                            console.log("The reason: " + theChangeError);
                        }
                    });
            } catch (ex) {

                console.log('Error, chokidar',ex)
            }

            

            try {
                //--- Deployed backend updates hot swappable
                var tmpAppServerFilesLoc = scope.locals.path.ws.deploy + "/ui-servers/"
                chokidar.watch(tmpAppServerFilesLoc, { ignored: /index\.js$/ })
                    .on('change', (path) => {
                    try {
                        if( !(path.indexOf(".git") > -1)){
                            if (require.cache[path]){
                                delete require.cache[path];
                                console.log('New file loaded for ' + path);
                            }     
                        }
                            
                        } catch (theChangeError) {
                            console.log("Could not hot update: " + path);
                            console.log("The reason: " + theChangeError);
                        }
                    });
            } catch (ex) {
                console.log('error in watch setup for apps',ex)
            }

            try {
                //--- Application backend updates hot swappable
                var tmpAppServerFilesLoc = scope.locals.path.ws.uiAppServers
                chokidar.watch(tmpAppServerFilesLoc, { ignored: /index\.js$/ })
                    .on('change', (path) => {
                        try {
                            if( !(path.indexOf(".git") > -1)){
                                if (require.cache[path]){
                                    delete require.cache[path];
                                    console.log('New file loaded for ' + path);
                                }
                            } 
                        } catch (theChangeError) {
                            console.log("Could not hot update: " + path);
                            console.log("The reason: " + theChangeError);
                        }
                    });
            } catch (ex) {
                console.log('error in watch setup for apps',ex)
            }





            app.use(express.static(scope.locals.path.root + '/ui-libs'));
            app.use(express.static(scope.locals.path.root + '/common'));
            app.use(express.static(tmpWSDirectory));
            app.use(express.static(scope.locals.path.root + '/ui-app'));

            //--- Server Apps from same port ?
            app.use(express.static(tmpWSDirectory + '/ui-apps'));
            //--- Deployed Apps from same port using /ui-app ?
            //app.use(express.static(scope.locals.path.ws.deploy));

            //--- Plug in application routes
            require('./designer-server/start').setup(app, scope);

            // error handlers
            app.use(function (req, res, next) {
                var err = new Error('Not Found');
                err.status = 404;
                next(err);
            });
            app.use(function (err, req, res, next) {
                res.status(err.status || 500);
                next();
            });

            if( $.designerConfig.passport.google ){
                passport.use('google', new GoogleStrategy({
                    clientID: GOOGLE_CLIENT_ID,
                    clientSecret: GOOGLE_CLIENT_SECRET,
                    callbackURL: tmpBaseCallback + "auth/google/callback"
                    },
                    function (accessToken, refreshToken, profile, done) {
                    return done(null, profile);
                    }
                ));
    
                passport.use('googleapp', new GoogleStrategy({
                    clientID: GOOGLE_CLIENT_ID_DEPLOYED,
                    clientSecret: GOOGLE_CLIENT_SECRET_DEPLOYED || GOOGLE_CLIENT_SECRET,
                    callbackURL: tmpDeployedBaseCallback + "auth/google/callback"
                    },
                    function (accessToken, refreshToken, profile, done) {
                    return done(null, profile);
                    }
                ));
            }
            
            if( $.designerConfig.passport.github ){
                passport.use('github', new GitHubStrategy({
                    clientID: GITHUB_CLIENT_ID,
                    clientSecret: GITHUB_CLIENT_SECRET,
                    callbackURL: tmpBaseCallback + "auth/github/callback"
                    },
                    function (accessToken, refreshToken, profile, done) {
                    return done(null, profile);
                    }
                ));

                passport.use('githubapp', new GitHubStrategy({
                    clientID: GITHUB_CLIENT_ID_DEPLOYED,
                    clientSecret: GITHUB_CLIENT_SECRET_DEPLOYED || GITHUB_CLIENT_SECRET,
                    callbackURL: tmpDeployedBaseCallback + "auth/github/callback"
                    },
                    function (accessToken, refreshToken, profile, done) {
                    return done(null, profile);
                    }
                ));

            }

            if( $.designerConfig.passport.spotify ){
                passport.use('spotify', new SpotifyStrategy({
                    clientID: SPOTIFY_CLIENT_ID,
                    clientSecret: SPOTIFY_CLIENT_SECRET,
                    callbackURL: tmpBaseCallback + "auth/spotify/callback"
                    },
                    function (accessToken, refreshToken, profile, done) {
                    return done(null, profile);
                    }
                ));
                passport.use('spotifyapp', new SpotifyStrategy({
                    clientID: SPOTIFY_CLIENT_ID_DEPLOYED,
                    clientSecret: SPOTIFY_CLIENT_SECRET_DEPLOYED,
                    callbackURL: tmpBaseCallback + "auth/spotify/callback"
                    },
                    function (accessToken, refreshToken, profile, done) {
                    return done(null, profile);
                    }
                ));

            }
            

            if( $.designerConfig.passport.amazon ){
                passport.use('amazon', new AmazonStrategy({
                    clientID: AMAZON_CLIENT_ID,
                    clientSecret: AMAZON_CLIENT_SECRET,
                    callbackURL: tmpBaseCallback + "auth/amazon/callback"
                    },
                    function (accessToken, refreshToken, profile, done) {
                    return done(null, profile);
                    }
                ));
                passport.use('amazonapp', new AmazonStrategy({
                    clientID: AMAZON_CLIENT_ID_DEPLOYED,
                    clientSecret: AMAZON_CLIENT_SECRET_DEPLOYED,
                    callbackURL: tmpBaseCallback + "auth/amazon/callback"
                    },
                    function (accessToken, refreshToken, profile, done) {
                    return done(null, profile);
                    }
                ));
            }
            


            if( $.designerConfig.passport.twitch ){
                passport.use('twitch', new OAuth2Strategy({
                    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
                    tokenURL: 'https://id.twitch.tv/oauth2/token',
                    clientID: TWITCH_CLIENT_ID,
                    clientSecret: TWITCH_CLIENT_SECRET,
                    callbackURL: tmpBaseCallback + "auth/twitch/callback",
                    state: true
                },
                function(accessToken, refreshToken, profile, done) {
                    profile.provider = "twitch";
                    profile.displayName = profile.data.display_name;
                    return done(null, profile);
                }
                ));

                passport.use('twitchapp', new OAuth2Strategy({
                    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
                    tokenURL: 'https://id.twitch.tv/oauth2/token',
                    clientID: TWITCH_CLIENT_ID_DEPLOYED,
                    clientSecret: TWITCH_CLIENT_SECRET_DEPLOYED,
                    callbackURL: tmpDeployedBaseCallback + "auth/twitch/callback",
                    state: true
                },
                function(accessToken, refreshToken, profile, done) {
                    profile.provider = "twitch";
                    profile.displayName = profile.data.display_name;
                    return done(null, profile);
                }
                ));
            }
           
            initOAuth(app);
            initOAuth(deployed,true);
            //--- Standard Server Startup
            var port = 33480;

            //--- ToDo: Allow dynamic location of SSL keys
            var tmpUseSSL = false;

            if (fs.existsSync(tmpWSDirectory + '/ssl/server.key')) {
                tmpUseSSL = true;
            }

            var server;
            if (tmpUseSSL) {
                var privateKey = fs.readFileSync(tmpWSDirectory + '/ssl/server.key');
                var certificate = fs.readFileSync(tmpWSDirectory + '/ssl/server.crt');
                var server_config = {
                    key: privateKey,
                    cert: certificate
                };
                var server = https.createServer(server_config, app);
            } else {
                var server = http.createServer(app);
            }

            if( isUsingWebsockets ){
                wssMain = new WebSocketServer({ noServer: true });
                wssMain.on('connection', function connection(ws) {
                    ws.on('error', console.error);
                    ws.on('message', function message(data) {
                        console.log('Mongino main ws received: %s', data);
                    });
                    ws.send('Mongino main ws says hello');
                });

               
            }

            server.on('upgrade', processWSS.bind(scope));  

            server.listen(port, '0.0.0.0');
            

            //--- Show port in console
            server.on('listening', onListening(server));
            function onListening(server) {
                return function () {
                    var address = server.address();
                    var bind = (typeof address === 'string') ? 'pipe ' + address : address.address + ':' + address.port;
                    console.log(('Open designer on port:' + address.port + "."));
                    console.log(('Launch it here'));
                    if (tmpUseSSL) {
                        console.log("https://localhost:" + address.port);
                    } else {
                        console.log("http://localhost:" + address.port);
                    }
                    console.log("");

                };
            }






            //==========   DEPLOYED DEPLOYMENT ====
            //--- Allow the designer server to access deployed app files directly from designer
            deployed.use(function (req, res, next) {
                //--- ToDo: Do we need remote access TO deployed server?
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                next();
            });



            //--- Use standard body and cookie parsers
            deployed.use(bodyParser.json({ limit: '1000kb' }));
            deployed.use(bodyParser.urlencoded({ extended: false }));
            deployed.use(cookieParser());

            deployed.use(express.static(scope.locals.path.root + '/ui-libs'));
            deployed.use(express.static(scope.locals.path.root + '/common'));
            deployed.use(express.static(scope.locals.path.ws.deploy + '/ui-apps'));

            


            //--- Plug in application routes
            require('./preview-server/start').setup(deployed, deployedScope);
      
            
            initAuth2(deployed, true);

            
            // error handlers
            deployed.use(function (req, res, next) {
                var err = new Error('Not Found');
                err.status = 404;
                next(err);
            });
            deployed.use(function (err, req, res, next) {
                res.status(err.status || 500);
                next();
            });


            //--- Standard Server Startup
            if (tmpUseSSL) {
                var serverDeployed = https.createServer(server_config, deployed);
            } else {
                var serverDeployed = http.createServer(deployed);
            }

            var portDeployed = process.env.DEPLOYEDPORT || 33481;
            serverDeployed.listen(portDeployed, '0.0.0.0');

            serverDeployed.on('upgrade', processWSS.bind(deployedScope));  
            //--- Show port in console
            serverDeployed.on('listening', onListeningDeployed(serverDeployed));
            function onListeningDeployed(serverDeployed) {
                return function () {
                    var address = serverDeployed.address();
                    console.log(('Deployed sites on port:' + address.port + "."));
                };
            }


        }
        catch (error) {
            console.error("Error " + error, error)
            resolve("")
        }

    });
}


//--- Run setup with async wrapper to allow async stuff
setup(isUsingPassport);


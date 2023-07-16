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

var https = require('https');
const jwt = require('jsonwebtoken');
const ejs = require('ejs');

require('dotenv').config();

const LocalStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_SECRET;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_SECRET;

var tmpBaseCallback = 'http://localhost:33480/';
if( process.env.PASSPORT_BASE_CALLBACK ){
  tmpBaseCallback = process.env.PASSPORT_BASE_CALLBACK;
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


var sessionStore;

const bcrypt = require("bcrypt")
var express = require('express'),
    app = express(),
    deployed = express(),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser');

//--- Use standard body and cookie parsers
app.use(bodyParser.json());
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

//--- Passport Auth ------------------
var isUsingPassport = (process.env.AUTH_TYPE == 'passport');
$.isUsingPassport = isUsingPassport;

const MongoStore = require('connect-mongo');
var passport = require('passport');
$.passport = passport;


function processAuth(req, res, next) {
    //console.log('processAuth',req.session)
    if (req.session && req.session.passport && req.session.passport.user) {
        var tmpUser = req.session.passport.user;
        var tmpUserKey = tmpUser.id;
        if (tmpUser.provider) {
            tmpUserKey = tmpUser.provider + "-" + tmpUserKey;
        }
        req.authUser = {
            id: tmpUserKey,
            displayName: tmpUser.displayName
        }
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

function initOAuth(theExpress){
    var tmpApp = theExpress;
                 
    tmpApp.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/error' }),
        function (req, res) {
            // Successful authentication, redirect success.
            res.redirect('/authcomplete');
        }
    );

    tmpApp.get('/auth/github/callback',
        passport.authenticate('github', { failureRedirect: '/error' }),
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

function initAuth2(theExpress){
    var tmpApp = theExpress;
   

    
    //-- When any directory is loaded (home page or tmpApp)
    tmpApp.all(/\/$/, async function (req, res, next) {
        try {

            var tmpUser = {};
            var tmpUserID = '';
            if (req.session && req.session.passport && req.session.passport.user) {
                var tmpUserInfo = req.session.passport.user;
                var tmpSource = tmpUserInfo.provider;
                tmpUserID = tmpUserInfo.id;
                tmpUser.userid = tmpUserInfo.id;
                if (tmpSource) {
                    tmpUser.userid = tmpSource + '-' + tmpUser.userid;
                }
                tmpUser.displayName = tmpUserInfo.displayName || '';
            }
            var tmpLoginURL = '/pagelogin?type=page';
            //tmpLoginURL += '&page=' + req.originalUrl;
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
                tmpDBName = $.MongoManager.options.prefix.db + tmpDBName;
                tmpLoginURL += '&page=/' + tmpDBName + '/';;
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

    
    
    tmpApp.post('/logout', function (req, res, next) {
        req.logout(function (err) {
            if (err) { return next(err); }
            res.redirect('/');
        });
    });


        
    tmpApp.get('/pagelogin', function (req, res, next) {

        // Render page using renderFile method
        ejs.renderFile('views/pagelogin.ejs', {},
            {}, function (err, template) {
                if (err) {
                    throw err;
                } else {
                    res.end(template);
                }
            });
    });

    tmpApp.get('/authcomplete', function (req, res, next) {
        ejs.renderFile('views/authcomplete.ejs', {},
            {}, function (err, template) {
                if (err) {
                    throw err;
                } else {
                    res.end(template);
                }
            });
    });


    tmpApp.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

    tmpApp.get('/auth/github',
    passport.authenticate('github', { scope: ['profile', 'email'] }));

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
passport.use(new LocalStrategy(authUser))

initAuth(app);
initAuth2(app);
initAuth(deployed);

$.designerConfig = {};

$.designerConfig.isUsingPassport = isUsingPassport;
$.designerConfig.isUsingData = isUsingData;

if (isUsingPassport) {
    $.designerConfig.passport = {};

    if( GOOGLE_CLIENT_ID ){
        $.designerConfig.passport.google = true;
    }
    if( GITHUB_CLIENT_ID ){
        $.designerConfig.passport.github = true;
    }
    
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

try {
    //--- ToDo: Make this optional.
    const chokidar = require('chokidar');
    var tmpWatchDir = scope.locals.path.root + "/designer-server"
    //--> Watch All (CLOSE BEFORE COMMIT!)-->      var tmpWatchDir = scope.locals.path.root;

    chokidar.watch(tmpWatchDir, { ignored: /index\.js$/ })
        .on('change', (path) => {
            try {
                if (require.cache[path]) delete require.cache[path];
                console.log('New file loaded for ' + path);
            } catch (theChangeError) {
                console.log("Could not hot update: " + path);
                console.log("The reason: " + theChangeError);
            }
        });
} catch (ex) {
    console.log('Not hot reading, chokidar not installed on dev side')
}



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
                deploy: tmpWSDirectory + "deploy/",
                uiApps: tmpWSDirectory + "ui-apps/",
                uiAppServers: tmpWSDirectory + "ui-servers/",
                catalogs: tmpWSDirectory + "catalogs/",
                catalog: tmpWSDirectory + "catalog/",
                pages: tmpWSDirectory + "catalog/pages/",
                serverApps: tmpWSDirectory + "designer-servers/"
            }

            await $.fs.ensureDir(scope.locals.path.ws.uiAppServers)

            if (homeAccountConfig) {
                require(scope.locals.path.libraries + '/lib_Mongo.js');
                $.MongoManager.setAccountConfig('_home', homeAccountConfig);
            }

            await $.appIndexRefresh();

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

            passport.use(new GoogleStrategy({
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: tmpBaseCallback + "auth/google/callback"
                },
                function (accessToken, refreshToken, profile, done) {
                return done(null, profile);
                }
            ));
                
            passport.use(new GitHubStrategy({
                clientID: GITHUB_CLIENT_ID,
                clientSecret: GITHUB_CLIENT_SECRET,
                callbackURL: tmpBaseCallback + "auth/github/callback"
                },
                function (accessToken, refreshToken, profile, done) {
                return done(null, profile);
                }
            ));

            initOAuth(app);
            initOAuth(deployed);
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
            deployed.use(bodyParser.json());
            deployed.use(bodyParser.urlencoded({ extended: false }));
            deployed.use(cookieParser());

            deployed.use(express.static(scope.locals.path.root + '/ui-libs'));
            deployed.use(express.static(scope.locals.path.root + '/common'));
            deployed.use(express.static(scope.locals.path.ws.deploy + '/ui-apps'));

            


            //--- Plug in application routes
            require('./preview-server/start').setup(deployed, deployedScope);
      
            
            initAuth2(deployed);

            
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


var user_store_json = require('musterroll-userstore-json');
var musterroll_ldap = require('musterroll-ldap');
var musterroll_api = require('musterroll-api');
var http = require('http');
var request = require('request');
var argv = require('minimist')(process.argv.slice(2));
var ejs  = require('ejs');
var fs = require('fs');

var userStoragePath = argv["user-storage-path"] || "/opt/cloudfleet/data";

var userStore = user_store_json.createUserStore({config_file_location: userStoragePath});

var domain = argv["domain"] || "example.com";

var testing_mode = argv["testing"] == "true";

var skip_message_bus = testing_mode;

if(testing_mode){
  console.log("Starting in TESTING mode");
}
console.log("Starting LDAP server with base domain " + domain);

var ldapServer = musterroll_ldap.createServer(
    {
        userStore: userStore,
        rootDN: domain.split(".").map(function(part){return "dc=" + part;}).join(", "),
        domain: domain
    }
);


try{
    ldapServer.listen(389, function() {
        console.log('LDAP server listening at ' + ldapServer.url);
    });
}
catch(error)
{
    console.log(error);
}

var webServer = musterroll_api.createServer({
    userStore: userStore,
    user_store_initializer: function(username, password, userStore, callback, error_callback){

        var success = function() {
            var user = {
                "id":username,
                "isAdmin":true
            };
            userStore.updateUser(user);
            userStore.setPassword(user["id"], password);
            callback(user);
        };
        var failure = error_callback;
        var options = {
          url: 'https://spire.cloudfleet.io/api/v1/blimp/' + domain +'/auth/',
          cert: fs.readFileSync('/opt/cloudfleet/tls/tls_crt.pem'),
          key: fs.readFileSync('/opt/cloudfleet/tls/tls_key.pem'),
          headers: {
            'X-AUTH-USERNAME': username,
            'X-AUTH-PASSWORD': password,
          }
        };
        request.get(
            options,
            function(err, resp, body) {
                console.log("Authentication Response: " + body);
                if(!err && resp.statusCode === 200)
                {
                    if(!skip_message_bus)
                    {
                      request.post(
                          "http://conduit:5000/bus/users",
                          {
                              json: {
                                  "username": username,
                                  "domain": domain,
                                  "password": password, // FIXME remove when encryption and auth handling solved with mailpile
                                  "action": "create"
                              }
                          }

                      );
                    }
                    success();
                }
                else
                {
                    console.log(JSON.stringify("Authentication error: " + err));
                    failure();
                }
            }
        );


    }
});

webServer.get('/webfinger/:type?resource=:uri', function(req, res){

    var type = req.params.type;
    var uri = req.params.uri;

    console.log("TYPE: " + type);
    console.log("URI: " + uri);

    var user   = this.params.resource.replace(/^acct:/, '').split('@')[0],
        origin = this.getOrigin();

    var response = {
        'links': [ {
            'rel':      'remoteStorage',
            'api':      'simple',
            'auth':     'https://' + domain + '/musterroll/oauth/' + user,
            'template': 'https://' + domain + '/storage/' + user + '/{category}'
        } ]
    };

    var body = "";

    if(type === 'jrd') {
        body = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
    }
    else
    {
        body = ejs.render(fs.readFileSync(__dirname + '/templates/account.xml').toString(), {locals: response});
    }

    res.setHeader('Content-Length', body.length);
    res.end(body);

});


webServer.listen(80, function(){
    "use strict";
    console.log('API server listening on port 80');
});

var user_store_json = require('musterroll-userstore-json');
var musterroll_ldap = require('musterroll-ldap');
var musterroll_api = require('musterroll-api');
var fs = require('fs');
var express = require('express');
var http = require('http');
var request = require('request');
var argv = require('minimist')(process.argv.slice(2));

var userStoragePath = argv["user-storage-path"] || "/opt/cloudfleet/data";

var userStore = user_store_json.createUserStore({config_file_location: userStoragePath});

var domain = argv["domain"] || "example.com";
var ldapServer = musterroll_ldap.createServer(
    {
        userStore: userStore,
        rootDN: domain.split(".").map(function(part){return "dc=" + part;}).join(", ")
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

        request.post(
            argv["auth-url"] || "https://spire.cloudfleet.io/auth/",
            {
                form: {
                    username: username,
                    password: password,
                    secret: argv["secret"]
                }
            },
            function(err, resp, body) {
                console.log("Authentication Response: " + body);
                if(!err && JSON.parse(body).authenticated)
                {
                    request.post(
                        "http://blimp-docker:5000/bus/users",
                        {
                            json: {
                                "username": username,
                                "password": password, // FIXME remove when encryption and auth handling solved with mailpile
                                "action": "create"
                            }
                        }
                        
                    );
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
webServer.listen(80, function(){
    "use strict";
    console.log('API server listening on port 80');
});



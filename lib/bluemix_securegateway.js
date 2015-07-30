//
//  Copyright (c) IBM Corporation 2015
//  
//  Permission is hereby granted, free of charge, to any person
//  obtaining a copy of this software and associated documentation
//  files (the "Software"), to deal in the Software without
//  restriction, including without limitation the rights to use,
//  copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the
//  Software is furnished to do so, subject to the following
//  conditions:
// 
//  The above copyright notice and this permission notice shall be
//  included in all copies or substantial portions of the Software.
// 
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
//  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
//  WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
//  OTHER DEALINGS IN THE SOFTWARE.
// 
var request   = require ('request').defaults ({
        strictSSL: false,
        rejectUnauthorized: false
    }),
    fs = require('fs');

var apiVersion = "/v1";

var appInfo = process.env.VCAP_APPLICATION || {};
var serviceInfo = process.env.VCAP_SERVICES || {};

var _defaults = function(defaults){
    var obj = {};
    if(defaults.apiKey) {
        obj.apiKey = defaults.apiKey;
    }
    if(defaults.orgID) {
        obj.orgID = defaults.orgID;
    }
    if(defaults.spaceID) {
        obj.spaceID = defaults.spaceID;
    }
    if(defaults.username) {
        obj.username = defaults.username;
    }
    if(defaults.password) {
        obj.password = defaults.password;
    }
    if(defaults.token) {
        obj.token = defaults.token;
    }
    if(defaults.basepath) {
        obj.basepath = defaults.basepath;
    }
    obj.getGateway    = _getGateway.bind(obj);
    obj.listGateways  = _listGateways.bind(obj);
    obj.createGateway = _createGateway.bind(obj);

    return obj;
}

var _getBasePath = function (self) {
    var _basepath;
    if (!self.basepath) {
        if (serviceInfo.url) {
            _basepath = serviceInfo.url;
        } else {        
            _basepath = "https://sgmanager.ng.bluemix.net";
        }
    } else {
        _basepath = self.basepath;
    }
    return _basepath;
};

var _getOrgID = function (self, callback) {
    var _orgID;
    if(!self.orgID){
        if(serviceInfo.orgID){
            _orgID = serviceInfo.credentials.orgID;
        } else{
            callback("Org ID must be set in defaults or in VCAP_SERVICES", null);
            return;
        }
    } else{
        _orgID = self.orgID;
    }
    return _orgID;
}

var _getSpaceID = function (self, callback) {
    var _spaceID;
    if(!self.spaceID){
        if(serviceInfo.spaceID){
            _spaceID = serviceInfo.credentials.spaceID;
        } else{
            callback("Space ID must be set in defaults or in VCAP_SERVICES", null);
            return;
        }
    } else{
        _spaceID = self.spaceID;
    }
    return _spaceID;
}

var _getAuthHeader = function (self, callback) {
    var _authHeader;
    if(self.username && self.password){
        var userpw = self.username + ":" + self.password;
        var userpw64 = new Buffer(userpw).toString('base64');
        _authHeader = "Basic " + userpw64;
    } else if(self.token){
        _authHeader = "Bearer " + self.token;
    } else{
        callback("Missing authentication properties. Username and password or a Bluemix Auth Token must be set.");
        return;
    }
    return _authHeader;
}

var _createGateway = function(description, callback){

    var _orgID = _getOrgID (this, callback),
        _spaceID = _getSpaceID (this, callback),
        _basepath = _getBasePath (this, callback),
        authHeader = _getAuthHeader (this, callback),
        path = '/sgconfig?org_id=' + _orgID + "&space_id=" + _spaceID,
        self = this;
      
    var options = {
        method: 'POST',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : authHeader},
        qs: {},
        json: true,
        body: {
            "desc" : description}
    };

    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            var config = new configObject (body, self);
            callback(null, config);
        }
    });
}

var _getGateway = function(configUUID, callback){

    if(!this.apiKey){
        callback("API Key must be provided using defaults()");
        return;
    }

    var _basepath = _getBasePath (this, callback),
        path = '/sgconfig/' + configUUID,
        self = this;

    var options = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.apiKey},
        qs: {}
    };

    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            var config = new configObject (JSON.parse (body), self);
            callback(null, config);
        }
    });
}

var _listGateways = function(type, callback){
    var _orgID = _getOrgID (this, callback),
        _spaceID = _getSpaceID (this, callback),
        _basepath = _getBasePath (this, callback),
        authHeader = _getAuthHeader (this, callback),
        path = '/sgconfig?org_id=' + _orgID + "&space_id=" + _spaceID;
    
    if(type!=null){
        path += "&type=" + type
    }
    
    var options = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : authHeader},
        qs: {},
        json:true
    };

    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            callback(null, body);
        }
    });
}

function configObject(config, parent) {
    this.parent = parent;
    for(var key in config) {
        this[key] = config[key];
    }
}

configObject.prototype.deleteGateway = function(callback){
    var path = '/sgconfig/' + this._id,
        _basepath = _getBasePath (this.parent, callback);
       
    var options = {
        method: 'DELETE',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
    };

    request(options, function (error, response, body) {
        if(error){
            callback(error);
        }else if(response.statusCode != 200){
            callback(body);
        }else{
            callback(null);
        }
    });
}

configObject.prototype.updateGateway = function(desc, enabled, callback){

    var _body = {},
        path = '/sgconfig/' + this._id,
        _basepath = _getBasePath (this.parent, callback);
   
    if(desc){
        _body.desc = desc;
    }
    if(enabled!=null){
        _body.enabled = enabled;
    }
    
    var options = {
        method: 'PUT',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
        json:true,
        body: _body
    };

    var _this = this;
    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            for(var key in body){
                _this[key] = body[key];
            }
            callback(null, _this);
        }
    });
}

//Destination Functions
configObject.prototype.createDestination = function(desc, ip, port, username, password, tls, callback){

    var path = '/sgconfig/' + this._id + "/destinations",
        _basepath = _getBasePath (this.parent, callback);

    var options = {
        method: 'POST',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
        json:true,
        body: { 
            "desc" : desc,
            "ip" : ip,
            "port" : port,
            "username" : username,
            "password" : password,
            "tls" : tls
        }
    };

    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else{
            callback(null, body);
        }
    });
}

configObject.prototype.getDestination = function(destinationID, callback){
    
    var path = '/sgconfig/' + this._id + "/destinations/" + destinationID,
        _basepath = _getBasePath (this.parent, callback);

    var options = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
                headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
    };

    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            body = JSON.parse(body);
            if(appInfo != {}){
                body.currentHost = body.hostname;
                body.currentPort = body.port;
            } else{
                body.currentHost = body.connection_info.OnPremHost;
                body.currentPort = body.connection_info.OnPremPort;
            }
            callback(null, body);
        }
    });
}

configObject.prototype.deleteDestination = function(destinationID, callback){    
    
    var path = '/sgconfig/' + this._id + "/destinations/" + destinationID,
        _basepath = _getBasePath (this.parent, callback);
    
    var options = {
        method: 'DELETE',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
    };

    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            callback(null, body);
        }
    });
}

configObject.prototype.listDestinations = function(enabled, callback){
    
    var path = "/sgconfig/" + this._id + "/destinations",
        _basepath = _getBasePath (this.parent, callback);
    
    if(enabled != null){
        if(enabled){
            path += "?type=enabled";
        }else{
            path += "?type=disabled";
        }
    }
    
    var options = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
        json:true
    };  

    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            body.forEach(function(ep){
                if(appInfo != {}){
                    ep.currentHost = ep.hostname;
                    ep.currentPort = ep.port;
                } else{
                    ep.currentHost = ep.connection_info.OnPremHost;
                    ep.currentPort = ep.connection_info.OnPremPort;
                }
            });
            callback(null, body);
        }
    });
}

configObject.prototype.updateDestination = function(destinationID, desc, enabled, tls, callback){

    var _body = {},
        path = '/sgconfig/' + this._id + '/destinations/' + destinationID,
        _basepath = _getBasePath (this.parent, callback);
   
    if(desc){
        _body.desc = desc;
    }
    if(enabled!=null){
        _body.enabled = enabled.toString();
    }
    if(tls != null){
        _body.TLS = tls;
    }
    
    var options = {
        method: 'PUT',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
        json:true,
        body: _body
    };

    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            callback(null, body);
        }
    });
}

configObject.prototype.uploadDestinationCert = function(destinationID, certFilePath, callback){
   
    var path = '/sgconfig/' + this._id + "/destinations/" + destinationID + "/cert",
        _basepath = _getBasePath (this.parent, callback);

    var req = request.put ({
        uri : _basepath + apiVersion + path, 
        headers: {"Authorization" : "Bearer " + this.jwt}
    }, function (error, resp, body) {
        if (error) {
            callback(err, null);
        }else if(resp.statusCode != 200){
            callback(body, null);
        }else {
            callback(null, body);
        }
    });
    var form = req.form();
    form.append("cert", fs.createReadStream(certFilePath));
}

configObject.prototype.downloadDestinationCerts = function(destinationID, zipFileLocation, callback){
    var path = '/sgconfig/' + this._id + "/destinations/" + destinationID + "/cert",
        _basepath = _getBasePath (this.parent, callback);
    
    var options = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {}
    };
    
    var r = request(options);
    
    r.on('response',  function (res) {
        res.pipe(fs.createWriteStream(zipFileLocation));
    });
    
    r.on('complete', function(){
        callback(null);
    });
    
    r.on('error', function(error){
        callback(error);
    });
}

configObject.prototype.generateDestinationCerts = function(destinationID, callback){
    var path = '/sgconfig/' + this._id + "/destinations/" + destinationID + "/genCerts",
        _basepath = _getBasePath (this.parent, callback);
    
    var options = {
        method: 'PUT',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {}
    };
    
    request(options, function (error, response, body) {
        if(error){
            callback(error);
        }else if(response.statusCode != 200){
            callback(body);
        }else{
            callback(null);
        }
    });
}

//Stat functions
configObject.prototype.getStats = function(callback){
    var path = '/sgconfig/' + this._id +"/stats",
        _basepath = _getBasePath (this.parent, callback);
    
    var options = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
    };
    
    request(options, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            callback(null, body);
        }
    });
}

module.exports.getGateway    = _getGateway;
module.exports.listGateways  = _listGateways;
module.exports.createGateway = _createGateway;
module.exports.defaults      = _defaults;

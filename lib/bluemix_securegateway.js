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

var _createGateway = function(options, callback){
    if(!options.desc){
        callback("A description is required to create a gateway");
        return;
    }

    var _orgID = _getOrgID (this, callback),
        _spaceID = _getSpaceID (this, callback),
        _basepath = _getBasePath (this, callback),
        authHeader = _getAuthHeader (this, callback),
        path = '/sgconfig?org_id=' + _orgID + "&space_id=" + _spaceID,
        self = this;
      
    var req_opts = {
        method: 'POST',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : authHeader},
        qs: {},
        json: true,
        body: options
    };

    request(req_opts, function (error, response, body) {
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

var _getGateway = function(options, callback){

    if(!options.securityToken){
        callback("Security Token must be provided in the options");
        return;
    }
    if(!options.id){
        callback("A configuration ID must be provided to get a gateway.");
        return;
    }

    var _basepath = _getBasePath (this, callback),
        path = '/sgconfig/' + options.id,
        self = this;

    var req_opts = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + options.securityToken},
        qs: {}
    };

    request(req_opts, function (error, response, body) {
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

var _listGateways = function(options, callback){
    var _orgID = _getOrgID (this, callback),
        _spaceID = _getSpaceID (this, callback),
        _basepath = _getBasePath (this, callback),
        authHeader = _getAuthHeader (this, callback),
        path = '/sgconfig?org_id=' + _orgID + "&space_id=" + _spaceID;
    
    if(typeof(options) === "function"){
        callback = options;
        options = {};
    }

    if(options.type){
        path += "&type=" + options.type
    }
    
    var req_opts = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : authHeader},
        qs: {},
        json:true
    };

    var self = this;
    request(req_opts, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            var retVal = [];
            body.forEach(function(config){
                retVal.push(new configObject(config, self));
            });
            callback(null, retVal);
        }
    });
}

function configObject(config, parent) {
    this.parent = {basepath: parent.basepath};
    for(var key in config) {
        this[key] = config[key];
    }
}

configObject.prototype.deleteGateway = function(callback){
    var path = '/sgconfig/' + this._id,
        _basepath = _getBasePath (this.parent, callback);
       
    var req_opts = {
        method: 'DELETE',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
    };

    request(req_opts, function (error, response, body) {
        if(error){
            callback(error);
        }else if(response.statusCode != 200){
            callback(body);
        }else{
            callback(null);
        }
    });
}

configObject.prototype.updateGateway = function(options, callback){

    var _body = {},
        path = '/sgconfig/' + this._id,
        _basepath = _getBasePath (this.parent, callback);

    if(typeof(options) === "function"){
        callback = options;
        options = {};
    }
   
    if(options.desc){
        _body.desc = options.desc;
    }
    if(options.enabled != null){
        _body.enabled = options.enabled;
    }
    if(options.enf_tok_sec != null){
        _body.enf_tok_sec = options.enf_tok_sec;
    }

    var req_opts = {
        method: 'PUT',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
        json:true,
        body: _body
    };

    var _this = this;
    request(req_opts, function (error, response, body) {
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
configObject.prototype.createDestination = function(options, callback){

    if(!options.desc){
        callback("Missing required property desc");
        return;
    } else if(!options.ip){
        callback("Missing required property ip");
        return;
    } else if(!options.port){
        callback("Missing required property port");
        return;
    }

    var path = '/sgconfig/' + this._id + "/destinations",
        _basepath = _getBasePath (this.parent, callback);

    var req_opts = {
        method: 'POST',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
        json:true,
        body: options
    };

    request(req_opts, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
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

configObject.prototype.getDestination = function(options, callback){
    if(!options.id){
        callback("Missing required property id");
        return;
    }

    var path = '/sgconfig/' + this._id + "/destinations/" + options.id,
        _basepath = _getBasePath (this.parent, callback);

    var req_opts = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
                headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
    };

    request(req_opts, function (error, response, body) {
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

configObject.prototype.deleteDestination = function(options, callback){    
    if(!options.id){
        callback("Missing required property id");
        return;
    }

    var path = '/sgconfig/' + this._id + "/destinations/" + options.id,
        _basepath = _getBasePath (this.parent, callback);
    
    var req_opts = {
        method: 'DELETE',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
    };

    request(req_opts, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
            callback(null, body);
        }
    });
}

configObject.prototype.listDestinations = function(options, callback){
    
    var path = "/sgconfig/" + this._id + "/destinations",
        _basepath = _getBasePath (this.parent, callback);

    if(typeof(options) === "function"){
        callback = options;
        options = {};
    }
    
    if(options.enabled != null){
        if(options.enabled){
            path += "?type=enabled";
        }else{
            path += "?type=disabled";
        }
    }
    
    var req_opts = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
        json:true
    };  

    request(req_opts, function (error, response, body) {
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

configObject.prototype.updateDestination = function(options, callback){
    if(!options.id){
        callback("Missing required property id");
        return;
    }

    var _body = {},
        path = '/sgconfig/' + this._id + '/destinations/' + options.id,
        _basepath = _getBasePath (this.parent, callback);
   
    if(options.desc){
        _body.desc = options.desc;
    }
    if(options.enabled!=null){
        _body.enabled = options.enabled.toString();
    }
    if(options.tls != null){
        _body.TLS = options.tls;
    }
    if(options.protocol != null){
        _body.protocol = options.protocol;
    }
    if(options.enable_client_tls != null){
        _body.enable_client_tls = options.enable_client_tls;
    }
    if(options.honorcipherorder != null){
        _body.honorcipherorder = options.honorcipherorder;
    }
    if(options.ciphers != null){
        _body.ciphers = options.ciphers;
    }
    if(options.protocol_opts != null){
        _body.protocol_opts = options.protocol_opts;
    }
    
    var req_opts = {
        method: 'PUT',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {},
        json:true,
        body: _body
    };

    request(req_opts, function (error, response, body) {
        if(error){
            callback(error, null);
        }else if(response.statusCode != 200){
            callback(body, null);
        }else{
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

configObject.prototype.uploadDestinationCert = function(options, callback){   
    if(!options.id){
        callback("Missing required property id");
        return;
    } else if(!options.server_cert_filepath && !options.client_cert_filepath){
        callback("Missing required property server_cert_filepath or client_cert_filepath");
        return;
    }

    var path = '/sgconfig/' + this._id + "/destinations/" + options.id + "/cert",
        _basepath = _getBasePath (this.parent, callback);

    var req = request.put ({
        uri : _basepath + apiVersion + path, 
        headers: {"Authorization" : "Bearer " + this.jwt}
    }, function (error, resp, body) {
        if (error) {
            callback(error, null);
        }else if(resp.statusCode != 200){
            callback(body, null);
        }else {
            callback(null, body);
        }
    });
    var form = req.form();
    if(options.server_cert_filepath){
        form.append("cert", fs.createReadStream(options.server_cert_filepath));
    }
    if(options.client_cert_filepath){
        form.append("client_cert", fs.createReadStream(options.client_cert_filepath))
    }
}

configObject.prototype.downloadDestinationCerts = function(options, callback){
    if(!options.id){
        callback("Missing required property id");
        return;
    } else if(!options.filepath){
        callback("Missing required property filepath");
        return;
    }

    var path = '/sgconfig/' + this._id + "/destinations/" + options.id + "/cert",
        _basepath = _getBasePath (this.parent, callback);
    
    var req_opts = {
        method: 'GET',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {}
    };
    
    var r = request(req_opts);
    
    r.on('response',  function (res) {
        res.pipe(fs.createWriteStream(options.filepath));
    });
    
    r.on('complete', function(){
        callback(null);
    });
    
    r.on('error', function(error){
        callback(error);
    });
}

configObject.prototype.generateDestinationCerts = function(options, callback){
    if(!options.id){
        callback("Missing required property id");
        return;
    }

    var path = '/sgconfig/' + this._id + "/destinations/" + options.id + "/genCerts",
        _basepath = _getBasePath (this.parent, callback);
    
    var req_opts = {
        method: 'PUT',
        uri: _basepath + apiVersion + path,
        headers: {"Authorization" : "Bearer " + this.jwt},
        qs: {}
    };
    
    request(req_opts, function (error, response, body) {
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

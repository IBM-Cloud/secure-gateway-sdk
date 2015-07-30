# bluemix-secure-gateway
The Secure Gateway SDK for Bluemix contains a set of javascript wrapper APIs for Secure Gateway REST calls to
the Bluemix Secure Gateway service.

## Usage
To be used in conjunction with the Secure Gateway for Bluemix accounts and other services.


## Developing
You can develop javascript applications with this SDK, nodejs is required.

## Initialization

The SDK can be initialized with the following command:

```javascript
var sdk = require('bluemix-secure-gateway');
```

Once the SDK has been initialized, we can set the defaults for an environment. Default options that can be set include:
* `basepath` - The basepath of the Secure Gateway Service REST API . This defaults to "https://sgmanager.ng.bluemix.net", the basepath of the Secure Gateway Service in the us-south region. The basepath for the REST API in the UK region is "https://sgmanager.eu-gb.bluemix.net"
* `orgID` - The Bluemix Organization ID for the Secure Gateway Service being accessed. This is only required if creating or listing gateways.
* `spaceID` - The Bluemix Space ID for the Secure Gateway Service being accessed. This is only required if creating, describing, or listing gateways.
* `username` - A Bluemix username which is in the Org and Space provided. This is only needed if creating, describing, or listing gateways.
* `password` - The Bluemix password associated  with the Bluemix username provided.
* `token` - An authentication token retrieved from Bluemix SSO. This can be used in place of the username and password and must be associated with the Org and Space provided.


```javascript
var env = sdk.defaults ({
    'username': <Bluemix user name>,
    'password': <Bluemix password>
}) 
```

## Creating and Managing Gateways

### Creating a Gateway

```javascript
env.createGateway(options, function(error, gateway))
```
Options:
* `desc` - A description of this gateway. Must be a String.
* `enf_tok_sec` - Whether to require the security token when connecting the client. Must be a boolean.

On success, a gateway object is returned. Use the destination functions on this gateway to manage the destinations under this gateway.

### Describing and Listing Gateways

```javascript
env.getGateway(options, function(error, gateway))
```
Options:
* `id` - The Gateway ID, this is accessible from the Secure Gateway UI or the list call
* `securityToken` - The Gateway Security Token

```javascript
env.listGateways (options, function(error, array))
```
Options:
* `type` - (optional) Either `enabled` or `disabled`.  

Returns a list of gateways on success

### Updating a Gateway

```javascript
gateway.updateGateway(options, function(error, gateway))
```

Options:
* `desc` - Updated description of the gateway
* `enabled` - Enable or disable the gateway. Should be a Boolean
* `enf_tok_sec` - Whether to require the security token when connecting the client. Must be a boolean.

### Deleting a Gateway

```javascript
gateway.deleteGateway(function(error))    
```

Deletes the gateway and returns an error if one occurred.

## Creating and Managing Destinations

Creating and managing destinations is done by calling the functions below on the gateway object returned from the gateway functions.

### Creating a Destination

```javascript
gateway.createDestination(options, function(error, destination))
```

Options:
* `desc` - (Required) A description of the destination. This must a be a String.
* `ip` - (Required) The on-prem hostname or ip of the destination.
* `port` - (Required) The on-prem port of the destination
* `protocol` - The protocol of the destination, one of TCP, TLS, HTTP, or HTTPS. The default is TCP.
* `TLS` - One of serverside, mutualauth, or none. Defaults to none. Is only compatible with the TLS protocol.
* `enable_client_tls` - Enable TLS between the client and the final destination. Expected to be a Boolean. Defaults to false.

### Updating a Destination
```javascript
gateway.updateDestination(options, function(error, destination))
```

Options:
* `desc` - A description of the destination. This must a be a String.
* `enabled` - Enable or disable the destination. Should be a Boolean.
* `ip` -  The on-prem hostname or ip of the destination.
* `port` - The on-prem port of the destination
* `protocol` - The protocol of the destination, one of TCP, TLS, HTTP, or HTTPS. The default is TCP.
* `TLS` - One of serverside, mutualauth, or none. Defaults to none. Is only compatible with the TLS protocol.
* `enable_client_tls` - Enable TLS between the client and the final destination. Expected to be a Boolean. Defaults to false.

### Listing Destinations

```javascript
gateway.listDestinations(options, function(error, array_of_destinations))
```

Options:
* `enabled` - Whether to only include enabled or disabled destinations. Should be a Boolean. If not specified all destinations will be returned.

### Describe A Destination

```javascript
gateway.getDestination(options, function(error, destination))
```

Options:
* `id` - ID of the destination to be retrieved

### Delete a Destination

```javascript
gateway.deleteDestination(options, function(error))
```
Options:
* `id` - ID of the destination to be deleted


### Upload Destination Certificates

```javascript 
gateway.uploadDestinationCert(options, function(err))
```

Options:
* `id` - ID of the destination these certificates belong to.
* `server_cert_filepath` - Filepath of the server cert to be uploaded
* `client_cert_filepath` - Filepath of the client cert to be uploaded

### Auto Generate Destination Certificate/Private Key

```javascript
gateway.generateDestinationCerts(options, function(err))
```

Options:
* `id` - ID of the destination to generate cert and key for

This generates a cert and key for a TLS: Mutual Auth destination.

### Download Destination Certs and Keys

```javascript
gateway.downloadDestinationCerts(options, function(err))
```

Options:
* `id` - ID of the destination whose certs are to be downloaded
* `filepath` - Filepath where the zip file should be saved.



/*!
 * node-azure
 * Copyright(c) 2011 Paul O'Fallon <paul@ofallonfamily.com>
 * MIT Licensed
 */

var crypto = require('crypto');
var dateFormat = require('dateformat');
var sax = require('sax');
var MemoryStream = require('memorystream');

var azureutil = require("./util");
    
function Container (b,options) {
  this.options = options;
  this.name = b;
}

Container.listContainers = function(options, callback) {
  
  var saxStream = sax.createStream(true);
  var insideBlobName = false;
  var blobs = [];
  
  var onResponse = function(error, response) {
    if (error) {
      callback(error);
    }
  };
  
  saxStream.on('opentag', function(tag) {
    if (tag.name === "Name") {
      insideBlobName = true;
    }
  });
  
  saxStream.on('text', function(s) {
    if (insideBlobName) {
      blobs.push(s);
      insideBlobName = false;
    }
  });
  
  saxStream.on('closetag', function(name) {
    if (name === "Containers") {
      callback(null,blobs);
    }
  });

  saxStream.on('error', function(err) {
    // console.log("ERROR: " + err);
  });
  
  azureutil.doGet({
    'host' : options.account + '.blob.core.windows.net',
    'queryString' : 'comp=list',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'responseStream' : saxStream,
    'enhancedAuth' : true,    // Blob & Queue auth differently than Tables :-(
    'authQueryString' : true
  });
};

Container.createContainer = function(name,options,callback) {
  
  var onResponse = function(error, response) {
    if (response.statusCode != 201) {
      callback(error);
    } else {
      var c = new Container(name,options);
      callback(null,c);
    }
  };
  
  azureutil.doPut({
    'host' : options.account + '.blob.core.windows.net',
    'path' : name,
    'queryString' : 'restype=container',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'enhancedAuth' : true,
    'metaData' : {
      'Name' : name
    }
  });
  
};

Container.removeContainer = function(b,options,callback) {
  
  var onResponse = function(error, response) {
    if (error || (response.statusCode !== 202)) {
      // console.dir(response.headers);
      // console.log("Response = " + response.statusCode);
      callback(error || true);
    } else {
      callback(null,true);
    }
  };
  
  azureutil.doDelete({
    'host' : options.account + '.blob.core.windows.net',
    'path' : b,
    'queryString' : 'restype=container',
    'account' : options.account,
    'key' : options.key,
    'onResponse' : onResponse,
    'enhancedAuth' : true,
  });
  
};

Container.prototype.list = function(callback) {
  
};

Container.prototype.put = function(name) {

  var that = this;

  var onResponse = function(error, response) {
    if (error || (response.statusCode !== 201)) {
      // console.log("Error " + response.statusCode);
      s.emit('error',error || true);
      s.destroy();
    }
  }

  var s = new MemoryStream(null, {readable: false});

  s.on('end', function() {

    // console.log("Stream: " + s.getAll());
    azureutil.doPut({
      'host' : that.options.account + '.blob.core.windows.net',
      'path' : that.name + '/' + name,
      'account' : that.options.account,
      'key' : that.options.key,
      'body' : s.getAll(),
      'onResponse' : onResponse,
      'enhancedAuth' : true,
      // 'responseStream' : saxStream,
      'headers' : {
        'x-ms-blob-type' : 'BlockBlob'
      }
    });

  });


  return(s);
  
};

Container.prototype.get = function(name) {

  var getStream = null;
  
  var onResponse = function(error, response) {
    if (error) {
      getStream.emit('error',error);
    }
  };
  
  getStream = azureutil.doGet({
    'host' : this.options.account + '.blob.core.windows.net',
    'path' : this.name + '/' + name,
    'account' : this.options.account,
    'key' : this.options.key,
    'onResponse' : onResponse,
    'enhancedAuth' : true
  });

  return(getStream);

};

Container.prototype.snapshot = function(b,callback) {
  
};

Container.prototype.copy = function(b1,b2,callback) {
  
};

Container.prototype.del = function(b,callback) {
  
};

module.exports = Container;
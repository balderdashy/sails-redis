<h1><span>sails-redis</span><img width="175" alt="image_squidhome@2x.png" src="http://i.imgur.com/RIvu9.png"/></h1>

<h2>Lightweight Redis Adapter for Node.js / Sails Apps</h2>

A lightweight Sails/Waterline adapter for Redis. May be used in a [Sails](http://sailsjs.com) app, or any Node.js module using [Waterline](http://waterlinejs.org) as its ORM.

> #### Heads up
> **This adapter _does not support the Semantic or Queryable interfaces_.  Instead, it simply provides robust, managed access to the underlying Redis client.**  That means you can't use it to call methods like `.find()`.  Instead, use it as a simple way to easily configure, obtain a connection, and communicate with Redis (e.g. for caching) within the lifecycle of your Node.js / Sails application.
>
> **Looking for the old repo?**  See the [for-sails-0.12 branch](https://github.com/balderdashy/sails-redis/tree/for-sails-0.12) of this repo or [ryanc1256/sails-redis](https://github.com/ryanc1256/sails-redis) for examples of conventional adapters that let you use Redis to directly store and query records from your models.
>
> **This is an adapter for Sails versions 1.0 and up.**  If you are using an earlier version of Sails (or Waterline &lt;v0.13), check out the [for-sails-0.12 branch](https://github.com/balderdashy/sails-redis/tree/for-sails-0.12).  Since this new release of sails-redis is more lightweight, and does not support the same semantic interface as its predecessor, be aware that there are breaking changes in your app when you upgrade.  But I think you'll find that this new release is a great way to easily communicate with Redis, with minimal interference and a stable API.
> _If you are interested in upgrading the new, Sails-v1-compatible release of this Redis adapter to support semantic usage (find, create, update, destroy), then please [contact Mike or another core maintainer](http://sailsjs.com/contact)._


## Usage

#### Install

Install is through NPM.

```bash
npm install sails-redis
```

#### Getting started

After installing and configuring this adapter (see below), you'll be able to use it to send commands to Redis from your Sails/Node.js app.

Here's an example demonstrating how to look up a cached value from Redis using async/await:

```javascript
var util = require('util');

// Made up a fake parameter:
var key = 'foo';

// Inspired by https://github.com/node-machine/driver-interface/blob/06776813ff3a29cfa80c0011f3affa07bbc28698/layers/cache/get-cached-value.js
// Redis client docs: https://github.com/NodeRedis/node_redis/tree/v.2.8.0#sending-commands
// See also https://github.com/sailshq/machinepack-redis/blob/f0892e581286eac24757532513387162396356f7/machines/get-cached-value.js#L79-L94
// > If Redis returns `null`, then the value at this key is expired or does
// > not exist.  If a value _was_ found, attempt to JSON.parse() it.
// > (See `set-cached` for more info on why we're deserializing JSON here.)
var value = await sails.getDatastore('cache').leaseConnection(async (db)=>{
  var found = await (util.promisify(db.get).bind(db))(key);
  if (found === null) {
    return undefined;
  } else {
    return JSON.parse(found);
  }
});//¬
```

And here's another async/await example, this time showing how to _set_ a value in Redis, along with a TTL (i.e. expiry):

```javascript
var util = require('util');

// Made up some fake parameters:
var key = 'foo';
var value = {
  coolPhrase: `hello world, it's ${new Date()}`,
  iCan: ['put','w/e','I','want',4,'here']
};
var expiresIn = 1000*60*60*24;

// Convert `expiresIn` (which is expressed in milliseconds) to seconds,
// because unlike JavaScript, Redis likes to work with whole entire seconds.
var ttlInSeconds = Math.ceil(expiresIn / 1000);

// Inspired by https://github.com/node-machine/driver-interface/blob/06776813ff3a29cfa80c0011f3affa07bbc28698/layers/cache/cache-value.js
// Redis client docs: https://github.com/NodeRedis/node_redis/tree/v.2.8.0#sending-commands
// See also https://github.com/sailshq/machinepack-redis/blob/f0892e581286eac24757532513387162396356f7/machines/cache-value.js#L86-L107
// > Note: Redis expects string values, so we serialize `value` to JSON…
// > even if it is already a string.  (This is important for seamless reversibility.)
// > Also note that TTL is seconds, not ms…  I know it's weird -- sorry!
await sails.getDatastore('cache').leaseConnection(async (db)=>{
  await (util.promisify(db.setex).bind(db))(key, ttlInSeconds, JSON.stringify(value));
});//¬
```

Note that the leased connection (`db`) is just a [Redis client instance](https://www.npmjs.com/package/redis).  No need to connect it/bind event listeners-- it's already hot and ready to go.  Any fatal, unexpected errors that would normally be emitted as the "error" event are handled by the underlying driver, and can be optionally handled with custom logic by providing a function for `onUnexpectedFailure`.

> Need to use a different Redis client, like ioredis?  Please have a look at the [underlying driver](https://www.npmjs.com/package/machinepack-redis) for the latest info/discussion.

#### Using the Redis client instance

The documentation for the version of `redis` used in this adapter can be found here:
https://github.com/NodeRedis/node_redis/tree/v.2.8.0#sending-commands

## Configuration

This adapter supports [standard datastore configuration](http://sailsjs.com/documentation/reference/configuration/sails-config-datastores), as well as some additional low-level options.

For example, in a Sails app, add the config below to your [`config/datastores.js`](http://sailsjs.com/anatomy/config/datastores-js) file:

```javascript
cache: {
  adapter: 'sails-redis',
  url: 'redis://localhost:6379',

  // Other available low-level options can also be configured here.
  // (see below for more information)
},
```

> Note that you probably shouldn't set Redis as the default datastore for your application (your models wouldn't work!)


#### Low-Level Configuration (for redis client)

Configuration for the underlying Redis client itself is located as an object under the `options`.  The following options are available:

* `parser`: which Redis protocol reply parser to use.  Defaults to `hiredis` if that module is installed.
This may also be set to `javascript`.
* `return_buffers`: defaults to `false`.  If set to `true`, then all replies will be sent to callbacks as node Buffer
objects instead of JavaScript Strings.
* `detect_buffers`: default to `false`. If set to `true`, then replies will be sent to callbacks as node Buffer objects
if any of the input arguments to the original command were Buffer objects.
This option lets you switch between Buffers and Strings on a per-command basis, whereas `return_buffers` applies to
every command on a client.
* `socket_nodelay`: defaults to `true`. Whether to call setNoDelay() on the TCP stream, which disables the
Nagle algorithm on the underlying socket.  Setting this option to `false` can result in additional throughput at the
cost of more latency.  Most applications will want this set to `true`.
* `no_ready_check`: defaults to `false`. When a connection is established to the Redis server, the server might still
be loading the database from disk.  While loading, the server not respond to any commands.  To work around this,
`node_redis` has a "ready check" which sends the `INFO` command to the server.  The response from the `INFO` command
indicates whether the server is ready for more commands.  When ready, `node_redis` emits a `ready` event.
Setting `no_ready_check` to `true` will inhibit this check.
* `enable_offline_queue`: defaults to `true`. By default, if there is no active
connection to the redis server, commands are added to a queue and are executed
once the connection has been established. Setting `enable_offline_queue` to
`false` will disable this feature and the callback will be execute immediately
with an error, or an error will be thrown if no callback is specified.
* `retry_max_delay`: defaults to `null`. By default every time the client tries to connect and fails time before
reconnection (delay) almost doubles. This delay normally grows infinitely, but setting `retry_max_delay` limits delay
to maximum value, provided in milliseconds.
* `connect_timeout` defaults to `false`. By default client will try reconnecting until connected. Setting `connect_timeout`
limits total time for client to reconnect. Value is provided in milliseconds and is counted once the disconnect occured.
* `max_attempts` defaults to `null`. By default client will try reconnecting until connected. Setting `max_attempts`
limits total amount of reconnects.
* `auth_pass` defaults to `null`. By default client will try connecting without auth. If set, client will run redis auth command on connect.


## Help

For more examples, or if you get stuck or have questions, click [here](http://sailsjs.com/support).


## Bugs &nbsp; [![NPM version](https://badge.fury.io/js/sails-redis.svg)](http://npmjs.com/package/sails-redis)

To report a bug, [click here](http://sailsjs.com/bugs).


## Contributing &nbsp; [![Build Status](https://travis-ci.org/balderdashy/sails-redis.svg?branch=master)](https://travis-ci.org/balderdashy/sails-redis)

Please observe the guidelines and conventions laid out in the [Sails project contribution guide](http://sailsjs.com/contribute) when opening issues or submitting pull requests.

[![NPM](https://nodei.co/npm/sails-redis.png?downloads=true)](http://npmjs.com/package/sails-redis)


## Acknowledgements

I owe a big thank you to [@ryanc1256](https://github.com/ryanc1256) for all of his work with the original version of this adapter.

## License

This adapter, like the [Sails framework](http://sailsjs.com), is free and open-source under the [MIT License](http://sailsjs.com/license).


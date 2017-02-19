# sails-redis

A lightweight Sails/Waterline adapter for Redis. May be used in a [Sails](http://sailsjs.com) app, or anything using [Waterline](http://waterlinejs.org) for the ORM.

![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

## Purpose


This adapter **does not support the Semantic or Queryable interfaces**.  Instead, it simply provides robust, managed access to the underlying Redis client.
See the [for-sails-0.12 branch](https://github.com/balderdashy/sails-redis/tree/for-sails-0.12) of this repo or [ryanc1256/sails-redis](https://github.com/ryanc1256/sails-redis)
for examples of conventional adapters that let you use Redis to directly store and query records from your models.

> **This is an adapter for Sails versions 1.0 and up.**  If you are using an earlier version of Sails (or Waterline &lt;v0.13), check out the [for-sails-0.12 branch](https://github.com/balderdashy/sails-redis/tree/for-sails-0.12).  Since this new release of sails-redis is more lightweight, and does not support the same semantic interface as its predecessor, be aware that there are breaking changes in your app when you upgrade.  But I think you'll find that this new release is a great way to easily communicate with Redis, with minimal interference and a stable API.
> _If you are interested in upgrading the new, Sails-v1-compatible release of this Redis adapter to support semantic usage (find, create, update, destroy), then please [contact Mike or another core maintainer](http://sailsjs.com/contact)._


## Usage

#### Install

Install is through NPM.

```bash
$ npm install sails-redis --save
```

#### Getting started

After installing and configuring this adapter (see below), you'll be able to use it to send commands to Redis from your Sails/Node.js app.

For example, in an action:

```javascript
var categoryId = Product.validate('category', req.param('category'));

sails.getDatastore('cache').leaseConnection(function during(db, proceed) {

  db.get('cached_products_for_category_'+categoryId, function (err, cachedData){
    if (err) { return proceed(err); }

    var cachedProducts;
    try {
      cachedProducts = JSON.parse(cachedData);
    } catch (e) { return proceed(e); }

    if (cachedProducts) {
      return proceed(undefined, cachedProducts);
    }

    // IWMIH, there are no cached products for this category.
    // So here we might look up the products (Product.find()) to grab them
    // from some other database (e.g. mysql), then cache them in Redis.
    // (skipping all that to keep this example short)
    var newlyCachedProducts = [ /* ... */ ];

    // Finally, when finished:
    return proceed(undefined, newlyCachedProducts);

  });//</ .get() >

}).exec(function (err, products){
  if (err) { return res.serverError(err); }

  return res.json(products);

});
```

Note that the leased connection (`db`) is just a [Redis client instance](https://www.npmjs.com/package/redis).  No need to connect it/bind event listeners-- it's already hot and ready to go.  Any fatal, unexpected errors that would normally be emitted as the "error" event are handled by the underlying driver, and can be optionally handled with custom logic by providing a function for `onUnexpectedFailure`.

> Need to use a different Redis client, like ioredis?  Please have a look at the [underlying driver](https://www.npmjs.com/package/machinepack-redis) for the latest info/discussion.

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


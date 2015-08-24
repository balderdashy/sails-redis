![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Redis Sails/Waterline Adapter 
[![Build Status](https://travis-ci.org/balderdashy/sails-redis.svg?branch=master)](https://travis-ci.org/balderdashy/sails-redis)
[![npm version](https://badge.fury.io/js/sails-redis.svg)](http://badge.fury.io/js/sails-redis)
[![Dependency Status](https://david-dm.org/balderdashy/sails-redis.svg)](https://david-dm.org/balderdashy/sails-redis)

A Sails/Waterline adapter for Redis. May be used in a [Sails](https://github.com/balderdashy/sails) app or anything using Waterline for the ORM.

This `waterline-redis` stores indexes of unique attributes for *relatively* fast lookups. Collections with multiple unique constraints will create multiple index sets.


## Install

In the near future, `sails-redis` will be available on npm.

Install is through NPM.

```bash
$ npm install sails-redis
```

## Configuration

The following connection configuration is available:

```javascript
// default values inline
config: {
  port: 6379,
  host: 'localhost',
  password: null,
  database: null,
  options: {
  
    // low-level configuration
    // (redis driver options)
    parser: 'hiredis',
    return_buffers: false,
    detect_buffers: false,
    socket_nodelay: true,
    no_ready_check: false,
    enable_offline_queue: true
  }
};
```

Alternatively the URL notation for configuration can be used for configuration:

``` javascript
config {
  url: 'redis://h:abc123@host.com:6379'
}

// Equivalent to:
// config: {
//   port: 6379,
//   host: 'host.com'
//   password: 'abc123'
// }
// Other portions of the URL, including the 'username' 'h' are ignored
```

Note that if both the 'url' notation and the 'host', 'port' and / or 'password' notations are used, the non-url configuration options will take precedence.

#### Low-Level Configuration (for redis driver)

Configuration for the underlying Redis driver itself is located as an object under the `options`.  The following options are available:

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

## FAQ

See `FAQ.md`.



## Contribute

See `CONTRIBUTING.md`.


## MIT License

See `LICENSE.md`.

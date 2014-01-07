![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Redis Sails/Waterline Adapter [![Build Status](https://travis-ci.org/vanetix/sails-redis.png)](https://travis-ci.org/vanetix/sails-redis)

*Note: This adapter is under active development, and most functions are currently extremely inefficient.*

A Sails/Waterline adapter for Redis. May be used in a [Sails](https://github.com/balderdashy/sails) app or anything using Waterline for the ORM.

This `waterline-redis` stores indexes of unique attributes for *relatively* fast lookups. Collections with multiple unique constraints will create multiple index sets.


## Install

To install *sails-redis* run `npm install git+ssh://git@github.com:balderdashy/sails-redis.git --save` from your project directory or add `"sails-redis": "git+ssh://git@github.com:balderdashy/sails-redis.git"` into *dependencies* in your `package.json`.

In the near future, `sails-redis` will be available on npm.

<!--
Install is through NPM.

```bash
$ npm install sails-redis
```
-->

## Configuration

The following config options are available along with their default values:

```javascript
// TODO
```

<!--
config: {
  database: 'databaseName',
  host: 'localhost',
  user: 'root',
  password: '',
  port: 5432,
  pool: false
};
-->




## FAQ

See `FAQ.md`.



## Contribute

See `CONTRIBUTING.md`.


## MIT License

See `LICENSE.md`.

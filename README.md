![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Redis Sails/Waterline Adapter [![Build Status](https://travis-ci.org/vanetix/sails-redis.png)](https://travis-ci.org/vanetix/sails-redis)

*Note: This adapter is under active development, and most functions are currently extremely inefficient.*

A Sails/Waterline adapter for Redis. May be used in a [Sails](https://github.com/balderdashy/sails) app or anything using Waterline for the ORM.

This `waterline-redis` stores indexes of unique attributes for *relatively* fast lookups. Collections with multiple unique constraints will create multiple index sets.


## Installing

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

#### I get an error when I `npm install` this adapter

If you're running OS X, you will need xcode installed for building the redis binary.  Also you'll need to have opened xcode at least once for it to properly expose the c compiler for `node-gyp` to work.

#### Xcode can't find `/usr/bin/usr/bin/xcodebuild`
I am on OSX (Lion), and I do have xcode tools installed -  `/usr/bin/xcodebuild` is present, but it seems that node-gyp is looking for `/usr/bin/usr/bin/xcodebuild` for some reason.  Solution is to run:

```
sudo xcode-select -switch /
```

This caused freezes the first time I tried it but after a reboot, running `npm install` worked flawlessly.


> #### Got a question that isn't covered here?
>
> Send a PR that adds it to this question and we might be able to answer it!


## Contribute

#### Setup

Clone this repository, `cd` into it, and run `npm install`.

#### Tests

Tests are written with mocha. Integration tests are handled by the [waterline-adapter-tests](https://github.com/balderdashy/waterline-adapter-tests) project, which tests adapter methods against the latest Waterline API.

To run tests:

```bash
$ npm test
```



## About Waterline

Waterline is a new kind of storage and retrieval engine.  It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

To learn more visit the project on GitHub at [Waterline](https://github.com/balderdashy/waterline).



## License (MIT)

Copyright © 2013-2014 Balderdash Design Co., Matt McFarland, and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png) 

# RedisAdapter
> Under active development- if you'd like to contribute please join us in the #sailsjs channel on freenode or in sailsjs-dev@googlegroups.com

Adds Redis support for Sails.

# Sails.js Repo
http://SailsJs.com


## About Waterline
Waterline is a new kind of storage and retrieval engine.  It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.
Waterline also comes with built-in transaction support, as well as a configurable environment setting. 
> NOTE: Waterline is currently in unreleased alpha-- that means it's not production ready!  If you want to use waterline in a production app, please contribute.  Currentliy, the plan is for an open alpha release early next year (2013).  Thanks!
You can learn more about

*Waterline repo: https://github.com/balderdashy/sails-redis*


## Writing your own adapters
It's easy to add your own adapters for integrating with proprietary systems or existing open APIs.  For most things, it's as easy as `require('some-module')` and mapping the appropriate methods to match waterline semantics.

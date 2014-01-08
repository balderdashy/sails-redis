# FAQ


> **Got a question that isn't covered here?**
>
> Send a PR that adds it to this file and we might be able to answer it.


## Frequently-Asked Questions

#### I get an error when I `npm install` this adapter

If you're running OS X, you will need xcode installed for building the redis binary.  Also you'll need to have opened xcode at least once for it to properly expose the c compiler for `node-gyp` to work.



#### Xcode can't find `/usr/bin/usr/bin/xcodebuild`

I am on OSX (Lion), and I do have xcode tools installed -  `/usr/bin/xcodebuild` is present, but it seems that node-gyp is looking for `/usr/bin/usr/bin/xcodebuild` for some reason.  Solution is to run:

```
sudo xcode-select -switch /
```

This caused freezes the first time I tried it but after a reboot, running `npm install` worked flawlessly.


#### What's the deal with Waterline?

Waterline is a new kind of storage and retrieval engine.  It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

It is also the ORM layer for the [Sails framework](http://sailsjs.org).

To learn more visit the project [on GitHub](https://github.com/balderdashy/waterline).


#### Why was the `hiredis` dependency removed?

Until further benchmarking can prove its benefit, the headache of having to have a compiler installed for the C binding isn't worth it.  An optional dependency would also be another valid approach.
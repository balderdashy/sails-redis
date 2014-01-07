# FAQ (Frequently-Asked Questions)


> #### Got a question that isn't covered here?
>
> Send a PR that adds it to this file and we might be able to answer it!



#### I get an error when I `npm install` this adapter

If you're running OS X, you will need xcode installed for building the redis binary.  Also you'll need to have opened xcode at least once for it to properly expose the c compiler for `node-gyp` to work.

-------------------------------------------------------

#### Xcode can't find `/usr/bin/usr/bin/xcodebuild`

I am on OSX (Lion), and I do have xcode tools installed -  `/usr/bin/xcodebuild` is present, but it seems that node-gyp is looking for `/usr/bin/usr/bin/xcodebuild` for some reason.  Solution is to run:

```
sudo xcode-select -switch /
```

This caused freezes the first time I tried it but after a reboot, running `npm install` worked flawlessly.

-------------------------------------------------------


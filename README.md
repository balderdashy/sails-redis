![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# waterline-redis [![Build Status](https://travis-ci.org/vanetix/sails-redis.png)](https://travis-ci.org/vanetix/sails-redis)

*Note: This adapter is under active development, and most functions are currently extremely inefficient.*

## Details

This `waterline-redis` stores indexes of unique attributes for *relatively* fast lookups. Collections with multiple unique constraints will create multiple index sets.

## Installing

To install *sails-redis* run `npm install git+ssh://git@github.com:balderdashy/sails-redis.git --save` from your project directory or add `"sails-redis": "git+ssh://git@github.com:balderdashy/sails-redis.git"` into *dependencies* in your `package.json`.

## License (MIT)

Copyright © 2013 Balderdash Design Co. and contributors

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

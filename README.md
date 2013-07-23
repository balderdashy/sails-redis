![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# waterline-redis [![Build Status](https://travis-ci.org/vanetix/sails-redis.png)](https://travis-ci.org/vanetix/sails-redis)

*Note: This adapter is under active development, and most functions are currently extremely inefficient.*

## Details

This `waterline-redis` stores indexes of unique attributes for *relatively* fast lookups. Collections with multiple unique constraints will create multiple index sets.
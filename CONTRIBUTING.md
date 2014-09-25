# Contributing to this adapter


The community is what makes Sails/Waterline great, without you we wouldn't have come so far. But to help us keep our sanity and reach code-nirvana together, please follow these quick rules whenever contributing.

## Opening issues
1. If you have a question about setting up/using adapters in general, please check out the [Sails docs](http://sailsjs.org/#!documentation) or try searching  [StackOverflow](http://stackoverflow.com/questions/tagged/sails.js).
2. Search for issues similar to yours in [GitHub search](https://github.com/balderdashy/sails-redis/search?type=Issues) and [Google](https://www.google.nl/search?q=sails-redis). 
3. Feature requests are welcome (although pull requests are always better!), but we would prefer to keep them separate from actual issues with the adapter. If you want to submit a feature request, please prefix the name of your issue w/ "Feature Request:", e.g. "Feature Request: blah blah.."
4. If there's an open issue, please contribute to the discussion in that issue.
5. If a closed issue has re-emerged, open a new issue and link the url of the already closed issue(s).
6. If there is no issue, open a new issue and specify the following:
  - A short description of your issue in the title
  - The version of the adapter you're using (check your `package.json` or `node_modules/**/package.json`).
  - Detailed explanation of how to recreate the issue.
7. If you are experiencing more than one problem, please create a separate issue for each one. If you think they might be related, reference the other relevant issues you've created.



## Submitting Pull Requests

#### Get Set Up

Clone this repository, `cd` into it, and run `npm install`.

<!--
For future use (if needed): instructions for installing from github:

To install *sails-redis* run `npm install git+ssh://git@github.com:balderdashy/sails-redis.git --save` from your project directory or add `"sails-redis": "git+ssh://git@github.com:balderdashy/sails-redis.git"` into *dependencies* in your `package.json`.
-->

#### Run Tests

To run tests:

```bash
$ npm test
```

#### Submit a Pull Request

1. If you don't know how to fork and PR, [have a look at Github's instructions](https://help.github.com/articles/using-pull-requests).
2. Check that someone else hasn't already starting working on your patch (i.e. [search issues and PRs](https://github.com/balderdashy/sails-redis/search?q=&type=Issues).)  There might be an open pull request, issue, or closed pull request you can reference.
3. Fork the repo.
4. Add a test for your change. Only refactoring and documentation changes require no new tests. If you are adding functionality or fixing a bug, we need a test to ensure the patch can be quickly merged.
5. Make the tests pass and make sure you follow [our syntax guidelines](https://github.com/balderdashy/sails/blob/master/.jshintrc).
6. Push to your fork and submit a pull request to the master branch.




Tests are written with mocha. Integration tests are handled by the [waterline-adapter-tests](https://github.com/balderdashy/waterline-adapter-tests) project, which tests adapter methods against the latest Waterline API.



## Additional Resources
[Waterline Core on Github](https://github.com/balderdashy/waterline) | [Official Sails Documentation](http://sailsjs.org/#!documentation) | [#sailsjs on IRC](http://webchat.freenode.net/) | [Google Group](https://groups.google.com/forum/?fromgroups#!forum/sailsjs) | [Twitter](http://twitter.com/sailsjs)

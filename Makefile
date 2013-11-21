REPORTER = spec

test: test_unit test_integration

test_unit:
	@NODE_ENV=test
	@./node_modules/.bin/mocha --reporter $(REPORTER) test/**/adapter.*.js

test_integration:
	@NODE_ENV=test
	@node test/integration/runner

.PHONY: test test_unit test_integration
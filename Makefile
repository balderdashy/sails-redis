REPORTER = dot

test:
	@NODE_ENV=test
	@node test/integration/runner
	@./node_modules/.bin/mocha --reporter $(REPORTER) test/load/**

.PHONY: test
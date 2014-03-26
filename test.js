'use strict';

var bbcode = require('./');

var testCases = [
	{
		name: 'basic formatting',
		input: '[b]bold[/b] [i]italic[/i] [u]underline[/u] [s]strikeout[/s] [sup]superscript[/sup] [sub]subscript[/sub] [left]left-alignment[/left] [center]center-alignment[/center] [right]right-alignment[/right]',
		expected: '<b>bold</b> <i>italic</i> <u>underline</u> <s>strikeout</s> <sup>superscript</sup> <sub>subscript</sub> <div class="align-left">left-alignment</div> <div class="align-center">center-alignment</div> <div class="align-right">right-alignment</div>'
	},
	{
		name: 'escaping',
		input: '[URL=http://example.com/&"]<>&[/URL]',
		expected: '<a href="http://example.com/&amp;&quot;" rel="nofollow">&lt;&gt;&amp;</a>'
	},
	{
		name: 'unsafe links',
		input: '[URL=javascript:alert(1)]click[/URL]',
		expected: '[URL=javascript:alert(1)]click[/URL]'
	},
	{
		name: 'nested quotes',
		input: '[QUOTE="some user"]And then I came across something extraordinary: [QUOTE=example]red green blue orange yellow[/QUOTE] Perplexing![/QUOTE]',
		expected: '<blockquote><header><cite>some user</cite> wrote:</header> And then I came across something extraordinary: <blockquote><header><cite>example</cite> wrote:</header> red green blue orange yellow</blockquote> Perplexing!</blockquote>'
	},
	{
		name: 'bad nesting',
		input: '[b]foo [i]bar[/b] baz[/i]',
		expected: '<b>foo <i>bar</i></b><i> baz</i>'
	},
	{
		name: 'worse nesting',
		input: '[i]one [b]two [i]three[/b] four[/i] five[/i]',
		expected: '<i>one <b>two <i>three</i></b><i> four</i> five</i>'
	},
	{
		name: 'triple bad nesting',
		input: '[i]one [b]two [s]three[/i] four[/b] five[/s]',
		expected: '<i>one <b>two <s>three</s></b></i><b><s>four</s></b><s> five</s>'
	},
	{
		name: 'bad nesting involving bad tag',
		input: '[i]one [url=javascript:two]three[/i] four[/url]',
		expected: '<i>one [url=javascript:two]three</i> four[/url]'
	},
	{
		name: 'user links',
		input: ':iconexample: :exampleicon: :linkexample:',
		expected: '<a href="/users/example/"><img src="/users/example/image"> example</a> <a href="/users/example/"><img src="/users/example/image"></a> <a href="/users/example/">example</a>'
	},
	{
		name: 'automatic links',
		input: 'Have you visited http://example.com/?',
		expected: 'Have you visited <a href="http://example.com/" rel="nofollow">http://example.com/</a>?'
	},
];

function attempt(test) {
	var output = bbcode.render(test.input);

	if (output === test.expected) {
		console.log('\x1b[32m✔\x1b[0m \x1b[1m%s\x1b[0m passed', test.name);
		return true;
	}

	console.log('\x1b[31m✘\x1b[0m \x1b[1m%s\x1b[0m failed', test.name);
	console.log('  Output: ' + output);
	console.log('Expected: ' + test.expected);
	return false;
}

var allPassed = testCases.reduce(function (passing, test) {
	return attempt(test) && passing;
}, true);

if (!allPassed) {
	process.exit(1);
}

'use strict';

var URL = require('url');

var allowedProtocols = [null, 'http:', 'https:', 'mailto:', 'irc:', 'ircs:', 'magnet:'];

var symbols = {
	c: '©',
	r: '®',
	tm: '™'
};

function escapeAttributeValue(value) {
	return ('' + value)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;');
}

function escapeContent(value) {
	return ('' + value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function linkInfo(uri) {
	var info = URL.parse(uri);
	var hostParts = info.hostname && info.hostname.split('.').reverse();

	return {
		allowed: allowedProtocols.indexOf(info.protocol) !== -1,
		internal: info.protocol === null || (hostParts && hostParts[0] === 'net' && (hostParts[1] === 'furaffinity' || hostParts[1] === 'facdn'))
	};
}

var TEXT = 'TEXT';
var OPEN_TAG = 'OPEN_TAG';
var CLOSE_TAG = 'CLOSE_TAG';
var ICON_AND_USERNAME_LINK = 'ICON_AND_USERNAME_LINK';
var ICON_ONLY_LINK = 'ICON_ONLY_LINK';
var USERNAME_ONLY_LINK = 'USERNAME_ONLY_LINK';
var HORIZONTAL_RULE = 'HORIZONTAL_RULE';
var LINE_BREAK = 'LINE_BREAK';

var CSS3_OPAQUE_COLOUR = /^(?:#?([\da-f]{3}|[\da-f]{6})|rgb\((?:(?:\s*(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\s*,){2}\s*(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\s*|(?:\s*(?:100|0?\d{1,2})%\s*,){2}\s*(?:100|0?\d{1,2})%\s*)\)|hsl\(\s*(?:180|1[0-7]\d|0?\d{1,2})\s*,\s*(?:100|0?\d{1,2})%\s*,\s*(?:100|0?\d{1,2})%\s*\)|black|silver|gr[ae]y|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|blanchedalmond|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgr[ae]y|darkgreen|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategr[ae]y|darkturquoise|darkviolet|deeppink|deepskyblue|dimgr[ae]y|dodgerblue|firebrick|floralwhite|forestgreen|gainsboro|ghostwhite|gold|goldenrod|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgr[ae]y|lightgreen|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategr[ae]y|lightsteelblue|lightyellow|limegreen|linen|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|oldlace|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|skyblue|slateblue|slategr[ae]y|snow|springgreen|steelblue|tan|thistle|tomato|turquoise|violet|wheat|whitesmoke|yellowgreen)$/i;

function tokenize(input) {
	var TOKEN = /\[([bisu]|sub|sup|quote|left|center|right)\]|\[\/([bisu]|sub|sup|color|quote|left|center|right|url)\]|\[(color|quote|url)=(?:"([^"]+)"|(\S*?))\]|:(icon|link)([\w-]+):|:([\w-]+)icon:|(\r?\n?-{5,}\r?\n?)|(\r\n|[\r\n\u2028\u2029])|\((c|r|tm)\)|[^-\r\n\u2028\u2029([:]+|[\S\s]/gi;
	var tokens = [];
	var m;

	while ((m = TOKEN.exec(input))) {
		var token =
			m[1] !== undefined  ? { type: OPEN_TAG, name: m[1].toLowerCase() } :
			m[2] !== undefined  ? { type: CLOSE_TAG, name: m[2].toLowerCase() } :
			m[3] !== undefined  ? { type: OPEN_TAG, name: m[3].toLowerCase(), value: m[4] !== undefined ? m[4] : m[5] } :
			m[6] === 'icon'     ? { type: ICON_AND_USERNAME_LINK, username: m[7] } :
			m[6] === 'link'     ? { type: USERNAME_ONLY_LINK, username: m[7] } :
			m[8] !== undefined  ? { type: ICON_ONLY_LINK, username: m[8] } :
			m[9] !== undefined  ? { type: HORIZONTAL_RULE } :
			m[10] !== undefined ? { type: LINE_BREAK } :
			                      { type: TEXT };

		token.text = m[11] === undefined ? m[0] : symbols[m[11].toLowerCase()];

		tokens.push(token);
	}

	return tokens;
}

function transform(closes, token, startNode, endNode) {
	var name = closes.token.name;

	switch (name) {
		case 'b':
		case 'i':
		case 'u':
		case 's':
		case 'sub':
		case 'sup':
			startNode.text = '<' + name + '>';
			endNode.text = '</' + name + '>';
			return true;

		case 'left':
		case 'center':
		case 'right':
			startNode.text = '<div class="align-' + name + '">';
			endNode.text = '</div>';
			return true;

		case 'quote':
			startNode.text = '<blockquote>';

			var quotes = closes.token.value;

			if (quotes) {
				startNode.text += '<header><cite>' + escapeContent(quotes) + '</cite> wrote:</header> ';
			}

			endNode.text = '</blockquote>';
			return true;

		case 'url':
			var info = linkInfo(closes.token.value);

			if (info.allowed) {
				// TODO: rel="nofollow noreferrer" on external links if URIs ever become private
				startNode.text = '<a href="' + escapeAttributeValue(closes.token.value) + (info.internal ? '">' : '" rel="nofollow">');
				endNode.text = '</a>';
				return true;
			}

			endNode.text = token.text;
			return false;

		case 'color':
			var colour = closes.token.value.trim();
			var m = CSS3_OPAQUE_COLOUR.exec(colour);

			if (m) {
				if (m[1] !== undefined) {
					colour = '#' + m[1];
				}

				startNode.text = '<span style="color: ' + colour + ';">';
				endNode.text = '</span>';
				return true;
			}

			endNode.text = token.text;
			return false;
	}
}

function render(input) {
	var tokens = tokenize(input);
	var openTags = [];
	var openTagNames = [];
	var top = null;

	function push(text) {
		top = { text: text, next: top, prev: null };

		if (top.next) {
			top.next.prev = top;
		}
	}

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];

		switch (token.type) {
			case TEXT:
				push(escapeContent(token.text));
				break;

			case OPEN_TAG:
				push(escapeContent(token.text));
				openTags.push({ token: token, node: top, closedOverBy: [] });
				openTagNames.push(token.name);
				break;

			case CLOSE_TAG:
				var closesIndex = openTagNames.lastIndexOf(token.name);

				if (closesIndex === -1) {
					push(token.text);
					break;
				}

				var closes = openTags[closesIndex];
				openTagNames.splice(closesIndex, 1);
				openTags.splice(closesIndex, 1);

				transform(closes, token, closes.node, top = { text: null, next: top });
				top.next.prev = top;

				var j;

				for (j = closesIndex; j < openTags.length; j++) {
					openTags[j].closedOverBy.push(top);
				}

				for (j = 0; j < closes.closedOverBy.length; j++) {
					var closedOverBy = closes.closedOverBy[j];
					var newClosingNode = { text: null, next: closedOverBy.next };
					var newOpeningNode = { text: null, next: closedOverBy };

					if (transform(closes, {}, newOpeningNode, newClosingNode)) {
						closedOverBy.next = newClosingNode;
						closedOverBy.prev.next = newOpeningNode;
						closedOverBy.prev = newOpeningNode;

						// Turn references to closedOverBy into its next node without changing the effective linked list
						var originalNext = closedOverBy.next;
						closedOverBy.next = closedOverBy.next.next;
						closedOverBy.next.prev = closedOverBy;
						closedOverBy.prev = closedOverBy.prev.next = {
							text: closedOverBy.text,
							next: closedOverBy,
							prev: closedOverBy.prev
						};
						closedOverBy.text = originalNext.text;
					}
				}

				break;

			case ICON_AND_USERNAME_LINK:
				push(
					'<a href="/users/' + token.username + '/">' +
					'<img src="/users/' + token.username + '/image"> ' +
					token.username + '</a>'
				);

				break;

			case USERNAME_ONLY_LINK:
				push('<a href="/users/' + token.username + '/">' + token.username + '</a>');
				break;

			case ICON_ONLY_LINK:
				push(
					'<a href="/users/' + token.username + '/">' +
					'<img src="/users/' + token.username + '/image">' +
					'</a>'
				);

				break;

			case HORIZONTAL_RULE:
				push('<hr>');
				break;

			case LINE_BREAK:
				// TODO: Turn two consecutive line breaks into a paragraph break with other line breaks in between,
				//       unless it’s U+2028. U+2029 should also become (remain) a paragraph break.
				push('<br>');
				break;

			default:
				throw new Error('Unrecognized token type: ' + token.type);
		}
	}

	var result = [];

	while (top) {
		result.unshift(top.text);
		top = top.next;
	}

	return result.join('');
}

module.exports.render = render;

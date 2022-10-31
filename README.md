# Web Technology Lookup
Find out what websites are built with. Know your prospects platform before you talk to them. Improve your conversions with validated market adoption.

## Input
Can be any combination of website URLs:
```
{
    "startUrls": [
        { "url": "https://www.apify.com" }
    ]
}
```

## Output
Framework details, i.e.
```
[
	{
		"url": "https://www.apify.com/",
		"name": "Sentry",
		"description": "Sentry is an open-source platform for workflow productivity, aggregating errors from across the stack in real time.",
		"confidence": 100,
		"website": "https://sentry.io/",
		"categories": [
			"Issue trackers"
		]
	},
	{
		"url": "https://www.apify.com/",
		"name": "Algolia",
		"description": "Algolia offers a hosted web search product delivering real-time results.",
		"confidence": 100,
		"website": "http://www.algolia.com",
		"categories": [
			"Search engines"
		]
	}
]
```
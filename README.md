# http.client
An HTTP client wrapped around Axios

## How to use examples

```js
var requests = [
	httpClient.get('/api/v1/endpoint1'),
	httpClient.get('/api/v1/endpoint2')
];

httpClient.all(requests)
	.then(httpClient.spread(function (response1, response2) {
		console.log(response1);
		console.log(response2);
	}))
	.catch(function (error) {
		console.log(error);
		cancelRequests();
	});

function cancelRequests() {
	requests.forEach(function (request) {
		request.cancel();
	});
}
```

---------------------------------------------------------------------------------

```js
var request = httpClient.get/delete/head/options(
	'/api/v1/endpoint',
	{
		parmas: {
			id: '1234567890'
		}
	}
)
.then(function (response) {
	console.log(response);
})
.catch(function (error) {
	console.log(error);
});

// can be cancelled before request finishes
request.cancel();
```

---------------------------------------------------------------------------------

```js
var request = httpClient.post/put/patch(
	'/api/v1/endpoint',
	new URLSearchParams(new FormData(document.getElementById('my-form-id'))),
	{
		params: {
			id: '1234567890'
		}
	}
)
.then(function (response) {
	console.log(response);
})
.catch(function (error) {
	console.log(error);
});

// can be cancelled before request finishes
request.cancel();
```

---------------------------------------------------------------------------------

```js
var polling = httpClient.poll(
	'/api/v1/endpoint',
	{
		method: 'get', // method; get or post. get is default
		minTimeout: 1000, // starting value for the timeout in milliseconds
		maxTimeout: 64000, // maximum length of time between requests
		multiplier: 2, // if set to 2, timerInterval will double each time the response hasn't changed (up to maxTimeout)
		maxCalls: 0, // maximum number of calls. 0 = no limit
		autoStop: 0, // automatically stop requests after this many returns of the same data. 0 = disabled
		runAtOnce: true, // whether to fire initially or wait
		data: null // hash of values to be passed to the page - e.g. { name: "John", greeting: "hello" } or function or null
	},
	function (response) {
		console.log(response);
		// to cancel polling
		polling.cancel();
	},
	function (error) {
		console.log(error);
		// to cancel polling
		polling.cancel();
	}
);

// can be cancelled
polling.cancel();
```

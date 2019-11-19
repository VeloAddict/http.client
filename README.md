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
	});
```

---------------------------------------------------------------------------------

```js
// if one of the requests fails, you can cancel the remaining requests
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
var request = httpClient.post/put/patch(
	'/api/v1/endpoint',
	{
		inputName: inputValue
	},
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
// detecting if the request was cancelled
var request = httpClient.get/delete/head/options('/api/v1/endpoint')
	.then(function (response) {

	}).
	.catch(function (error) {
		// check if the request was cancelled
		if (httpClient.isCancel(error)) {
			// do something if the request was cancelled
		}
	});

// cancel the request
request.cancel();
```

---------------------------------------------------------------------------------

```js
// polling with degradation, if the request is the same then the next request will be delayed by multiplier
// polling can be cancelled or restarted anytime after it was created
var polling = httpClient.poll(
	'/api/v1/endpoint',
	{
		method: 'get', // GET/POST/PUT/DELETE; default: GET
		minTimeout: 1000, // starting value for the timeout in milliseconds; default: 1000 (1 second)
		maxTimeout: 64000, // maximum length of time between requests; default: 64000 (1 minute)
		multiplier: 2, // if set to 2, timerInterval will double each time the response hasn't changed (up to maxTimeout); default: 2
		maxCalls: 0, // maximum number of calls. 0 = no limit; default: 0
		autoStop: 0, // automatically stop requests after this many returns of the same data. 0 = disabled; default: 0
		runAtOnce: true, // whether to fire initially or wait for minTimeout; default: true
		data: null // data to be passed to the request - e.g. { name: "John", greeting: "hello" } or function or null; default: null
	},
	function (response) {
		console.log(response);
		// to cancel polling
		polling.cancel();

		// restart will reset the timeouts and start again the polling
		polling.restart();
	},
	function (error) {
		console.log(error);
		// to cancel polling
		polling.cancel();

		// restart will reset the timeouts and start again the polling
		polling.restart();
	}
);

// can be cancelled
polling.cancel();

// restart will reset the timeouts and start again the polling
polling.restart();
```

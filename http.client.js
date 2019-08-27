define(['axios', 'qs', 'url-search-params-polyfill', 'form-data-polyfill'], function (axios, qs) {
	patchPromise();
	var instance = axios.create({
		baseURL: '/',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			'X-Requested-With': 'XMLHttpRequest'
		}
	});
	
	var httpClient = {
		request: function () { return build('request', ...arguments); },
		get: function () { return build('get', ...arguments); },
		delete: function () { return build('delete', ...arguments); },
		head: function () { return build('head', ...arguments); },
		options: function () { return build('options', ...arguments); },
		post: function () { return build('post', ...arguments); },
		put: function () { return build('put', ...arguments); },
		patch: function () { return build('patch', ...arguments); },
		poll: poll,
		all: axios.all,
		spread: axios.spread,
		isCancel: axios.isCancel
	};
	
	function build() {
		var call = axios.CancelToken.source();
		var config = {
			cancelToken: call.token
		};
		var promise = makePromise(...arguments);
		promise.axiosCancelTokenSource = call;
		return promise;
		
		function makePromise(type) {
			switch (type) {
				case 'request':
					Object.assign(config, arguments[1]);
					return instance[type](config);
				case 'get':
				case 'delete':
				case 'head':
				case 'options':
					Object.assign(config, arguments[2]);
					return instance[type](arguments[1], config);
				case 'post':
				case 'put':
				case 'patch':
					Object.assign(config, arguments[3]);
					return instance[type](arguments[1], arguments[2], config);
			}
		}
	}
	
	function poll(url, config, successCallback, failureCallback) {
		var defaults = {
			method: 'get',     // method; get or post
			data: null,        // hash of values to be passed to the page - e.g. { name: "John", greeting: "hello" } or function
			minTimeout: 1000,  // starting value for the timeout in milliseconds
			maxTimeout: 64000, // maximum length of time between requests
			multiplier: 2,     // if set to 2, timerInterval will double each time the response hasn't changed (up to maxTimeout)
			maxCalls: 0,       // maximum number of calls. 0 = no limit
			autoStop: 0,       // automatically stop requests after this many returns of the same data. 0 = disabled
			runAtOnce: false   // whether to fire initially or wait
		};
		var call = axios.CancelToken.source();
		config = Object.assign({}, defaults, config);
		successCallback = successCallback || function () {};
		failureCallback = failureCallback || function () {};
		
		var method = config.method.toLowerCase();
		var previousData = null;
		var timer = null;
		var timerInterval = config.minTimeout;
		var maxCalls = config.maxCalls;
		var autoStop = config.autoStop;
		var calls = 0;
		var noChange = 0;
		
		if (config.runAtOnce) {
			makeRequest();
		} else {
			timer = setTimeout(makeRequest, timerInterval);
		}
		
		function makeRequest() {
			var data = (typeof config.data == 'function' ? config.data() : config.data);
			instance({
				method: method,
				url,
				params: (method == 'get' ? data : null),
				data: (method != 'get' ? qs.stringify(data) : null),
				cancelToken: call.token
			})
				.then(function (response) {
					handleSuccessResponse(response);
					successCallback(response);
				})
				.catch(function (error) {
					handleErrorResponse(error);
					failureCallback(error);
				});
			
			function handleSuccessResponse(response) {
				calls++;
				if (maxCalls > 0 && calls == maxCalls) {
					stop('Max of ' + maxCalls + ' calls reached. Polling stopped.');
					return;
				}
				
				if (previousData === JSON.stringify(response.data)) {
					if (config.multiplier > 1) {
						timerInterval = timerInterval * config.multiplier;
					}
					if (timerInterval > config.maxTimeout) {
						timerInterval = config.maxTimeout;
					}
					
					if (autoStop > 0) {
						noChange++;
						if (noChange >= autoStop) {
							stop('Max of ' + autoStop + ' calls with the same response reached. Polling auto stopped.');
							return;
						}
					}
				}
				
				previousData = JSON.stringify(response.data);
				timer = setTimeout(makeRequest, timerInterval);
			}
			
			function handleErrorResponse(error) {
				if (httpClient.isCancel(error)) {
					return;
				}
				stop();
				timer = setTimeout(makeRequest, timerInterval);
			}
		}
		
		function stop(message) {
			if (message) {
				console.log(message);
			}
			if (timer != null) {
				clearTimeout(timer);
				timer = null;
			}
			previousData = null;
			timer = null;
			timerInterval = config.minTimeout;
			maxCalls = config.maxCalls;
			autoStop = config.autoStop;
			calls = 0;
			noChange = 0;
		}
		
		function restart(message) {
			stop(message);
			makeRequest();
		}
		
		function cancel(message) {
			stop(message);
			call.cancel('Request cancelled');
		}
		
		return {
			restart: restart,
			cancel: cancel
		};
	}
	
	function patchPromise() {
		var originalThen = Promise.prototype.then;
		var originalCatch = Promise.prototype.catch;
		var originalFinally = Promise.prototype.finally;
		
		Promise.prototype.then = function () {
			var response = originalThen.apply(this, arguments);
			if (this.axiosCancelTokenSource) {
				response.axiosCancelTokenSource = this.axiosCancelTokenSource;
			}
			return response;
		};
		
		Promise.prototype.catch = function () {
			var response = originalCatch.apply(this, arguments);
			if (this.axiosCancelTokenSource) {
				response.axiosCancelTokenSource = this.axiosCancelTokenSource;
			}
			return response;
		};
		
		Promise.prototype.finally = function () {
			var response = originalFinally.apply(this, arguments);
			if (this.axiosCancelTokenSource) {
				response.axiosCancelTokenSource = this.axiosCancelTokenSource;
			}
			return response;
		};
		
		Promise.prototype.cancel = function (message) {
			if (this.axiosCancelTokenSource) {
				this.axiosCancelTokenSource.cancel(message || 'Request cancelled');
			}
		};
	}
	
	window.httpClient = httpClient;
});

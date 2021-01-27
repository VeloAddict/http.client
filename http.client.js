define([
	'axios'
], function (
	axios
) {
	patchPromise();
	var instance = axios.create({
		baseURL: '/',
		headers: {}
	});
	
	var httpClient = {
		request: (...rest) => { return build('request', ...rest); },
		get: (...rest) => { return build('get', ...rest); },
		delete: (...rest) => { return build('delete', ...rest); },
		head: (...rest) => { return build('head', ...rest); },
		options: (...rest) => { return build('options', ...rest); },
		post: (...rest) => { return build('post', ...rest); },
		put: (...rest) => { return build('put', ...rest); },
		patch: (...rest) => { return build('patch', ...rest); },
		poll: poll,
		all: axios.all,
		spread: axios.spread,
		isCancel: axios.isCancel
	};

	
	function build(...rest) {
		var call = axios.CancelToken.source();
		var config = {
			cancelToken: call.token
		};
		var promise = makePromise(...rest);
		promise.axiosCancelTokenSource = call;
		return promise;
		
		function makePromise(type) {
			switch (type) {
				case 'request':
					Object.assign(config, rest[1]);
					return instance[type](config);
				case 'get':
				case 'delete':
				case 'head':
				case 'options':
					Object.assign(config, rest[2]);
					return instance[type](rest[1], config);
				case 'post':
				case 'put':
				case 'patch':
					Object.assign(config, rest[3]);
					return instance[type](rest[1], rest[2], config);
			}
		}
	}
	
	function poll(url, config, successCallback, failureCallback) {
		var defaults = {
			headers: {},
			params: {},        // hash of values to be passed to the page - e.g. { name: "John", greeting: "hello" } or function
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
			var headers = (typeof config.headers == 'function' ? config.headers() : config.headers);
			var params = (typeof config.params == 'function' ? config.params() : config.params);

			instance({
				method: 'get',
				url,
				headers: headers,
				params: params,
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
		
		Promise.prototype.then = function (...rest) {
			var response = originalThen.apply(this, rest);
			if (this.axiosCancelTokenSource) {
				response.axiosCancelTokenSource = this.axiosCancelTokenSource;
			}
			return response;
		};
		
		Promise.prototype.catch = function (...rest) {
			var response = originalCatch.apply(this, rest);
			if (this.axiosCancelTokenSource) {
				response.axiosCancelTokenSource = this.axiosCancelTokenSource;
			}
			return response;
		};
		
		Promise.prototype.finally = function (...rest) {
			var response = originalFinally.apply(this, rest);
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

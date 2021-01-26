import * as axios from 'axios';

patchPromise();

let isRedirecting = false;
let instance = axios.create({
	baseURL: '/',
	headers: {
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'X-Requested-With': 'XMLHttpRequest'
	}
});

instance.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		console.log(error);
		return Promise.reject(error);
	}
);

let httpClient = {
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

function build() {
	let call = axios.CancelToken.source();
	let config = {
		cancelToken: call.token
	};
	let promise = makePromise(...arguments);
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
	let defaults = {
		headers: {},
		params: {},        // hash of values to be passed to the page - e.g. { name: "John", greeting: "hello" } or function
		minTimeout: 1000,  // starting value for the timeout in milliseconds
		maxTimeout: 64000, // maximum length of time between requests
		multiplier: 2,     // if set to 2, timerInterval will double each time the response hasn't changed (up to maxTimeout)
		maxCalls: 0,       // maximum number of calls. 0 = no limit
		autoStop: 0,       // automatically stop requests after this many returns of the same data. 0 = disabled
		runAtOnce: false   // whether to fire initially or wait
	};
	let call = axios.CancelToken.source();
	config = Object.assign({}, defaults, config);
	successCallback = successCallback || function () {};
	failureCallback = failureCallback || function () {};
	
	let previousData = null;
	let timer = null;
	let timerInterval = config.minTimeout;
	let maxCalls = config.maxCalls;
	let autoStop = config.autoStop;
	let calls = 0;
	let noChange = 0;
	
	if (config.runAtOnce) {
		makeRequest();
	} else {
		timer = setTimeout(makeRequest, timerInterval);
	}
	
	function makeRequest() {
		let headers = (typeof config.headers == 'function' ? config.headers() : config.headers);
		let params = (typeof config.params == 'function' ? config.params() : config.params);
		instance({
			method: 'get',
			url,
			headers: headers,
			params: params,
			cancelToken: call.token
		})
			.then((response) => {
				handleSuccessResponse(response);
				successCallback(response);
			})
			.catch((error) => {
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
			stop(error);
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
	let originalThen = Promise.prototype.then;
	let originalCatch = Promise.prototype.catch;
	let originalFinally = Promise.prototype.finally;
	
	Promise.prototype.then = function () {
		let response = originalThen.apply(this, arguments);
		if (this.axiosCancelTokenSource) {
			response.axiosCancelTokenSource = this.axiosCancelTokenSource;
		}
		return response;
	};
	
	Promise.prototype.catch = function () {
		let response = originalCatch.apply(this, arguments);
		if (this.axiosCancelTokenSource) {
			response.axiosCancelTokenSource = this.axiosCancelTokenSource;
		}
		return response;
	};
	
	Promise.prototype.finally = function () {
		let response = originalFinally.apply(this, arguments);
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

/**
 * A simple subscriber module.
 * @params dbOptions {object} - Connection options.
 * @returns {object}
 * @constructor
 */
var Subscriber = function (dbOptions) {
	'use strict';
	var q = require('q');
	var url = require('url');
	var uid = require('uid-safe').sync;
	var mongojs = require('mongojs');

	var _settings = {
		collectionName: "subscribers",
		hostname: "localhost",
		port: 27017,
		pathname: "/subscribers"
	};

	for(var prop in dbOptions) {
		if(dbOptions.hasOwnProperty(prop)) {
			_settings[prop] = dbOptions[prop];
		}
	}

	var _Subscriber = Object.create(null);

	var connectionString = url.format(_settings);
	if(connectionString.indexOf('//') == 0) connectionString = connectionString.slice(2); /* ignore `//` */
	var db = mongojs(connectionString, [_settings.collectionName]);
	var collection = db.collection(_settings.collectionName);



	_Subscriber.subscribe = function (email, keywords, type) {

		var defered = q.defer();

		var subscriber = {
			id: uid(18),
			confirmationID: uid(18),
			email: email,
			keyworsd: keywords,
			type: type,
			confirmed: false
		};

		collection.insert(subscriber, function (err) {
			if(err) {
				defered.reject(err);
			} else {
				defered.resolve({
					email: email,
					subscriberId: subscriber.id
				});
			}
		});

		return defered.promise;
	};

	_Subscriber.unsubscribe = function (id) {
		var defered = q.defer();

		collection.remove({id: id}, true, function (err, status) {
			if(err) {
				defered.reject(err);
			} else {
				defered.resolve(status.n == 1);
			}
		});

		return defered.promise;
	};

	_Subscriber.listSubscribers = function () {
		var defered = q.defer();

		var query = {};
		var projectionSettings = {
			_id: false,
			email: true,
			id: true,
			keywords: true
		};

		collection.find(query, projectionSettings, function (err, data) {
			if(err) {
				defered.reject(err);
			} else {
				defered.resolve(data);
			}
		});

		return defered.promise;
	};

	return _Subscriber;

};

module.exports = Subscriber;
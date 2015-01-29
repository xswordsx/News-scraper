/**
 * A simple subscriber module.
 * @params dbOptions {object} - Connection options.
 * @returns {object}
 * @constructor
 */
var Subscriber = function (dbOptions, mailOptions) {
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

	var _mailSettings = {
		email: 'lorem@ipsum.org',
		host: 'ipsum.org',
		port: 465,
		secure: true,
		tls: {
			rejectUnauthorized: false
		},
		auth: {
			user: 'lorem',
			pass: 'ipsum'
		}
	};

	for(var prop in mailOptions) {
		if(mailOptions.hasOwnProperty(prop)) {
			_mailSettings[prop] = mailOptions[prop];
		}
	}

	var nodemailer = require('nodemailer');
	var mailer = nodemailer.createTransport(_mailSettings);

	var _Subscriber = Object.create(null);

	var connectionString = url.format(_settings);
	if(connectionString.indexOf('//') == 0) connectionString = connectionString.slice(2); /* ignore `//` */
	var db = mongojs(connectionString, [_settings.collectionName]);
	var collection = db.collection(_settings.collectionName);



	_Subscriber.subscribe = function (email, keywords, type, confirmURL) {

		if(typeof confirmURL !== 'function') {
			confirmURL = function(id) { return "http://localhost/confirm/" + id; }
		}

		var defered = q.defer();

		var subscriber = {
			id: uid(18),
			confirmationID: uid(18),
			email: email,
			keywords: keywords.map(function(keyword){ return keyword.trim().toLowerCase() }).sort(function (a, b) { return a - b; }),
			type: type,
			confirmed: false
		};

		collection.insert(subscriber, function (err) {
			if(err) {
				defered.reject(err);
			} else {
				var message = {
					from: 'HackerNews Scraper <' + _mailSettings.email + '>',
					to: email,
					subject: '[Confirm email]',
					text: [
						"Hello,",
						"you have been subscribed for the following HackerNews items:",
						"Item types: " + type.join(', '),
						"Keywords: " + keywords.join(', '),
						'\n',
						'If this data is correct, please confirm your email, by visiting: ',
						confirmURL(subscriber.confirmationID),
						'\n',
						'Otherwise, please ignore this email.'
					].join('\n')
				};

				mailer.sendMail(message, function (err) {
					if(err) {
						//defered.reject("Could not send confirmation email to: " + email);
						defered.reject(err);
						collection.remove({id: subscriber.id}, true);
					} else {
						defered.resolve({
							email: email,
							subscriberId: subscriber.id
						});
					}
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

	_Subscriber.confirm = function (email, confirmationId) {

		var defered = q.defer();

		collection.findAndModify({
			query: {id: confirmationId, email: email},
			update: {
				$set: {confirmed: true},
				$unset: {confirmationID: ""}
			}
		}, function (err, doc, lastErrorLog) {
			if(err || lastErrorLog) {
				defered.reject(err || lastErrorLog);
			} else if(!doc) {
				defered.reject('Cannot confirm for email: ' + email);
			} else {
				defered.resolve(doc.id);
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
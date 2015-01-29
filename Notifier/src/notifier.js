/**
 *
 * @returns {object}
 * @constructor
 */
var Notifier = function (dbOptions, mailOptions) {
	'use strict';
	var q = require('q');
	var url = require('url');
	var http = require('http');
	var _ = require('underscore');
	var mongojs = require('mongojs');

	var _settings = {
		subscribersCollectionName: "subscribers",
		newsCollectionName: "news",
		hostname: "localhost",
		port: 27017,
		pathname: "/scraper"
	};
	//Overwrite default settings
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
	//Overwrite default mail settings
	for(var prop in mailOptions) {
		if(mailOptions.hasOwnProperty(prop)) {
			_mailSettings[prop] = mailOptions[prop];
		}
	}

	var nodemailer = require('nodemailer');
	var mailer = nodemailer.createTransport(_mailSettings);

	var connectionString = url.format(_settings);
	if(connectionString.indexOf('//') == 0) connectionString = connectionString.slice(2); /* ignore `//` */

	var db = mongojs(connectionString, [_settings.subscribersCollectionName, _settings.newsCollectionName]);

	var subscribersCollection = db.collection(_settings.subscribersCollectionName);
	var newsCollection = db.collection(_settings.newsCollectionName);


	var _Notifier = Object.create(null);


	var _sendEmail = function(email, comments, stories, keywords, mailer, unsubscribeURL) {
		var emailText = "You have " +
			comments.length + " new comments and " +
			stories.length + " new stories to read.\n\n";

		emailText += 'Keywords matched: ' + keywords + '\n\n';

		comments.forEach(function (comment) {
			emailText += 'COMMENT: ' + comment.text + '\n';
			emailText += 'BY: ' + comment.by + '\n';
			emailText += 'FROM STORY: ' + comment.storyUrl + '\n';
			emailText += '\n---------------------------\n';
		});

		if(stories.length > 0) {
			emailText += '\n\n===========================\n\n';
		}

		stories.forEach(function (story) {
			emailText += 'STORY: ' + story.title + '\n';
			emailText += 'BY: ' + story.by + '\n';
			emailText += 'URL: ' + story.url + '\n';
			emailText += '\n\n\n';
			emailText += story.text;
			emailText += '\n---------------------------\n';
		});

		emailText += '\n\n\nIf you wish to not receive these messages, please visit: ';
		emailText += unsubscribeURL + '\n';

		mailer.sendMail({
			from: "HackerNews Scraper <" + _mailSettings.email + ">",
			to: email,
			subject: "[New HackerNews stories/comments]",
			text: emailText
		}, function(err, success){/*ignore for now*/});
	};

	var _sendEmails = function(subscribers, news, mailer, unsubscribeURL) {

		if(typeof unsubscribeURL !== 'function') {
			unsubscribeURL = function(id) { return 'http://localhost/unsubscribe/' + id; }
		}

		var comments = news.filter(function(news) {return news.type == 'comment'});
		var stories = news.filter(function(news) {return news.type == 'story'});

		for(var i = 0; i < subscribers.length; i ++) {

			var subscriber = subscribers[i];

			var keywordsFound = [];
			var newsToSend = {
				comments: [],
				stories: []
			};

			var subscribedFor = subscriber.type.join('');

			if(subscribedFor.indexOf('comment') !== -1) {
				for(var j = 0; j < comments.length; j++) {
					var comment = comments[j];
					var keywordsMatch = subscriber.keywords.filter(function(keyword) {
						return comment.text.toLowerCase().indexOf(keyword) !== -1
					});
					if(keywordsMatch.length > 0) {
						keywordsFound = keywordsFound.concat(keywordsMatch);
						newsToSend.comments.push(comment);
					}
				}
			}

			if(subscribedFor.indexOf('story') !== -1) {
				for(var j = 0; j < stories.length; j++) {
					var story = stories[j];
					var keywordsMatch = subscriber.keywords.filter(function(keyword) {
						return ( story.text.toLowerCase() + ' ' + story.title.toLowerCase() ).indexOf(keyword) !== -1;
					});
					if(keywordsMatch.length > 0) {
						keywordsFound = keywordsFound.concat(keywordsMatch);
						newsToSend.stories.push(story);
					}
				}
			}

			var keywords = _.uniq(keywordsFound).join(', ');

			_sendEmail(subscriber.email, newsToSend.comments, newsToSend.stories, keywords, mailer, unsubscribeURL(subscriber.id));

		}
	};

	
	_Notifier.notify = function (from) {
		var subscribers = q.defer();
		var news = q.defer();

		var notified = q.defer();

		subscribersCollection.find({confirmed: true}, function(err, subsDocs) {
			if (err) {
				subscribers.reject(err);
			} else {
				subscribers.resolve(subsDocs);
			}
		});

		newsCollection.find({id: {$gt: from}}, function(err, newsDocs) {
			if(err) {
				news.reject(err);
			} else {
				news.resolve(newsDocs);
			}
		});

		q.all([subscribers.promise, news.promise]).then(
			function(result) {
				_sendEmails(result[0], result[1], mailer, undefined);
			},
			function(failReason) {
				notified.reject(failReason);
			}
		);

		return notified.promise;

	};


	return _Notifier;

};

module.exports = Notifier;
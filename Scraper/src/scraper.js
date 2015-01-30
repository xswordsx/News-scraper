/**
 *
 * @returns {object}
 * @constructor
 */
var Scraper = function (settings) {

	'use strict';
	var request = require('request');
	var url = require('url');
	var q = require('q');

	var _settings = {
		collectionName: "news",
		hostname: "localhost",
		port: 27017,
		pathname: "/scraper"
	};

	var _lastItem = Number.POSITIVE_INFINITY;
	//Overwrite default settings
	for(var prop in settings) {
		if(settings.hasOwnProperty(prop)) {
			_settings[prop] = settings[prop];
		}
	}

	var _scrapeUp = function(id) {
		var defered = q.defer();
		request.get(_queryString + 'item/' + id + '.json', {}, function(err, res, body) {
			if(err || res.statusCode !== 200) {
				defered.reject(err);
			} else {
				var news = JSON.parse(body);
				if(news.type == 'story') {
					defered.resolve(news);
				} else {
					_scrapeUp(news.parent).then(defered.resolve, defered.reject);
				}
			}

		});
		return defered.promise;
	};

	var _queryString = 'https://hacker-news.firebaseio.com/v0/';
	var _Scraper = Object.create(null);

	_Scraper.initMaxItem = function () {
		var defered = q.defer();

		request.get('https://hacker-news.firebaseio.com/v0/maxitem.json', {}, function(err, response, body){
			if(err || response.statusCode !== 200) {
				defered.reject(err);
			} else {
				_lastItem = Number(body);
				defered.resolve(_lastItem);
			}
		});

		return defered.promise;
	};

	_Scraper.scrape = function () {

		var defered = q.defer();


		request.get(_queryString + 'maxitem.json',{} , function(error, response, body){
			if(error || response.statusCode !== 200) {
				defered.reject(error);
			} else {
				if(!_lastItem) {
					_lastItem = Number(body);
				} else {
					var newMax = Number(body);
					var deferedList = [];
					for(var i = _lastItem ; i < newMax; i++) {
						deferedList.push(q.defer());
					}
					var promiseList = deferedList.map(function(d) {return d.promise});
					deferedList.forEach(function(promise, index) {
						request.get(_queryString + 'item/' + (index + _lastItem) + '.json', function(err, res, body) {
							if(err || res.statusCode !== 200) {
								promise.reject(err);
							} else {
								var news = JSON.parse(body);
								if(news.type == 'story') {
									promise.resolve(news);
								} else {
									_scrapeUp(news.parent).then(function(story){
										news.storyUrl = story.url;
										defered.resolve(news);
									})
								}
							}
						});
					});
					_lastItem = newMax;
					q.all(promiseList).then(function(news) {
						defered.resolve(news);
					},
						defered.reject
					);
				}
			}
		});

		return defered.promise;
	};

	return _Scraper;
};

module.exports = Scraper;

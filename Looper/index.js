var express = require('express');
var app = express();
var url = require('url');
var mongojs = require('mongojs');
var bodyParser = require('body-parser');

var settings = require('./config');

var Notifer = require('../Notifier/index');
var Subscriber = require('../Subscriber/index');
var Scraper = require('../Scraper/index');

var notifierSettings = require('../Notifier/config');
var subscriberSettings = require('../Subscriber/config');
var scraperSettings = require('../Scraper/config');

var notifier = Notifer(notifierSettings.db, notifierSettings.mailer);
var scraper = Scraper(scraperSettings.db);
var subscriber = Subscriber(subscriberSettings.db, subscriberSettings.mailer);

var connectionString = url.format(settings.db);
if(connectionString.indexOf('//') == 0)
	connectionString = connectionString.slice(2); /* ignore `//` */
var db = mongojs(connectionString, [settings.db.collectionName]);
var collection = db.collection(settings.db.collectionName);

var asyncLoop = function() {
	console.log('Scraping HackerNews...');
	scraper.scrape().then(
		function(news) {
			console.log('Scraped and got: ', JSON.stringify(news, undefined, 2));
			collection.insert(news, function(err, success) {
				if(!err) {
					sortedNews = news.sort(function(a, b) {return a.id - b.id});
					notifier.notify(sortedNews[0].id);
				}
			});
		},
		function(error) {
			console.log("Unable to scrape: ", error && error.code);
		}
	);
};

var asyncPid;

var jsonBody = bodyParser.json();

app.get('/listSubscribers', function(req, res) {
	subscriber.listSubscribers().then(
		res.json.bind(res),
		function(fail){
			res.status(500).end(fail);
		});
});

app.get('/confirm/:id/:confirmId', function(req, res) {
	subscriber.confirm(req.params.id, req.params.confirmId).then(
		function (pass) {
			res.status(200).end('Your subscribtion was successfully confirmed.');
		}, function(fail){
			res.status(500).end(fail);
		}
	)
});

app.post('/subscribe', jsonBody, function (req, res) {
	var testEmail = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i;
	var testType = /(comment)|(story)/i;
	if(testEmail.test(req.body.email) == false) {
		res.status(500).end('Invalid email');
		return;
	}
	if(req.body.type.reduce(testType.test) == false) {
		req.status(500).end('Invalid news type');
		return;
	}
	subscriber.subscribe(req.body.email, req.body.keywords, req.body.type).then(
		res.json.bind(res),
		function(fail) {
			res.status(500).end("There was an error, subscribing email " + req.body.email);
		});
});

app.post('/unsubscribe/:unsubscribeID', jsonBody, function (req, res) {
	subscriber.unsubscribe(req.params.unsubscribeID).then(
		function(success) {
			res.status(200).end('You were successfuly unsubscribed.');
		}, function(fail) {
			res.status(500).end('Something went wrong: ' + JSON.stringify(fail));
		}
	)
});

app.listen(settings.app.port, undefined, function() {
	scraper.initMaxItem().then(
		function() {
			asyncPid = setInterval(asyncLoop, 1 * 1000 * 60 * 2);
		},
		function(error) {
			console.error("unable to retrieve maxItem: ", error.code);
			process.exit(2);
		});

	console.log("Looper listening on port", settings.app.port);
});

process.on('exit', function() {
	clearInterval(asyncPid);
});
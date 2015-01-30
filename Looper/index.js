var express = require('express');
var app = express();
var url = require('url');
var mongojs = require('mongojs');
var bodyParser = require('body-parser');

var settings = require('./config');

var Notifer = require('../Notifier/index');
var Subscriber = require('../Subscriber/index');
var Scraper = require('../Scraper/index');

var notifer = Notifer();
var scraper = Scraper();
var subscriber = Subscriber();

var connectionString = url.format(settings.db);
if(connectionString.indexOf('//') == 0)
	connectionString = connectionString.slice(2); /* ignore `//` */
var db = mongojs(connectionString, [settings.db.collectionName]);
var collection = db.collection(settings.db.collectionName);

var asyncLoop = function() {
	scraper.scrape().then(function(news) {
		collection.insert(news, function(err, success) {
			if(!err) {
				sortedNews = news.sort(function(a, b) {return a.id - b.id});
				notifer.notify(sortedNews[0].id);
			}
		});
	});
};

app.use('/subscribe', bodyParser);
app.use('/unsubscribe', bodyParser);

app.get('/listSubscribers', function(req, res) {
	subscriber.listSubscribers().then(
		res.json.bind(res),
		function(fail){
			res.status(500).end(fail);
		});
});

app.post('/subscribe', function(req, res) {
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
	subscriber.subscribe(req.body.email, req.body.keywords, req.body.type).then(res.json.bind(res));
});

app.post('/unsubscribe/:unsubscribeID', function(req, res) {
	subscriber.unsubscribe(req.params.unsubscribeID).then(
		function(success) {
			res.status(200).end('You were successfuly unsubscribed.');
		}, function(fail) {
			res.status(500).end('Something went wrong: ' + JSON.stringify(fail));
		}
	)
});

app.listen(settings.app.port, undefined, function() {
	console.log("Looper listening on port", settings.app.port);
});
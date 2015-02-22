var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

var expect = chai.expect;

var q = require('q');

var Subscriber = require(require('path').resolve('src/subscriber.js'));
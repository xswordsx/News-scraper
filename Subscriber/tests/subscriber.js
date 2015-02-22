describe('Subscriber', function () {

	var subscriber = Subscriber();

	describe('#subscribe(email, keywords, type, confirmURL)', function () {
		it("should return a promise with `email` and `subscriberId`", function () {
			var subscribePromise = subscriber.subscribe("lorem@ipsum", ["lorem, ipsum"], ["comment", "story"]);

			expect(subscribePromise).to.eventually.have.property("email");
			expect(subscribePromise).to.eventually.have.property("subscriberId");
			subscribePromise.then(function(done){
				expect(done.email).to.be("test@home");
			});
		});

		xit("should reject the promise if an error occurs", function() {});
	});

	describe('#unsubscribe(id)', function () {
		var subscribePromise;

		before(function() {
			subscribePromise = subscriber.subscribe("lorem@ipsum", ["lorem, ipsum"], ["comment", "story"]);
		});

		it("should return a promise", function () {
			expect(subscribePromise).to.be.a.promise;
		});

		it("should resolve the promise if the operation was successful", function() {
			subscribePromise.then(function(data) {
				var unsubscribe = subscriber.unsubscribe(data.id);
				expect(unsubscribe).to.eventually.be.resolved;
			});
		});

		it("should reject the promise if there was an error(bad ID)", function() {
			subscribePromise.then(function(data) {
				var unsubscribe = subscriber.unsubscribe(data.id + "not_gonna_work");
				expect(unsubscribe).to.eventually.be.rejected;
			});
		});

	});

	describe('#listSubscribers()', function () {

		var list = subscriber.listSubscribers();

		it("should return a promise", function () {
			expect(list).to.be.a.promise;
		});

		it("should resolve an array", function() {
			expect(list).to.eventually.be.an.array;
		});


		it("elements should have id, email and keywords ", function() {
			list.then(function(data) {
				assert(data.length > 0);
				expect(data[0]).to.have.property('id');
				expect(data[0]).to.have.property('email');
				expect(data[0]).to.have.property('keywords');
			});
		});
	});

	describe('#confirm(id, confirmationId)', function() {

		xit("should return a promise", function() {});

		xit("should resolve on correct data", function() {});

		xit("should reject on invalid or missmatching data", function() {});

	});
});
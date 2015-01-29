module.exports = function(grunt) {

	// Add the grunt-mocha-test tasks.
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-contrib-concat');

	grunt.initConfig({
		concat: {
			options: {
				separator: '\n'
			},
			tests: {
				src: ['tests/setup.js', 'tests/subscriber.js'],
				dest: 'build/subscriber.spec.js'
			}
		},
		// Configure a mochaTest task
		mochaTest: {
			test: {
				options: {
					reporter: 'spec'
				},
				src: ['build/*.spec.js', 'build/*.test.js']
			}
		}
	});

	grunt.registerTask('build-tests', 'concat:tests');
	grunt.registerTask('test', 'mochaTest');
	grunt.registerTask('build-n-test', ['build-tests', 'test']);

};
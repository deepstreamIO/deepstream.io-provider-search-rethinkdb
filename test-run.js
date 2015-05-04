var Provider = require( './src/provider' ),
	provider = new Provider({
		logLevel: 0,
		// deepstream
		deepstreamUrl: 'localhost:6021',
		deepstreamCredentials: { username: 'rethinkdb-search-provider' },

		// rethinkdb
		rethinkdbConnectionParams: {
			host: '192.168.56.101',
			port: 28015,
			db: 'deepstream'
		}
	});
	
	provider.start();
// require( './test/create-test-table' )(function(){
// 	console.log( 'All done' );
// 	process.exit();
// });
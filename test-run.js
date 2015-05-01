var Provider = require( './src/provider' ),
	provider = new Provider({

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
	

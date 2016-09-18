var createTestTable = require( './create-test-table' ),
	connectionParams = require( './connection-params' ),
	Provider = require( '../../src/provider' ),
	DeepstreamClient = require( 'deepstream.io-client-js' ),
	ds;


exports.createTestTable = function( done ) {
	createTestTable( done );
};

exports.startProvider = function( done ) {
	var provider = new Provider({
		logLevel: 0,
		listName: 'search',
		deepstreamUrl: connectionParams.deepstreamUrl,
		deepstreamCredentials: connectionParams.deepstreamCredentials,
		rethinkdbConnectionParams: connectionParams.rethinkdb
	});

	provider.on( 'ready', function(){
		done( provider );
	});

	provider.start();
};

exports.connectToDeepstream = function( done ) {
	var ds = new DeepstreamClient( connectionParams.deepstreamUrl );
	ds.on('error', function(message) {
		done(new Error(arguments[1]))
	})
	ds.login( { username: 'testClient' }, function( success ){
		if( !success ) {
			done(new Error( 'Could not connect' ));
		} else {
			done( null, ds );
		}
	});
};

exports.cleanUp = function( provider, deepstream, done ) {
	provider.stop();
	setTimeout( () => {
		deepstream.close();
		done();
	}, 100 );
};

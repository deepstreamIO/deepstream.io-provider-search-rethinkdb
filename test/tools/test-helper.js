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
	ds.login( { username: 'testClient' }, function( success ){
		if( !success ) {
			console.log( arguments );
			throw new Error( 'Could not connect' );
		} else {
			done( ds );
		}
	});
};

exports.cleanUp = function( provider, deepstream, done ) {
	provider.stop();
	deepstream.close();
	done();
};
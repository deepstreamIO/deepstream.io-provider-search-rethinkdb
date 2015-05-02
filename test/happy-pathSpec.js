var createTestTable = require( './create-test-table' ),
	connectionParams = require( './connection-params' ),
	Provider = require( '../src/provider' ),
	DeepstreamClient = require( 'deepstream.io-client-js' ),
	ds;


describe( 'the provider allows for the searching of table', function(){
	var provider;

	it( 'creates the test table', function( done ){
		createTestTable( done );
	});

	it( 'starts the provider', function( done ){
		provider = new Provider({
			listName: 'search',
			deepstreamUrl: connectionParams.deepstreamUrl,
			deepstreamCredentials: connectionParams.deepstreamCredentials,
			rethinkdbConnectionParams: connectionParams.rethinkdb
		});

		provider.on( 'ready', done );
		provider.start();
	});

	it( 'establishes a connection to deepstream', function( done ){
		ds = new DeepstreamClient( connectionParams.deepstreamUrl );
		ds.login( { username: 'testClient' }, function( success ){
			if( !success ) {
				console.log( arguments );
				throw new Error( 'Could not connect' );
			} else {
				done();
			}
		})
	});

	it( 'can retrieve records from the table', function( done ){
		var record = ds.record.getRecord( connectionParams.testTable + '/lor' );
		record.whenReady(function(){
			expect( record.get( 'title' ).toBe( 'The Lord of the Ring' ) );
			done();
		});
	});
});
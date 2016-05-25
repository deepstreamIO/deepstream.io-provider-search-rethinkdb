var testHelper = require( './tools/test-helper' ),
	connectionParams = require( './tools/connection-params' );
	Deepstream = require( 'deepstream.io' ),
	RethinkDBStorageConnector = require( 'deepstream.io-storage-rethinkdb' ),
	server = null;

function _done(done, error) {
	if (done == null) {
		return console.error(new Error('no done callback was passed'))
	}
	if (error) {
		done.fail(error)
	}
	done()
}

describe( 'the provider allows for the searching of table', function(){
	var provider,
		ds,
		spanishBooks,
		spanishBooksCallback = jasmine.createSpy( 'spanishBooksCallback' );

	beforeAll(function(done){
		testHelper.createTestTable( _done.bind(null, done) );
	});

	beforeAll(function(done) {
    server = new Deepstream();
		server.set( 'storage', new RethinkDBStorageConnector( {
			host: connectionParams.rethinkdb.host,
			port: connectionParams.rethinkdb.port,
			database: connectionParams.rethinkdb.db,
			defaultTable: connectionParams.testTable
		}));
		server.set( 'storageExclusion', /^search.*/ );
		server.set( 'showLogo', false);
		// TODO: if you know how to disable the logger, feel free...
		server.on('started', done)
		server.start();
	})

	afterAll(function() {
		server.stop();
	})

	it( 'starts the provider', function( done ){
		testHelper.startProvider(function( _provider ){
			provider = _provider;
			done();
		});
	});

	it( 'establishes a connection to deepstream', function( done ){
		testHelper.connectToDeepstream(function( err, _ds ){
			ds = _ds;
			_done(done, err);
		});
	});

	it( 'can retrieve records from the table', function( done ){
		var record = ds.record.getRecord( 'lor' );
		record.whenReady(function(){
			expect( record.get( 'title' ) ).toBe( 'The Lord of the Rings' );
			done();
		});
	});

	it( 'issues a simple search for books in spanish and finds Don Quixote', function( done ){
		var query = JSON.stringify({
			table: connectionParams.testTable,
			query: [[ 'language', 'eq', 'Spanish' ]]
		});
		spanishBooks = ds.record.getList( 'search?' + query );
		spanishBooks.subscribe( spanishBooksCallback );

		setTimeout(function(){
			expect( spanishBooksCallback ).toHaveBeenCalledWith([ 'don' ]);
			done();
		}, 100);
	});

	it( 'inserts a new spanish book and the search gets notified', function( done ){
		ds.record.getRecord( 'ohy' ).set({
			title: 'Cien años de soledad',
			author:	'Gabriel García Márquez',
			language: 'Spanish',
			released: 1967,
			copiesSold: 50000000
		});

		setTimeout(function(){
			expect( spanishBooksCallback ).toHaveBeenCalledWith([ 'don', 'ohy' ]);
			done();
		}, 100);
	});

	it( 'unsubscribes', function(){
		spanishBooks.unsubscribe( spanishBooksCallback );
	});

	it( 'issues a search for all books published between 1700 and 1950', function( done ){
		var query = JSON.stringify({
			table: connectionParams.testTable,
			query: [
				[ 'released', 'gt', 1700 ],
				[ 'released', 'lt', 1950 ]
			]
		});
		var olderBooks = ds.record.getList( 'search?' + query );
		olderBooks.subscribe(function( entries ){
			if( entries.length > 0 ) {
				expect( entries ).toEqual([ 'tct', 'tlp' ]);
				done();
			} else {
				done.fail('no entries found')
			}
		});
	});

	it( 'cleans up', function( done ){
		ds.record.getRecord( 'ohy' ).delete();
		testHelper.cleanUp( provider, ds, done );
	});

});

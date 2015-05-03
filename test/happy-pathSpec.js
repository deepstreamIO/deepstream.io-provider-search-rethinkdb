var testHelper = require( './tools/test-helper' ),
	connectionParams = require( './tools/connection-params' );


describe( 'the provider allows for the searching of table', function(){
	var provider,
		ds,
		spanishBooks,
		spanishBooksCallback = jasmine.createSpy( 'spanishBooksCallback' );

	it( 'creates the test table', function( done ){
		testHelper.createTestTable( done );
	});

	it( 'starts the provider', function( done ){
		testHelper.startProvider(function( _provider ){
			provider = _provider;
			done();
		});
	});

	it( 'establishes a connection to deepstream', function( done ){
		testHelper.connectToDeepstream(function( _ds ){
			ds = _ds;
			done();
		});
	});

	it( 'can retrieve records from the table', function( done ){
		var record = ds.record.getRecord( connectionParams.testTable + '/lor' );
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
		ds.record.getRecord( connectionParams.testTable + '/ohy' ).set({
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
			}
		});
	});

	it( 'cleans up', function( done ){
		ds.record.getRecord( connectionParams.testTable + '/ohy' ).delete();
		testHelper.cleanUp( provider, ds, done );
	});
});
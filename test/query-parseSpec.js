var QueryParser = require( '../src/query-parser' ),
	log = jasmine.createSpy( 'log' ),
	queryParser = new QueryParser({ log: log });

describe( 'queries are parsed correctly', function(){

	it( 'parses queries with a single condition correctly', function(){
		var parsedInput = queryParser.parseInput( 'search?{"table":"books","query":[["name","eq","Harry Potter"]]}' );

		expect( parsedInput ).toEqual({
			table: 'books',
			query: [[ 'name', 'eq', 'Harry Potter' ]]
		});

		expect( log ).not.toHaveBeenCalled();
	});

	it( 'parses queries with multiple conditions correctly', function(){
		var parsedInput = queryParser.parseInput( 'search?{"table":"books","query":[["name","eq","Harry Potter"],["price","gt",12.3],["publisher","match",".*random.*"]]}' );

		expect( parsedInput ).toEqual({
			table: 'books',
			query: [
				[ 'name', 'eq', 'Harry Potter' ],
				[ 'price', 'gt', 12.3 ],
				[ 'publisher', 'match', '.*random.*' ]
			]
		});

		expect( log ).not.toHaveBeenCalled();
	});

	it( 'errors for missing question marks', function(){
		var parsedInput = queryParser.parseInput( 'search{"table":"books","query":[["name","eq","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( log ).toHaveBeenCalledWith( 'QUERY ERROR | Missing ?', 1 );
	});

	it( 'errors for invalid JSON', function(){
		var parsedInput = queryParser.parseInput( 'search?{"table":"books""query":[["name","eq","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( log ).toHaveBeenCalledWith( 'QUERY ERROR | Invalid JSON', 1 );
	});

	it( 'errors for missing table parameter', function(){
		var parsedInput = queryParser.parseInput( 'search?{"query":[["name","eq","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( log ).toHaveBeenCalledWith( 'QUERY ERROR | Missing parameter "table"', 1 );
	});

	it( 'errors for missing query parameter', function(){
		var parsedInput = queryParser.parseInput( 'search?{"table":"books"}' );
		expect( parsedInput ).toBe( null );
		expect( log ).toHaveBeenCalledWith( 'QUERY ERROR | Missing parameter "query"', 1 );
	});

	it( 'errors for malformed query', function(){
		var parsedInput = queryParser.parseInput( 'search?{"table":"books","query":[["eq","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( log ).toHaveBeenCalledWith( 'QUERY ERROR | Too few parameters', 1 );
	});

	it( 'errors for unknown operator', function(){
		var parsedInput = queryParser.parseInput( 'search?{"table":"books","query":[["name","ex","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( log ).toHaveBeenCalledWith( 'QUERY ERROR | Unknown operator ex', 1 );
	});
});
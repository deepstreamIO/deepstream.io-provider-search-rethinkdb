var Provider = require( '../src/provider' ),
	provider = new Provider({});

provider._log = jasmine.createSpy( 'provider._log' );

describe( 'queries are parsed correctly', function(){

	it( 'parses queries with a single condition correctly', function(){
		var parsedInput = provider._parseInput( 'search?{"table":"books","query":[["name","eq","Harry Potter"]]}' );
		
		expect( parsedInput ).toEqual({
			table: 'books',
			query: [[ 'name', 'eq', 'Harry Potter' ]]
		});

		expect( provider._log ).not.toHaveBeenCalled();
	});

	it( 'parses queries with multiple conditions correctly', function(){
		var parsedInput = provider._parseInput( 'search?{"table":"books","query":[["name","eq","Harry Potter"],["price","gt",12.3],["publisher","match",".*random.*"]]}' );
		
		expect( parsedInput ).toEqual({
			table: 'books',
			query: [
				[ 'name', 'eq', 'Harry Potter' ],
				[ 'price', 'gt', 12.3 ],
				[ 'publisher', 'match', '.*random.*' ]
			]
		});

		expect( provider._log ).not.toHaveBeenCalled();
	});

	it( 'errors for missing question marks', function(){
		var parsedInput = provider._parseInput( 'search{"table":"books","query":[["name","eq","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( provider._log ).toHaveBeenCalledWith( 'QUERY ERROR | Missing ?' );
	});

	it( 'errors for invalid JSON', function(){
		var parsedInput = provider._parseInput( 'search?{"table":"books""query":[["name","eq","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( provider._log ).toHaveBeenCalledWith( 'QUERY ERROR | Invalid JSON' );
	});

	it( 'errors for missing table parameter', function(){
		var parsedInput = provider._parseInput( 'search?{"query":[["name","eq","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( provider._log ).toHaveBeenCalledWith( 'QUERY ERROR | Missing parameter "table"' );
	});

	it( 'errors for missing query parameter', function(){
		var parsedInput = provider._parseInput( 'search?{"table":"books"}' );
		expect( parsedInput ).toBe( null );
		expect( provider._log ).toHaveBeenCalledWith( 'QUERY ERROR | Missing parameter "query"' );
	});	

	it( 'errors for malformed query', function(){
		var parsedInput = provider._parseInput( 'search?{"table":"books","query":[["eq","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( provider._log ).toHaveBeenCalledWith( 'QUERY ERROR | Too few parameters' );
	});

	it( 'errors for unknown operator', function(){
		var parsedInput = provider._parseInput( 'search?{"table":"books","query":[["name","ex","Harry Potter"]]}' );
		expect( parsedInput ).toBe( null );
		expect( provider._log ).toHaveBeenCalledWith( 'QUERY ERROR | Unknown operator ex' );
	});
});
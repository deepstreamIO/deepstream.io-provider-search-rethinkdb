var QueryParser = require( '../src/query-parser' ),
	queryParser = new QueryParser({ log: function(){} }),
	getFilter = function( queryJson ) {
		var searchString = 'search?' + JSON.stringify( queryJson),
			query = queryParser.createQuery( queryParser.parseInput( searchString ) );

		return query.filter.toString();
	};

describe( 'the provider creates the correct filter for each query', function(){
	
	it( 'creates the right filter for a query with one condition', function(){
		var filterString = getFilter({
			table: 'someTable',
			query: [[ 'title', 'eq', 'Don Quixote' ] ]
		});
		expect( filterString ).toBe( 'r.row("_d")("title").eq("Don Quixote")' );
	});

	it( 'creates the right filter for a query with multiple conditions', function(){
		var filterString = getFilter({
			table: 'someTable',
			query: [
				[ 'title', 'eq', 'Don Quixote' ],
				[ 'released', 'gt', 1700 ],
				[ 'author', 'match', '.*eg' ]
			]
		});

		expect( filterString ).toBe(  'r.row("_d")("title").eq("Don Quixote").and(r.row("_d")("released").gt(1700)).and(r.row("_d")("author").match(".*eg"))' );
	});
});
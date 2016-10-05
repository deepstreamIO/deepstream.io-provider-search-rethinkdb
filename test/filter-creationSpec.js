const expect = require('chai').expect
const QueryParser = require( '../src/query-parser' )
const queryParser = new QueryParser({ log: () => {} })

function getFilter( queryJson ) {
  var searchString = 'search?' + JSON.stringify( queryJson)
  var query = queryParser.createQuery( queryParser.parseInput( searchString ) )
  return query.toString()
}

describe.only( 'the provider creates the correct filter for each query', () => {

  it( 'creates the right filter for a query with one condition', () => {
    var filterString = getFilter({
      table: 'someTable',
      query: [[ 'title', 'eq', 'Don Quixote' ] ]
    })
    expect( filterString ).to.equal( 'r.table("someTable").filter(r.row("title").eq("Don Quixote"))' )
  })

  it( 'creates a filter for a query for nested fields', () => {
    var filterString = getFilter({
      table: 'someTable',
      query: [[ 'features.frontdoor', 'eq', 'Don Quixote' ] ]
    })
    expect( filterString ).to.equal( 'r.table("someTable").filter(r.row("features")("frontdoor").eq("Don Quixote"))' )
  })

  it( 'creates a filter for a query with deeply nested fields', () => {
    var filterString = getFilter({
      table: 'someTable',
      query: [[ 'a.c[2].e', 'eq', 'Don Quixote' ] ]
    })
    expect( filterString ).to.equal( 'r.table("someTable").filter(r.row("a")("c")("2")("e").eq("Don Quixote"))' )
  })

  it( 'creates the right filter for a query with multiple conditions', () => {
    var filterString = getFilter({
      table: 'someTable',
      query: [
        [ 'title', 'eq', 'Don Quixote' ],
        [ 'released', 'gt', 1700 ],
        [ 'author', 'match', '.*eg' ]
      ]
    })

    expect( filterString ).to.equal(
      'r.table("someTable").filter(r.row("title").eq("Don Quixote")).filter(r.row("released").gt(1700)).filter(r.row("author").match(".*eg"))'
    )
  })
})

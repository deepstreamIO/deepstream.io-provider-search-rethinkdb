const expect = require('chai').expect
const QueryParser = require( '../src/query-parser' )
const queryParser = new QueryParser({ log: () => {} })

function getFilter( queryJson ) {
  var searchString = 'search?' + JSON.stringify( queryJson)
  var query = queryParser.createQuery( queryParser.parseInput( searchString ) )
  return query.toString()
}

describe( 'the provider creates the correct filter for each query', () => {

  it( 'creates the right filter for a query with no conditions', () => {
    expect( getFilter({ table: 'someTable', query: [] }) ).to.equal( 'r.table("someTable")' );
  })

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
  
  it( 'creates the right filter for a query with a question mark', () => {
    var filterString = getFilter({
      table: 'someTable',
      query: [[ 'artist', 'eq', '? and the Mysterians' ] ]
    })
    expect( filterString ).to.equal( 'r.table("someTable").filter(r.row("artist").eq("? and the Mysterians"))' )

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

  it( 'creates the right filter for a query with ge/le', () => {
    var filterString = getFilter({
      table: 'someTable',
      query: [
        [ 'released', 'ge', 1700 ],
        [ 'released', 'le', 1800 ],
      ]
    })

    expect( filterString ).to.equal(
      'r.table("someTable").filter(r.row("released").ge(1700)).filter(r.row("released").le(1800))'
    )
  })

  it( 'creates the right filter for a query with in', () => {
    var filterString = getFilter({
      table: 'someTable',
      query: [[ 'released', 'in', [1706, 1708, 1869] ]]
    })
    expect( filterString ).to.match( /^r.table\("someTable"\)\.filter\(function\(var_(\d+)\) { return r\(\[1706, 1708, 1869\]\)\.contains\(var_\1\("released"\)\); }\)$/ )
  })

})

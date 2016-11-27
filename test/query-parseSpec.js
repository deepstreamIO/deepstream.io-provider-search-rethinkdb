const expect = require('chai').expect
const sinon = require( 'sinon' )
const sinonChai = require("sinon-chai")
require('chai').use(sinonChai)

const QueryParser = require( '../src/query-parser' )
const log = sinon.spy()
const queryParser = new QueryParser({ log: (log) })

describe( 'the query parser', () => {

  it( 'parses queries with a single condition correctly', () => {
    var query = {
      table: 'books',
      query: [[ 'name', 'eq', 'Harry Potter' ]]
    }
    var parsedInput = queryParser.parseInput( 'search?' + JSON.stringify(query) )

    expect( parsedInput ).to.deep.equal( query )
    expect( log ).to.have.not.been.called
  })

  it( 'parses queries with multiple conditions correctly', () => {
    var query = {
      table: 'books',
      query: [
        [ 'name', 'eq', 'Harry Potter' ],
        [ 'price', 'gt', 12.3 ],
        [ 'publisher', 'match', '.*random.*' ]
      ]
    }
    var parsedInput = queryParser.parseInput( 'search?' + JSON.stringify(query) )

    expect( parsedInput ).to.deep.equal( query )
    expect( log ).to.have.not.been.called
  })

  it( 'errors for missing question marks', () => {
    var parsedInput = queryParser.parseInput( 'search{"table":"books","query":[["name","eq","Harry Potter"]]}' )
    expect( parsedInput ).to.equal( null )
    expect( log ).to.have.been.calledWith( 'QUERY ERROR | Missing ?', 1 )
  })

  it( 'errors for invalid JSON', () => {
    var parsedInput = queryParser.parseInput( 'search?{"table":"books""query":[["name","eq","Harry Potter"]]}' )
    expect( parsedInput ).to.equal( null )
    expect( log ).to.have.been.calledWith( 'QUERY ERROR | Invalid JSON', 1 )
  })

  it( 'errors for missing table parameter', () => {
    var parsedInput = queryParser.parseInput( 'search?{"query":[["name","eq","Harry Potter"]]}' )
    expect( parsedInput ).to.equal( null )
    expect( log ).to.have.been.calledWith( 'QUERY ERROR | Missing parameter "table"', 1 )
  })

  it( 'errors for missing query parameter', () => {
    var parsedInput = queryParser.parseInput( 'search?{"table":"books"}' )
    expect( parsedInput ).to.equal( null )
    expect( log ).to.have.been.calledWith( 'QUERY ERROR | Missing parameter "query"', 1 )
  })

  it( 'errors for order without limit', () => {
    var parsedInput = queryParser.parseInput( 'search?{"table":"books","query":[],"order":"price"}' )
    expect( parsedInput ).to.equal( null )
    expect( log ).to.have.been.calledWith( 'QUERY ERROR | Must specify both "order" and "limit" together', 1 )
  })

  it( 'errors for limit without order', () => {
    var parsedInput = queryParser.parseInput( 'search?{"table":"books","query":[],"limit":1}' )
    expect( parsedInput ).to.equal( null )
    expect( log ).to.have.been.calledWith( 'QUERY ERROR | Must specify both "order" and "limit" together', 1 )
  })

  it( 'errors for malformed query', () => {
    var parsedInput = queryParser.parseInput( 'search?{"table":"books","query":[["eq","Harry Potter"]]}' )
    expect( parsedInput ).to.equal( null )
    expect( log ).to.have.been.calledWith( 'QUERY ERROR | Too few parameters', 1 )
  })

  it( 'errors for unknown operator', () => {
    var parsedInput = queryParser.parseInput( 'search?{"table":"books","query":[["name","ex","Harry Potter"]]}' )
    expect( parsedInput ).to.equal( null )
    expect( log ).to.have.been.calledWith( 'QUERY ERROR | Unknown operator ex', 1 )
  })
})

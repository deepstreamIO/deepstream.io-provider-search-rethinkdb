const expect = require('chai').expect

const testHelper = require( './tools/test-helper' )
const connectionParams = require( './tools/connection-params' )
const Deepstream = require( 'deepstream.io' )
const RethinkDBStorageConnector = require( 'deepstream.io-storage-rethinkdb' )
var server = null

describe( 'the provider allows for the searching of table', () => {
  var provider
  var ds
  var spanishBooks

  var spanishBooksQuery = JSON.stringify({
    table: connectionParams.testTable,
    query: [[ 'language', 'eq', 'Spanish' ]]
  })

  before((done) => {
    testHelper.createTestTable( done )
  })

  before((done) => {
    server = new Deepstream()
    server.set( 'storage', new RethinkDBStorageConnector( {
      host: connectionParams.rethinkdb.host,
      port: connectionParams.rethinkdb.port,
      database: connectionParams.rethinkdb.db,
      defaultTable: connectionParams.testTable
    }))
    server.set( 'storageExclusion', /^search.*/ )
    server.set( 'tcpPort', 7071)
    server.set( 'showLogo', false)
    server.set( 'logger', {
      setLogLevel: function() {},
      log: function() {},
      isReady: true
    } )
    server.on('started', () => {
      setTimeout( done, 200 )
    })
    server.start()
  })

  after( (done) => {
    server.on('stopped', done )
    server.stop()
  })

  it( 'starts the provider', ( done ) => {
    testHelper.startProvider(( _provider ) => {
      provider = _provider
      done()
    })
  })

  it( 'establishes a connection to deepstream', ( done ) => {
    testHelper.connectToDeepstream(( err, _ds ) => {
      ds = _ds
      done( err )
    })
  })

  it( 'can retrieve records from the table', ( done ) => {
    var record = ds.record.getRecord( 'lor' )
    record.whenReady(() => {
      expect( record.get( 'title' ) ).to.equal( 'The Lord of the Rings' )
      done()
    })
  })

  it( 'issues a simple search for books in spanish and finds Don Quixote', ( done ) => {
    var subscription = (arg) => {
      expect( arg ).to.deep.equal([ 'don' ])
      spanishBooks.unsubscribe( subscription )
      spanishBooks.discard()
      setTimeout( done, 500 )
    }
    spanishBooks = ds.record.getList( 'search?' + spanishBooksQuery )
    spanishBooks.subscribe( subscription )
  })

/*  it( 'inserts a new spanish book and the search gets notified', ( done ) => {
    ds.record.getRecord( 'ohy' ).set({
      title: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      language: 'Spanish',
      released: 1967,
      copiesSold: 50000000
    })
    var subscription = (arg) => {
      expect( arg ).to.deep.equal([ 'don', 'ohy' ])
      spanishBooks.unsubscribe( subscription )
      done()
    }
    spanishBooks = ds.record.getList( 'search?' + spanishBooksQuery )
    spanishBooks.subscribe( subscription )
  })

  it( 'issues a search for all books published between 1700 and 1950', ( done ) => {
    var query = JSON.stringify({
      table: connectionParams.testTable,
      query: [
        [ 'released', 'gt', 1700 ],
        [ 'released', 'lt', 1950 ]
      ]
    })
    var olderBooks = ds.record.getList( 'search?' + query )
    olderBooks.subscribe(( entries ) => {
      if( entries.length > 0 ) {
        expect( entries ).to.deep.equal([ 'tct', 'tlp' ])
        done()
      } else {
        done.fail('no entries found')
      }
    })
  })

  it( 'cleans up', ( done ) => {
    ds.record.getRecord( 'ohy' ).delete()
    testHelper.cleanUp( provider, ds, done )
  })*/

})

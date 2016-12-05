const expect = require('chai').expect

const testHelper = require( './tools/test-helper' )
const connectionParams = require( './tools/connection-params' )
const Deepstream = require( 'deepstream.io' )
const RethinkDBStorageConnector = require( 'deepstream.io-storage-rethinkdb' )
var server = null

describe( 'the provider', () => {
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
    server.set( 'port', 7071)
    server.set( 'showLogo', false)
    server.set( 'logger', {
      setLogLevel: function() {},
      log: function() {},
      isReady: true
    } )
    server.on('started', () => {
      done()
    })
    server.start()
  })

  after( (done) => {
    server.on('stopped', done )
    server.stop()
  })

  it( 'starts', ( done ) => {
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

  it( 'issues a simple search for books in Spanish and finds Don Quixote', ( done ) => {
    var subscription = (arg) => {
      expect( arg ).to.deep.equal([ 'don' ])
      spanishBooks.unsubscribe( subscription )
      spanishBooks.discard()
      done()
    }
    spanishBooks = ds.record.getList( 'search?' + spanishBooksQuery )
    spanishBooks.subscribe( subscription )
  })

  it( 'inserts a new Spanish book and the search gets notified', ( done ) => {
    ds.record.getRecord( 'ohy' ).set({
      title: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      language: 'Spanish',
      released: 1967,
      copiesSold: 50000000
    })

    var update = false;
    var subscription = (arg) => {
      if( !update ) {
        expect( arg ).to.deep.equal([ 'don' ])
        update = true
        return
      }

      expect( arg ).to.deep.equal([ 'don', 'ohy' ])
      spanishBooks.unsubscribe( subscription )
      spanishBooks.discard()
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
    var subscription = ( entries ) => {
      expect( entries ).to.deep.equal([ 'tct', 'tlp' ])
      olderBooks.unsubscribe( subscription )
      olderBooks.discard()
      done()
    }
    var olderBooks = ds.record.getList( 'search?' + query )
    olderBooks.subscribe( subscription )
  })

  // TODO: it correctly handles an order field without an index

  it( 'issues a search for the most recent book', ( done ) => {
    var query = JSON.stringify({
      table: connectionParams.testTable,
      query: [],
      order: 'released',
      desc: true,
      limit: 1
    })

    var update = false;
    var subscription = ( arg ) => {
      if( !update ) {
        expect( arg ).to.deep.equal([ 'hrp' ])
        update = true

        ds.record.getRecord( 'twl' ).set({
          title: 'Twilight',
          author: 'Stephanie Meyer',
          language: 'English',
          released: 2005,
          copiesSold: 47000000
        })

        return
      }

      expect( arg ).to.deep.equal([ 'twl' ])
      recentBook.unsubscribe( subscription )
      recentBook.discard()
      done()
    }
    var recentBook = ds.record.getList( 'search?' + query )
    recentBook.subscribe( subscription )
  });

  it( 'cleans up', ( done ) => {
    ds.record.getRecord( 'ohy' ).delete()
    ds.record.getRecord( 'twl' ).delete()
    testHelper.cleanUp( provider, ds, done )
  })

})

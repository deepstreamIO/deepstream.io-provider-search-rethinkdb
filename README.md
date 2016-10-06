# deepstream.io-provider-search-rethinkdb

[![Build Status](https://travis-ci.org/deepstreamIO/deepstream.io-provider-search-rethinkdb.svg?branch=master)](https://travis-ci.org/deepstreamIO/deepstream.io-provider-search-rethinkdb)
[![Coverage Status](https://coveralls.io/repos/github/deepstreamIO/deepstream.io-provider-search-rethinkdb/badge.svg?branch=master)](https://coveralls.io/github/deepstreamIO/deepstream.io-provider-search-rethinkdb?branch=master)
[![npm](https://img.shields.io/npm/v/deepstream.io-provider-search-rethinkdb.svg)](https://www.npmjs.com/package/deepstream.io-provider-search-rethinkdb)
[![Dependency Status](https://david-dm.org/deepstreamIO/deepstream.io-provider-search-rethinkdb.svg)](https://david-dm.org/deepstreamIO/deepstream.io-provider-search-rethinkdb)
[![devDependency Status](https://david-dm.org/deepstreamIO/deepstream.io-provider-search-rethinkdb/dev-status.svg)](https://david-dm.org/deepstreamIO/deepstream.io-provider-search-rethinkdb#info=devDependencies)


Adds realtime search functionality to deepstream when used in conjunction with RethinkDb.

Say you've got a number of records like:

```js
ds.record.getRecord( 'book/i95ny80q-2bph9txxqxg' ).set({
	'title': 'Harry Potter and the goblet of fire',
	'price': 9.99
});
```

and use [deepstream.io's RethinkDb storage connector](https://github.com/deepstreamIO/deepstream.io-storage-rethinkdb) with:

```js
{ splitChar: '/' }
```

you can now search for Harry Potter books that cost less than 15.30 like this:

```js
var queryString = JSON.stringify({
	table: 'book',
    	query: [
    		[ 'title', 'match', '^Harry Potter.*' ],
        [ 'price', 'lt', 15.30 ],
        [ 'author.lastname', 'eq', 'Rowling' ] //nested paths work too
    	]
});
ds.record.getList( 'search?' + queryString );
```

and the best thing is: it's in realtime. Whenever a record that matches the search criteria is added or removed, the list will be updated accordingly.


Configuration
--------------------------------
Install the provider via npm and configure it to connect to both deepstream and RethinkDb

```js
var SearchProvider = require( './src/provider' );

var searchProvider = new SearchProvider({
  //optional, defaults to 'search'
  listName: 'search',

  /**
   * Only use 0 or 1 for production!

   * 0 = logging off
   * 1 = only log connection events & errors
   * 2 = also log subscriptions and discards
   * 3 = log outgoing messages
   */
  logLevel: 3,

  // deepstream
  deepstreamUrl: 'localhost:6021',
  deepstreamCredentials: { username: 'rethinkdb-search-provider' },

  // Instead of creating a new connection to deepstream, you can also
  // reuse an existing one by substituting the above with
  deepstreamClient: myDeepstreamClient,

  // rethinkdb
  rethinkdbConnectionParams: {
      host: '192.168.56.101',
      port: 28015,
      db: 'deepstream'
  },

  //optional primary key, defaults to ds_id
  primaryKey: 'itemId',

  // Instead of creating a new connection to RethinkDb, you can also
  // reuse an existing one by substituting the above with
  rethinkDbConnection: myRethinkDbConnection
});

// and start it
searchProvider.start();

// it can also be stopped by calling
searchProvider.stop();
```

Searching
---------------------------------
On the client you can now request dynamically populated lists of search results


```js
var queryString = JSON.stringify({
	table: 'book',
    query: [
    	[ 'title', 'match', '^Harry Potter.*' ],
        [ 'price', 'lt', 15.30 ]
    ]
});
ds.record.getList( 'search?' + queryString );
```
query can contain one or more conditions. Each condition is an array of [ field, operator, value ]. Supported operators are:

 * "eq" (equal)
 * "gt" (greater than)
 * "lt" (lesser than)
 * "ne" (not equal)
 * "match" (RegEx match)

Please note that the operators are type-sensitive, so comparing `20` with `"20"` won't yield results

Important!
--------------------------------
Don't forget to delete your search from deepstream once you don't need it anymore, e.g.

```js
bookSearchResults = ds.record.getList( 'search?' + queryString );
// use it
bookSearchResults.delete();
```

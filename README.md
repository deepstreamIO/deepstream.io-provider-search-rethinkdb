deepstream.io-provider-search-rethinkdb
=================================================================

Adds realtime search functionality to deepstream when used in conjunction with RethinkDb. Say you've got a number of records like

```js
ds.record.getRecord( 'book/i95ny80q-2bph9txxqxg' ).set({ 
	'title': 'Harry Potter and the goblet of fire',
    'price': 9.99
});
```


and use [deepstream.io's RethinkDb storage connector](https://github.com/hoxton-one/deepstream.io-storage-rethinkdb) with

```js
{ splitChar: '/' }
```

you can now search for Harry Potter books that cost less than 15.30  like this

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
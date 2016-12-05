## [2.0.0] - 2016-12-5

### Enhancements
- Now using v2.0.0 of the deepstream client
- Queries now support order and limit [#1](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/issues/1) by [@Iiridayn](https://github.com/Iiridayn)

## [1.2.0] - 2016-10-06

### Enhancements
- New config parameter primaryKey [#42](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/issues/42)
- Queries now support nested paths [#44](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/issues/44)
- Queries now support `ge` and `le` [#38](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/issues/38) by [@Iiridayn](https://github.com/Iiridayn)
- Queries now support `Date` [#37](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/issues/37) by [@Iiridayn](https://github.com/Iiridayn)

## [1.1.2] - 2016-09-11

### Enhancement

- Now uses Advanced listening ( v1.1 of the client )

### Bug Fixes

- Fix query string parsing [#6](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/pull/6) by [@alongubkin](https://github.com/alongubkin)
- Subscribing and then deleting crashes server [#22](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/issue/22), [PR #25](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/pull/25) by [@Iiridayn](https://github.com/Iiridayn)
- Cannot get all records on a table with an empty query [#23](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/issue/23), [PR #25](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/pull/25) by [@Iiridayn](https://github.com/Iiridayn)
- Workaround for list record reference until subscription feature is fixed in deepstream [#24](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/issue/24), [PR #25](https://github.com/deepstreamIO/deepstream.io-provider-search-rethinkdb/pull/25) by [@Iiridayn](https://github.com/Iiridayn)

## [1.1.1] - 2016-07-12

### Enhancement

- Now using v1.0.0 of the deepstream client

## [1.1.0] - 2016-07-5

### Enhancement

- Catch errors by subscribing to all error events

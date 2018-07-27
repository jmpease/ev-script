define(function(require) {

    'use strict';

    var BaseModel = require('ev-script/models/base'),
        URI = require('urijs/URI'),
        cacheUtil = require('ev-script/util/cache');

    return BaseModel.extend({
        cacheName: 'playlists',
        collectionKey: 'playlists',
        // initialize: function(attributes, options) {
        //     BaseModel.prototype.initialize.call(this, attributes, options);
        // },
    });

});
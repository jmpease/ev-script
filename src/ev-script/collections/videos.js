define(function(require) {

    'use strict';

    var BaseCollection = require('ev-script/collections/base');

    return BaseCollection.extend({
        initialize: function(models, options) {
            BaseCollection.prototype.initialize.call(this, models, options);
            this.filterOn = options.filterOn || '';
            this.filterValue = options.filterValue || '';
            this.sourceUrl = options.sourceId === 'shared' ? '/api/SharedContent' : '/api/Content';
            this.pageIndex = 1;
        },
        url: function() {
            var api_url = this.config.ensembleUrl + this.sourceUrl;
            var sizeParam = 'PageSize=' + this.config.pageSize;
            var indexParam = 'PageIndex=' + this.pageIndex;
            var onParam = 'FilterOn=' + encodeURIComponent(this.filterOn);
            var valueParam = 'FilterValue=' + encodeURIComponent(this.filterValue);
            var url = api_url + '?' + sizeParam + '&' + indexParam + '&' + onParam + '&' + valueParam;
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        }
    });

});

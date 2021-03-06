define(function(require) {

    'use strict';

    var _ = require('underscore');

    return {
        optionsSixteenByNine: ['1280x720', '1024x576', '848x480', '720x405', '640x360', '610x344', '560x315', '480x270', '400x225', '320x180', '240x135', '160x90'],
        optionsDropbox: ['1280x720', '1024x720', '848x720', '720x920', '640x920', '610x920', '560x920', '480x920', '400x920'],
        getAvailableDimensions: function(type) {
            return type && type === 'dropbox' ?
                this.optionsDropbox :
                this.optionsSixteenByNine;
        },
        findClosestDimension: function(desiredWidth, type) {
            var offset = Number.MAX_VALUE,
                closest;
            // Find the first available or closest dimension that matches our desired width
            var match = _.find(this.getAvailableDimensions(type), _.bind(function(dimension) {
                var width = parseInt(dimension.split('x')[0], 10),
                    currentOffset = Math.abs(width - desiredWidth);
                if (currentOffset < offset) {
                    offset = currentOffset;
                    closest = dimension;
                }
                return currentOffset === 0;
            }, this));
            return match || closest;
        }
    };

});

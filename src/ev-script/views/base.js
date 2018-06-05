define(function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        eventsUtil = require('ev-script/util/events'),
        cacheUtil = require('ev-script/util/cache');

    return Backbone.View.extend({
        initialize: function(options) {
            this.appId = options.appId;
            this.config = cacheUtil.getAppConfig(this.appId);
            this.root = cacheUtil.getAppRoot(this.appId);
            this.auth = cacheUtil.getAppAuth(this.appId);
            this.info = cacheUtil.getAppInfo(this.appId);
            this.appEvents = eventsUtil.getEvents(this.appId);
            this.globalEvents = eventsUtil.getEvents('global');
            this.i18n = cacheUtil.getAppI18n(this.appId);
        },
        ajaxError: function(collection, xhr, options) {
            if (xhr.status === 401) {
                // TODO - add to messages
                window.alert(this.i18n.formatMessage('You are unauthorized to perform this action.'));
                // this.auth.handleUnauthorized(this.el, authCallback);
            } else if (xhr.status === 500) {
                window.alert(this.i18n.formatMessage('It appears there is an issue with the Ensemble Video installation.'));
            } else if (xhr.status === 404) {
                window.alert(this.i18n.formatMessage('Could not find requested resource.  This is likely a problem with the configured Ensemble Video base url.'));
            } else if (xhr.status !== 0) {
                window.alert(this.i18n.formatMessage('An unexpected error occurred.  Check the server log for more details.'));
            }
        },
        unencode: function(encoded) {
            return $('<span/>').html(encoded).text();
        }
    });

});

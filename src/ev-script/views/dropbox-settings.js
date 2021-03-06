define(function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        SettingsView = require('ev-script/views/settings'),
        sizeUtil = require('ev-script/util/size'),
        DropboxSettings = require('ev-script/models/dropbox-settings');

    require('jquery-ui/ui/widgets/dialog');

    return SettingsView.extend({
        template: _.template(require('text!ev-script/templates/dropbox-settings.html')),
        sizesTemplate: _.template(require('text!ev-script/templates/sizes.html')),
        updateModel: function() {
            var attrs = {
                    'embedtype': this.$('#embedtype').val()
                },
                sizeVal = this.$('#size').val(),
                original = sizeVal === 'original',
                type = this.field.model.get('type'),
                defaultWidth = (new DropboxSettings()).get('width'),
                dims;

            if (!sizeVal || original) {
                sizeVal = sizeUtil.findClosestDimension(defaultWidth, type);
            }

            dims = sizeVal.split('x');
            _.extend(attrs, {
                width: parseInt(dims[0], 10),
                height: parseInt(dims[1], 10)
            });

            this.field.model.set(attrs);
        },
        render: function() {
            var width = this.field.model.get('width'),
                sizes = [],
                type = this.field.model.get('type');
            this.$el.html(this.template({
                appInfo: this.info,
                i18n: this.i18n,
                model: this.field.model
            }));

            sizes = sizeUtil.getAvailableDimensions(type);
            this.$('.size').append(this.sizesTemplate({
                sizes: sizes,
                // Select the override or current width
                target: sizeUtil.findClosestDimension(width, type)
            }));

            var content = this.field.model.get('content');
            this.$el.dialog({
                title: this.unencode(content ? content.name : this.field.model.get('id')),
                modal: true,
                autoOpen: false,
                draggable: false,
                resizable: false,
                dialogClass: 'ev-dialog',
                width: Math.min(680, $(window).width() - this.config.dialogMargin),
                height: Math.min(300, $(window).height() - this.config.dialogMargin),
                closeText: this.i18n.formatMessage('Close')
            });
        }
    });

});

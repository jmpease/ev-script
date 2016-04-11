/**
 * ev-script 1.1.0 2016-04-11
 * Ensemble Video Integration Library
 * https://github.com/ensembleVideo/ev-script
 * Copyright (c) 2016 Symphony Video, Inc.
 * Licensed (MIT AND GPL-2.0)
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.  Put jQuery plugins at the end since they don't return any values
        // that are passed to our factory.
        define([
            'jquery',
            'plupload',
            'jquery-ui',
            'jquery.plupload.queue'
        ], factory);
    } else {
        // Browser globals
        root.EV = factory(root.$, root.plupload);
    }
}(this, function ($, plupload) {
/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("bower_components/almond/almond", function(){});

//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

//     Backbone.js 1.2.3

//     (c) 2010-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(factory) {

  // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
  // We use `self` instead of `window` for `WebWorker` support.
  var root = (typeof self == 'object' && self.self == self && self) ||
            (typeof global == 'object' && global.global == global && global);

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define('backbone',['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore'), $;
    try { $ = require('jquery'); } catch(e) {}
    factory(root, exports, _, $);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to a common array method we'll want to use later.
  var slice = Array.prototype.slice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.2.3';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... this will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Proxy Backbone class methods to Underscore functions, wrapping the model's
  // `attributes` object or collection's `models` array behind the scenes.
  //
  // collection.filter(function(model) { return model.get('age') > 10 });
  // collection.each(this.addView);
  //
  // `Function#apply` can be slow so we use the method's arg count, if we know it.
  var addMethod = function(length, method, attribute) {
    switch (length) {
      case 1: return function() {
        return _[method](this[attribute]);
      };
      case 2: return function(value) {
        return _[method](this[attribute], value);
      };
      case 3: return function(iteratee, context) {
        return _[method](this[attribute], cb(iteratee, this), context);
      };
      case 4: return function(iteratee, defaultVal, context) {
        return _[method](this[attribute], cb(iteratee, this), defaultVal, context);
      };
      default: return function() {
        var args = slice.call(arguments);
        args.unshift(this[attribute]);
        return _[method].apply(_, args);
      };
    }
  };
  var addUnderscoreMethods = function(Class, methods, attribute) {
    _.each(methods, function(length, method) {
      if (_[method]) Class.prototype[method] = addMethod(length, method, attribute);
    });
  };

  // Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
  var cb = function(iteratee, instance) {
    if (_.isFunction(iteratee)) return iteratee;
    if (_.isObject(iteratee) && !instance._isModel(iteratee)) return modelMatcher(iteratee);
    if (_.isString(iteratee)) return function(model) { return model.get(iteratee); };
    return iteratee;
  };
  var modelMatcher = function(attrs) {
    var matcher = _.matches(attrs);
    return function(model) {
      return matcher(model.attributes);
    };
  };

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // a custom event channel. You may bind a callback to an event with `on` or
  // remove with `off`; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {};

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Iterates over the standard `event, callback` (as well as the fancy multiple
  // space-separated events `"change blur", callback` and jQuery-style event
  // maps `{event: callback}`).
  var eventsApi = function(iteratee, events, name, callback, opts) {
    var i = 0, names;
    if (name && typeof name === 'object') {
      // Handle event maps.
      if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
      for (names = _.keys(name); i < names.length ; i++) {
        events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
      }
    } else if (name && eventSplitter.test(name)) {
      // Handle space separated event names by delegating them individually.
      for (names = name.split(eventSplitter); i < names.length; i++) {
        events = iteratee(events, names[i], callback, opts);
      }
    } else {
      // Finally, standard events.
      events = iteratee(events, name, callback, opts);
    }
    return events;
  };

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  Events.on = function(name, callback, context) {
    return internalOn(this, name, callback, context);
  };

  // Guard the `listening` argument from the public API.
  var internalOn = function(obj, name, callback, context, listening) {
    obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
        context: context,
        ctx: obj,
        listening: listening
    });

    if (listening) {
      var listeners = obj._listeners || (obj._listeners = {});
      listeners[listening.id] = listening;
    }

    return obj;
  };

  // Inversion-of-control versions of `on`. Tell *this* object to listen to
  // an event in another object... keeping track of what it's listening to
  // for easier unbinding later.
  Events.listenTo =  function(obj, name, callback) {
    if (!obj) return this;
    var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var listening = listeningTo[id];

    // This object is not listening to any other events on `obj` yet.
    // Setup the necessary references to track the listening callbacks.
    if (!listening) {
      var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
      listening = listeningTo[id] = {obj: obj, objId: id, id: thisId, listeningTo: listeningTo, count: 0};
    }

    // Bind callbacks on obj, and keep track of them on listening.
    internalOn(obj, name, callback, this, listening);
    return this;
  };

  // The reducing API that adds a callback to the `events` object.
  var onApi = function(events, name, callback, options) {
    if (callback) {
      var handlers = events[name] || (events[name] = []);
      var context = options.context, ctx = options.ctx, listening = options.listening;
      if (listening) listening.count++;

      handlers.push({ callback: callback, context: context, ctx: context || ctx, listening: listening });
    }
    return events;
  };

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  Events.off =  function(name, callback, context) {
    if (!this._events) return this;
    this._events = eventsApi(offApi, this._events, name, callback, {
        context: context,
        listeners: this._listeners
    });
    return this;
  };

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  Events.stopListening =  function(obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) return this;

    var ids = obj ? [obj._listenId] : _.keys(listeningTo);

    for (var i = 0; i < ids.length; i++) {
      var listening = listeningTo[ids[i]];

      // If listening doesn't exist, this object is not currently
      // listening to obj. Break out early.
      if (!listening) break;

      listening.obj.off(name, callback, this);
    }
    if (_.isEmpty(listeningTo)) this._listeningTo = void 0;

    return this;
  };

  // The reducing API that removes a callback from the `events` object.
  var offApi = function(events, name, callback, options) {
    if (!events) return;

    var i = 0, listening;
    var context = options.context, listeners = options.listeners;

    // Delete all events listeners and "drop" events.
    if (!name && !callback && !context) {
      var ids = _.keys(listeners);
      for (; i < ids.length; i++) {
        listening = listeners[ids[i]];
        delete listeners[listening.id];
        delete listening.listeningTo[listening.objId];
      }
      return;
    }

    var names = name ? [name] : _.keys(events);
    for (; i < names.length; i++) {
      name = names[i];
      var handlers = events[name];

      // Bail out if there are no events stored.
      if (!handlers) break;

      // Replace events if there are any remaining.  Otherwise, clean up.
      var remaining = [];
      for (var j = 0; j < handlers.length; j++) {
        var handler = handlers[j];
        if (
          callback && callback !== handler.callback &&
            callback !== handler.callback._callback ||
              context && context !== handler.context
        ) {
          remaining.push(handler);
        } else {
          listening = handler.listening;
          if (listening && --listening.count === 0) {
            delete listeners[listening.id];
            delete listening.listeningTo[listening.objId];
          }
        }
      }

      // Update tail event if the list has any events.  Otherwise, clean up.
      if (remaining.length) {
        events[name] = remaining;
      } else {
        delete events[name];
      }
    }
    if (_.size(events)) return events;
  };

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, its listener will be removed. If multiple events
  // are passed in using the space-separated syntax, the handler will fire
  // once for each event, not once for a combination of all events.
  Events.once =  function(name, callback, context) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
    return this.on(events, void 0, context);
  };

  // Inversion-of-control versions of `once`.
  Events.listenToOnce =  function(obj, name, callback) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
    return this.listenTo(obj, events);
  };

  // Reduces the event callbacks into a map of `{event: onceWrapper}`.
  // `offer` unbinds the `onceWrapper` after it has been called.
  var onceMap = function(map, name, callback, offer) {
    if (callback) {
      var once = map[name] = _.once(function() {
        offer(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
    }
    return map;
  };

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  Events.trigger =  function(name) {
    if (!this._events) return this;

    var length = Math.max(0, arguments.length - 1);
    var args = Array(length);
    for (var i = 0; i < length; i++) args[i] = arguments[i + 1];

    eventsApi(triggerApi, this._events, name, void 0, args);
    return this;
  };

  // Handles triggering the appropriate event callbacks.
  var triggerApi = function(objEvents, name, cb, args) {
    if (objEvents) {
      var events = objEvents[name];
      var allEvents = objEvents.all;
      if (events && allEvents) allEvents = allEvents.slice();
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, [name].concat(args));
    }
    return objEvents;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId(this.cidPrefix);
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // The prefix is used to create the client id which is used to identify models locally.
    // You may want to override this if you're experiencing name clashes with model ids.
    cidPrefix: 'c',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Special-cased proxy to underscore's `_.matches` method.
    matches: function(attrs) {
      return !!_.iteratee(attrs, this)(this.attributes);
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      var attrs;
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      var unset      = options.unset;
      var silent     = options.silent;
      var changes    = [];
      var changing   = this._changing;
      this._changing = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }

      var current = this.attributes;
      var changed = this.changed;
      var prev    = this._previousAttributes;

      // For each `set` attribute, update or delete the current value.
      for (var attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          changed[attr] = val;
        } else {
          delete changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Update the `id`.
      this.id = this.get(this.idAttribute);

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0; i < changes.length; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      var changed = {};
      for (var attr in diff) {
        var val = diff[attr];
        if (_.isEqual(old[attr], val)) continue;
        changed[attr] = val;
      }
      return _.size(changed) ? changed : false;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server, merging the response with the model's
    // local attributes. Any changed attributes will trigger a "change" event.
    fetch: function(options) {
      options = _.extend({parse: true}, options);
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        var serverAttrs = options.parse ? model.parse(resp, options) : resp;
        if (!model.set(serverAttrs, options)) return false;
        if (success) success.call(options.context, model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      // Handle both `"key", value` and `{key: value}` -style arguments.
      var attrs;
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true, parse: true}, options);
      var wait = options.wait;

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      var attributes = this.attributes;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = options.parse ? model.parse(resp, options) : resp;
        if (wait) serverAttrs = _.extend({}, attrs, serverAttrs);
        if (serverAttrs && !model.set(serverAttrs, options)) return false;
        if (success) success.call(options.context, model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      // Set temporary attributes if `{wait: true}` to properly find new ids.
      if (attrs && wait) this.attributes = _.extend({}, attributes, attrs);

      var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch' && !options.attrs) options.attrs = attrs;
      var xhr = this.sync(method, this, options);

      // Restore attributes.
      this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      var wait = options.wait;

      var destroy = function() {
        model.stopListening();
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (wait) destroy();
        if (success) success.call(options.context, model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      var xhr = false;
      if (this.isNew()) {
        _.defer(options.success);
      } else {
        wrapError(this, options);
        xhr = this.sync('delete', this, options);
      }
      if (!wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      var id = this.get(this.idAttribute);
      return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.defaults({validate: true}, options));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model, mapped to the
  // number of arguments they take.
  var modelMethods = { keys: 1, values: 1, pairs: 1, invert: 1, pick: 0,
      omit: 0, chain: 1, isEmpty: 1 };

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  addUnderscoreMethods(Model, modelMethods, 'attributes');

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analogous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Splices `insert` into `array` at index `at`.
  var splice = function(array, insert, at) {
    at = Math.min(Math.max(at, 0), array.length);
    var tail = Array(array.length - at);
    var length = insert.length;
    for (var i = 0; i < tail.length; i++) tail[i] = array[i + at];
    for (i = 0; i < length; i++) array[i + at] = insert[i];
    for (i = 0; i < tail.length; i++) array[i + length + at] = tail[i];
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model) { return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set. `models` may be Backbone
    // Models or raw JavaScript objects to be converted to Models, or any
    // combination of the two.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      options = _.extend({}, options);
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      var removed = this._removeModels(models, options);
      if (!options.silent && removed) this.trigger('update', this, options);
      return singular ? removed[0] : removed;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      if (models == null) return;

      options = _.defaults({}, options, setOptions);
      if (options.parse && !this._isModel(models)) models = this.parse(models, options);

      var singular = !_.isArray(models);
      models = singular ? [models] : models.slice();

      var at = options.at;
      if (at != null) at = +at;
      if (at < 0) at += this.length + 1;

      var set = [];
      var toAdd = [];
      var toRemove = [];
      var modelMap = {};

      var add = options.add;
      var merge = options.merge;
      var remove = options.remove;

      var sort = false;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      var model;
      for (var i = 0; i < models.length; i++) {
        model = models[i];

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        var existing = this.get(model);
        if (existing) {
          if (merge && model !== existing) {
            var attrs = this._isModel(model) ? model.attributes : model;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort) sort = existing.hasChanged(sortAttr);
          }
          if (!modelMap[existing.cid]) {
            modelMap[existing.cid] = true;
            set.push(existing);
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(model, options);
          if (model) {
            toAdd.push(model);
            this._addReference(model, options);
            modelMap[model.cid] = true;
            set.push(model);
          }
        }
      }

      // Remove stale models.
      if (remove) {
        for (i = 0; i < this.length; i++) {
          model = this.models[i];
          if (!modelMap[model.cid]) toRemove.push(model);
        }
        if (toRemove.length) this._removeModels(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      var orderChanged = false;
      var replace = !sortable && add && remove;
      if (set.length && replace) {
        orderChanged = this.length != set.length || _.some(this.models, function(model, index) {
          return model !== set[index];
        });
        this.models.length = 0;
        splice(this.models, set, 0);
        this.length = this.models.length;
      } else if (toAdd.length) {
        if (sortable) sort = true;
        splice(this.models, toAdd, at == null ? this.length : at);
        this.length = this.models.length;
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0; i < toAdd.length; i++) {
          if (at != null) options.index = at + i;
          model = toAdd[i];
          model.trigger('add', model, this, options);
        }
        if (sort || orderChanged) this.trigger('sort', this, options);
        if (toAdd.length || toRemove.length) this.trigger('update', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options = options ? _.clone(options) : {};
      for (var i = 0; i < this.models.length; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      return this.remove(model, options);
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      return this.remove(model, options);
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      var id = this.modelId(this._isModel(obj) ? obj.attributes : obj);
      return this._byId[obj] || this._byId[id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      if (index < 0) index += this.length;
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      return this[first ? 'find' : 'filter'](attrs);
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      var comparator = this.comparator;
      if (!comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      var length = comparator.length;
      if (_.isFunction(comparator)) comparator = _.bind(comparator, this);

      // Run sort based on type of `comparator`.
      if (length === 1 || _.isString(comparator)) {
        this.models = this.sortBy(comparator);
      } else {
        this.models.sort(comparator);
      }
      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = _.extend({parse: true}, options);
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success.call(options.context, collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      var wait = options.wait;
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp, callbackOpts) {
        if (wait) collection.add(model, callbackOpts);
        if (success) success.call(callbackOpts.context, model, resp, callbackOpts);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models, {
        model: this.model,
        comparator: this.comparator
      });
    },

    // Define how to uniquely identify models in the collection.
    modelId: function (attrs) {
      return attrs[this.model.prototype.idAttribute || 'id'];
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (this._isModel(attrs)) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method called by both remove and set.
    _removeModels: function(models, options) {
      var removed = [];
      for (var i = 0; i < models.length; i++) {
        var model = this.get(models[i]);
        if (!model) continue;

        var index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;

        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }

        removed.push(model);
        this._removeReference(model, options);
      }
      return removed.length ? removed : false;
    },

    // Method for checking whether an object should be considered a model for
    // the purposes of adding to the collection.
    _isModel: function (model) {
      return model instanceof Model;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      var id = this.modelId(model.attributes);
      if (id != null) this._byId[id] = model;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      delete this._byId[model.cid];
      var id = this.modelId(model.attributes);
      if (id != null) delete this._byId[id];
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (event === 'change') {
        var prevId = this.modelId(model.previousAttributes());
        var id = this.modelId(model.attributes);
        if (prevId !== id) {
          if (prevId != null) delete this._byId[prevId];
          if (id != null) this._byId[id] = model;
        }
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var collectionMethods = { forEach: 3, each: 3, map: 3, collect: 3, reduce: 4,
      foldl: 4, inject: 4, reduceRight: 4, foldr: 4, find: 3, detect: 3, filter: 3,
      select: 3, reject: 3, every: 3, all: 3, some: 3, any: 3, include: 3, includes: 3,
      contains: 3, invoke: 0, max: 3, min: 3, toArray: 1, size: 1, first: 3,
      head: 3, take: 3, initial: 3, rest: 3, tail: 3, drop: 3, last: 3,
      without: 0, difference: 0, indexOf: 3, shuffle: 1, lastIndexOf: 3,
      isEmpty: 1, chain: 1, sample: 3, partition: 3, groupBy: 3, countBy: 3,
      sortBy: 3, indexBy: 3};

  // Mix in each Underscore method as a proxy to `Collection#models`.
  addUnderscoreMethods(Collection, collectionMethods, 'models');

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be set as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this._removeElement();
      this.stopListening();
      return this;
    },

    // Remove this view's element from the document and all event listeners
    // attached to it. Exposed for subclasses using an alternative DOM
    // manipulation API.
    _removeElement: function() {
      this.$el.remove();
    },

    // Change the view's element (`this.el` property) and re-delegate the
    // view's events on the new element.
    setElement: function(element) {
      this.undelegateEvents();
      this._setElement(element);
      this.delegateEvents();
      return this;
    },

    // Creates the `this.el` and `this.$el` references for this view using the
    // given `el`. `el` can be a CSS selector or an HTML string, a jQuery
    // context or an element. Subclasses can override this to utilize an
    // alternative DOM manipulation API and are only required to set the
    // `this.el` property.
    _setElement: function(el) {
      this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
      this.el = this.$el[0];
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    delegateEvents: function(events) {
      events || (events = _.result(this, 'events'));
      if (!events) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[method];
        if (!method) continue;
        var match = key.match(delegateEventSplitter);
        this.delegate(match[1], match[2], _.bind(method, this));
      }
      return this;
    },

    // Add a single event listener to the view's element (or a child element
    // using `selector`). This only works for delegate-able events: not `focus`,
    // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
    delegate: function(eventName, selector, listener) {
      this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
      return this;
    },

    // Clears all callbacks previously bound to the view by `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      if (this.$el) this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // A finer-grained `undelegateEvents` for removing a single delegated event.
    // `selector` and `listener` are both optional.
    undelegate: function(eventName, selector, listener) {
      this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
      return this;
    },

    // Produces a DOM element to be assigned to your view. Exposed for
    // subclasses using an alternative DOM manipulation API.
    _createElement: function(tagName) {
      return document.createElement(tagName);
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        this.setElement(this._createElement(_.result(this, 'tagName')));
        this._setAttributes(attrs);
      } else {
        this.setElement(_.result(this, 'el'));
      }
    },

    // Set attributes from a hash on this view's element.  Exposed for
    // subclasses using an alternative DOM manipulation API.
    _setAttributes: function(attributes) {
      this.$el.attr(attributes);
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // Pass along `textStatus` and `errorThrown` from jQuery.
    var error = options.error;
    options.error = function(xhr, textStatus, errorThrown) {
      options.textStatus = textStatus;
      options.errorThrown = errorThrown;
      if (error) error.call(options.context, xhr, textStatus, errorThrown);
    };

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        if (router.execute(callback, args, name) !== false) {
          router.trigger.apply(router, ['route:' + name].concat(args));
          router.trigger('route', name, args);
          Backbone.history.trigger('route', router, name, args);
        }
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args, name) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    this.checkUrl = _.bind(this.checkUrl, this);

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      var path = this.location.pathname.replace(/[^\/]$/, '$&/');
      return path === this.root && !this.getSearch();
    },

    // Does the pathname match the root?
    matchRoot: function() {
      var path = this.decodeFragment(this.location.pathname);
      var root = path.slice(0, this.root.length - 1) + '/';
      return root === this.root;
    },

    // Unicode characters in `location.pathname` are percent encoded so they're
    // decoded for comparison. `%25` should not be decoded since it may be part
    // of an encoded parameter.
    decodeFragment: function(fragment) {
      return decodeURI(fragment.replace(/%25/g, '%2525'));
    },

    // In IE6, the hash fragment and search params are incorrect if the
    // fragment contains `?`.
    getSearch: function() {
      var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
      return match ? match[0] : '';
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the pathname and search params, without the root.
    getPath: function() {
      var path = this.decodeFragment(
        this.location.pathname + this.getSearch()
      ).slice(this.root.length - 1);
      return path.charAt(0) === '/' ? path.slice(1) : path;
    },

    // Get the cross-browser normalized URL fragment from the path or hash.
    getFragment: function(fragment) {
      if (fragment == null) {
        if (this._usePushState || !this._wantsHashChange) {
          fragment = this.getPath();
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error('Backbone.history has already been started');
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._hasHashChange   = 'onhashchange' in window && (document.documentMode === void 0 || document.documentMode > 7);
      this._useHashChange   = this._wantsHashChange && this._hasHashChange;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.history && this.history.pushState);
      this._usePushState    = this._wantsPushState && this._hasPushState;
      this.fragment         = this.getFragment();

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          var root = this.root.slice(0, -1) || '/';
          this.location.replace(root + '#' + this.getPath());
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot()) {
          this.navigate(this.getHash(), {replace: true});
        }

      }

      // Proxy an iframe to handle location events if the browser doesn't
      // support the `hashchange` event, HTML5 history, or the user wants
      // `hashChange` but not `pushState`.
      if (!this._hasHashChange && this._wantsHashChange && !this._usePushState) {
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'javascript:0';
        this.iframe.style.display = 'none';
        this.iframe.tabIndex = -1;
        var body = document.body;
        // Using `appendChild` will throw on IE < 9 if the document is not ready.
        var iWindow = body.insertBefore(this.iframe, body.firstChild).contentWindow;
        iWindow.document.open();
        iWindow.document.close();
        iWindow.location.hash = '#' + this.fragment;
      }

      // Add a cross-platform `addEventListener` shim for older browsers.
      var addEventListener = window.addEventListener || function (eventName, listener) {
        return attachEvent('on' + eventName, listener);
      };

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._usePushState) {
        addEventListener('popstate', this.checkUrl, false);
      } else if (this._useHashChange && !this.iframe) {
        addEventListener('hashchange', this.checkUrl, false);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      // Add a cross-platform `removeEventListener` shim for older browsers.
      var removeEventListener = window.removeEventListener || function (eventName, listener) {
        return detachEvent('on' + eventName, listener);
      };

      // Remove window listeners.
      if (this._usePushState) {
        removeEventListener('popstate', this.checkUrl, false);
      } else if (this._useHashChange && !this.iframe) {
        removeEventListener('hashchange', this.checkUrl, false);
      }

      // Clean up the iframe if necessary.
      if (this.iframe) {
        document.body.removeChild(this.iframe);
        this.iframe = null;
      }

      // Some environments will throw when clearing an undefined interval.
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();

      // If the user pressed the back button, the iframe's hash will have
      // changed and we should use that for comparison.
      if (current === this.fragment && this.iframe) {
        current = this.getHash(this.iframe.contentWindow);
      }

      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      // If the root doesn't match, no routes can match either.
      if (!this.matchRoot()) return false;
      fragment = this.fragment = this.getFragment(fragment);
      return _.some(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      // Normalize the fragment.
      fragment = this.getFragment(fragment || '');

      // Don't include a trailing slash on the root.
      var root = this.root;
      if (fragment === '' || fragment.charAt(0) === '?') {
        root = root.slice(0, -1) || '/';
      }
      var url = root + fragment;

      // Strip the hash and decode for matching.
      fragment = this.decodeFragment(fragment.replace(pathStripper, ''));

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._usePushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getHash(this.iframe.contentWindow))) {
          var iWindow = this.iframe.contentWindow;

          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if (!options.replace) {
            iWindow.document.open();
            iWindow.document.close();
          }

          this._updateHash(iWindow.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent` constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error.call(options.context, model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));

define('ev-script/models/video-settings',['backbone'], function(Backbone) {

    'use strict';

    return Backbone.Model.extend({
        defaults: {
            type: 'video',
            width: '640',
            height: '360',
            showtitle: true,
            autoplay: false,
            showcaptions: false,
            hidecontrols: false,
            socialsharing: false,
            annotations: true,
            captionsearch: true,
            attachments: true,
            links: true,
            metadata: true,
            dateproduced: true,
            embedcode: false,
            download: false,
            search: '',
            sourceId: 'content'
        }
    });
});

define('ev-script/models/playlist-settings',['backbone'], function(Backbone) {

    'use strict';

    return Backbone.Model.extend({
        defaults: {
            type: 'playlist',
            width: '800',
            height: '1000',
            layout: 'playlist',
            playlistLayout: {
                playlistSortBy: 'videoDate',
                playlistSortDirection: 'desc'
            },
            showcaseLayout: {
                // featuredContent: true,
                categoryList: true,
                categoryOrientation: 'horizontal'
            },
            embedcode: false,
            statistics: true,
            duration: true,
            attachments: true,
            annotations: true,
            links: true,
            credits: true,
            socialsharing: false,
            autoplay: false,
            showcaptions: false,
            dateproduced: true,
            audiopreviewimage: false,
            captionsearch: true,
            search: ''
        }
    });
});

define('ev-script/util/events',['require','underscore','backbone'],function(require) {

    'use strict';

    var events = [],
        _ = require('underscore'),
        Backbone = require('backbone');

    events['global'] = _.extend({}, Backbone.Events);

    return {
        initEvents: function(index) {
            return events[index] = _.extend({}, Backbone.Events);
        },
        getEvents: function(index) {
            var es;
            if (!index) {
                es = events['global'];
            } else {
                es = events[index];
            }
            return es;
        }
    };

});

define('ev-script/util/cache',['require','jquery','underscore','backbone'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone');

    var Cache = function() {
        this.cache = [];
        this.get = function(index) {
            return index ? this.cache[index] : null;
        };
        this.set = function(index, value) {
            return index ? this.cache[index] = value : null;
        };
        return this;
    };

    var caches = new Cache();

    var _getAppCache = function(appId) {
        var appCache = caches.get(appId);
        if (!appCache) {
            appCache = caches.set(appId, new Cache());
        }
        return appCache;
    };

    // Convenience method to initialize a cache for app-specific configuration
    var setAppConfig = function(appId, config) {
        return _getAppCache(appId).set('config', config);
    };

    var getAppConfig = function(appId) {
        return _getAppCache(appId).get('config');
    };

    // Convenience method to initialize a cache for app-specific authentication
    var setAppAuth = function(appId, auth) {
        return _getAppCache(appId).set('auth', auth);
    };

    var getAppAuth = function(appId) {
        return _getAppCache(appId).get('auth');
    };

    // Convenience method to initialize a cache for upstream application info
    var setAppInfo = function(appId, info) {
        return _getAppCache(appId).set('info', info);
    };

    var getAppInfo = function(appId) {
        return _getAppCache(appId).get('info');
    };

    var getUserCache = function(ensembleUrl, user) {
        var appCache = caches.get(ensembleUrl);
        if (!appCache) {
            appCache = caches.set(ensembleUrl, new Cache());
        }
        var userCache = appCache.get(user);
        if (!userCache) {
            userCache = appCache.set(user, new Cache());
        }
        return userCache;
    };

    return {
        Cache: Cache,
        caches: caches,
        setAppConfig: setAppConfig,
        getAppConfig: getAppConfig,
        setAppAuth: setAppAuth,
        getAppAuth: getAppAuth,
        setAppInfo: setAppInfo,
        getAppInfo: getAppInfo,
        getUserCache: getUserCache
    };

});

define('ev-script/views/base',['require','jquery','underscore','backbone','ev-script/util/events','ev-script/util/cache'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        root = this,
        eventsUtil = require('ev-script/util/events'),
        cacheUtil = require('ev-script/util/cache');

    return Backbone.View.extend({
        initialize: function(options) {
            this.appId = options.appId;
            this.config = cacheUtil.getAppConfig(this.appId);
            this.auth = cacheUtil.getAppAuth(this.appId);
            this.info = cacheUtil.getAppInfo(this.appId);
            this.appEvents = eventsUtil.getEvents(this.appId);
            this.globalEvents = eventsUtil.getEvents('global');
        },
        ajaxError: function(xhr, authCallback) {
            if (xhr.status === 401) {
                this.auth.handleUnauthorized(this.el, authCallback);
            } else if (xhr.status === 500) {
                // Making an assumption that root is window here...
                root.alert('It appears there is an issue with the Ensemble Video installation.');
            } else if (xhr.status === 404) {
                root.alert('Could not find requested resource.  This is likely a problem with the configured Ensemble Video base url.');
            } else if (xhr.status !== 0) {
                root.alert('An unexpected error occurred.  Check the server log for more details.');
            }
        },
        unencode: function(encoded) {
            return $('<span/>').html(encoded).text();
        }
    });

});

/**
 * @license RequireJS text 2.0.14 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('text',['module'], function (module) {
    'use strict';

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.14',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.lastIndexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config && config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config && config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'] &&
            !process.versions['atom-shell'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file[0] === '\uFEFF') {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                if (errback) {
                    errback(e);
                }
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status || 0;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        if (errback) {
                            errback(err);
                        }
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes;
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});


define('text!ev-script/templates/hider.html',[],function () { return '<a class="action-hide" href="#" title="Hide Picker">Hide</a>\n<% if (showLogout) { %>\n    <a class="action-logout" href="#" title="Logout <%= username %>">Logout</a>\n<% } %>\n';});

define('ev-script/views/hider',['require','underscore','ev-script/views/base','text!ev-script/templates/hider.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/hider.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'hideHandler', 'logoutHandler', 'authHandler', 'render');
            this.globalEvents.on('loggedIn', this.authHandler);
            this.globalEvents.on('loggedOut', this.authHandler);
            this.field = options.field;
        },
        events: {
            'click a.action-hide': 'hideHandler',
            'click a.action-logout': 'logoutHandler'
        },
        authHandler: function(ensembleUrl) {
            if (ensembleUrl === this.config.ensembleUrl) {
                this.render();
            }
        },
        render: function() {
            var username = '';
            if (this.info.get('ApplicationVersion') && this.auth.isAuthenticated()) {
                username = this.auth.getUser().get('UserName');
            }
            this.$el.html(this.template({
                showLogout: this.auth.isAuthenticated() && this.config.authType !== 'none',
                username: username
            }));
        },
        hideHandler: function(e) {
            this.appEvents.trigger('hidePicker', this.field.id);
            e.preventDefault();
        },
        logoutHandler: function(e) {
            this.auth.logout().always(this.appEvents.trigger('hidePickers'));
            e.preventDefault();
        }
    });

});


define('text!ev-script/templates/picker.html',[],function () { return '<div id="<%= id %>-hider" class="ev-hider"></div>\n<div id="<%= id %>-filter-block" class="ev-filter-block">\n    <div class="loader"></div>\n</div>\n<div id="<%= id %>-results" class="ev-results clearfix"></div>\n';});

define('ev-script/views/picker',['require','jquery','underscore','ev-script/views/base','ev-script/views/hider','text!ev-script/templates/picker.html'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        BaseView = require('ev-script/views/base'),
        HiderView = require('ev-script/views/hider');

    /*
     * Encapsulates views to manage search, display and selection of Ensemble videos and playlists.
     */
    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/picker.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'chooseItem', 'hidePicker', 'showPicker', 'setHeight', 'resizeResults');
            this.$el.hide();
            this.$el.html(this.template({
                id: this.id
            }));
            this.field = options.field;
            this.hider = new HiderView({
                el: this.$('div.ev-hider'),
                field: this.field,
                appId: this.appId
            });
            var $loader = this.$('div.loader');
            $(window.document).on('ajaxSend', _.bind(function(e, xhr, settings) {
                if (this === settings.picker) {
                    $loader.addClass('loading');
                }
            }, this)).on('ajaxComplete', _.bind(function(e, xhr, settings) {
                if (this === settings.picker) {
                    $loader.removeClass('loading');
                }
            }, this));
            this.appEvents.on('hidePickers', function(fieldId) {
                if (!fieldId || (this.field.id !== fieldId)) {
                    this.hidePicker();
                }
            }, this);
            this.appEvents.on('showPicker', function(fieldId) {
                if (this.field.id === fieldId && this.$el.is(':hidden')) {
                    this.showPicker();
                }
            }, this);
            this.appEvents.on('hidePicker', function(fieldId) {
                if (this.field.id === fieldId) {
                    this.hidePicker();
                }
            }, this);
            this.hider.render();
        },
        chooseItem: function(e) {
            var id = $(e.currentTarget).attr('rel');
            var content = this.resultsView.collection.get(id);
            this.model.set({
                id: id,
                content: content.toJSON()
            });
            this.field.model.set(this.model.attributes);
            this.appEvents.trigger('hidePicker', this.field.id);
            e.preventDefault();
        },
        hidePicker: function() {
            this.$el.hide();
        },
        showPicker: function() {
            // In case our authentication status has changed...re-render our hider
            this.hider.render();
            this.$el.show();
        },
        setHeight: function(height) {
            this.$el.height(height);
            this.resizeResults();
        },
        resizeResults: function() {}
    });

});


define('text!ev-script/templates/search.html',[],function () { return '<label for="<%= id %>">Search:</label>\n<input id="<%= id %>" type="search" class="form-text search" value="<%- searchVal %>" title="Search Media" />\n<input type="submit" value="Go" class="form-submit" />\n';});

define('ev-script/views/search',['require','underscore','ev-script/views/base','text!ev-script/templates/search.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/search.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'searchHandler', 'doSearch', 'autoSearch');
            this.picker = options.picker;
            this.callback = options.callback || function() {};
        },
        events: {
            'submit form': 'searchHandler',
            'keyup .search': 'autoSearch'
        },
        render: function() {
            this.$el.html(this.template({
                id: this.id + '-input',
                searchVal: this.picker.model.get('search')
            }));
        },
        doSearch: function() {
            this.picker.model.set({
                search: this.$('.search').val()
            });
            this.callback();
        },
        searchHandler: function(e) {
            this.doSearch();
            e.preventDefault();
        },
        autoSearch: function(e) {
            var value = e.target.value;
            if (value !== this.lastValue) {
                this.lastValue = value;
                if (this.submitTimeout) {
                    clearTimeout(this.submitTimeout);
                }
                this.submitTimeout = setTimeout(_.bind(function() {
                    this.doSearch();
                }, this), 1000);
            }
        }
    });

});


define('text!ev-script/templates/library-type-select.html',[],function () { return '<div>\n  <label for="<%= id %>">Type:</label>\n  <select id="<%= id %>" class="form-select source" title="Select Library Type">\n    <option value="content" <% if (sourceId === \'content\') { print(\'selected="selected"\'); } %>>Media Library</option>\n    <option value="shared" <% if (sourceId === \'shared\') { print(\'selected="selected"\'); } %>>Shared Library</option>\n  </select>\n  <input type="submit" value="Go" class="form-submit" />\n</div>\n';});

define('ev-script/views/library-type-select',['require','underscore','ev-script/views/base','text!ev-script/templates/library-type-select.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/library-type-select.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'changeHandler');
            this.picker = options.picker;
            this.callback = options.callback || function() {};
        },
        events: {
            'change .source': 'changeHandler'
        },
        render: function() {
            this.$el.html(this.template({
                id: this.id + '-select',
                sourceId: this.picker.model.get('sourceId')
            }));
        },
        changeHandler: function(e) {
            this.picker.model.set({
                sourceId: this.$('.source').val()
            });
            this.callback();
            e.preventDefault();
        }
    });

});


define('text!ev-script/templates/options.html',[],function () { return '<% collection.each(function(item) { %>\n    <option value="<%= item.id %>" <% if (selectedId === item.id) { print(\'selected="selected"\'); } %>><%- item.get(\'Name\') %></option>\n<% }); %>\n';});

define('ev-script/views/organization-select',['require','underscore','ev-script/views/base','text!ev-script/templates/options.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/options.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'render');
            this.picker = options.picker;
            this.$el.html('<option value="-1">Loading...</option>');
            this.collection.on('reset', this.render);
        },
        render: function() {
            var selectedId = this.picker.model.get('organizationId') || this.auth.getUser().get('OrganizationID');
            this.$el.html(this.template({
                selectedId: selectedId,
                collection: this.collection
            }));
            this.$el.trigger('change');
        }
    });

});

define('ev-script/collections/base',['require','jquery','underscore','backbone','ev-script/util/cache'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        cacheUtil = require('ev-script/util/cache');

    return Backbone.Collection.extend({
        initialize: function(collections, options) {
            this.requiresAuth = true;
            this.appId = options.appId;
            this.config = cacheUtil.getAppConfig(this.appId);
            this.auth = cacheUtil.getAppAuth(this.appId);
            this.info = cacheUtil.getAppInfo(this.appId);
        },
        model: Backbone.Model.extend({
            idAttribute: 'ID'
        }),
        getCached: function(key) {},
        setCached: function(key, resp) {},
        clearCache: function(key) {},
        parse: function(response) {
            return response.Data;
        },
        fetch: function(options) {
            if (options && options.success) {
                options.success = _.wrap(options.success, _.bind(function(success) {
                    // We've successfully queried the API for something that
                    // requires authentication but we're in an unauthenticated
                    // state.  Double-check our authentication and proceed.
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (this.requiresAuth && !this.auth.isAuthenticated()) {
                        this.auth.fetchUser()
                        .always(function() {
                            success.apply(this, args);
                        });
                    } else {
                        success.apply(this, args);
                    }
                }, this));
                // TODO - maybe wrap error to handle 401?
            }
            return Backbone.Collection.prototype.fetch.call(this, options);
        },
        sync: function(method, collection, options) {
            _.defaults(options || (options = {}), {
                xhrFields: { withCredentials: true }
            });
            if (method === 'read') {
                var cached = this.getCached(options.cacheKey);
                if (cached) {
                    var deferred = $.Deferred();
                    if (options.success) {
                        deferred.done(options.success);
                    }
                    return deferred.resolve(cached).promise();
                } else {
                    // Grab the response and cache
                    options.success = options.success || function(collection, response, options) {};
                    options.success = _.wrap(options.success, _.bind(function(success) {
                        this.setCached(options.cacheKey, arguments[1]);
                        success.apply(this, Array.prototype.slice.call(arguments, 1));
                    }, this));
                    return Backbone.Collection.prototype.sync.call(this, method, collection, options);
                }
            } else {
                return Backbone.Collection.prototype.sync.call(this, method, collection, options);
            }
        }
    });

});

define('ev-script/collections/organizations',['require','ev-script/collections/base','ev-script/util/cache'],function(require) {

    'use strict';

    var BaseCollection = require('ev-script/collections/base'),
        cacheUtil = require('ev-script/util/cache');

    return BaseCollection.extend({
        initialize: function(models, options) {
            BaseCollection.prototype.initialize.call(this, models, options);
        },
        _cache: function(key, resp) {
            var cachedValue = null,
                user = this.auth.getUser(),
                userCache = user ? cacheUtil.getUserCache(this.config.ensembleUrl, user.id) : null;
            return userCache ? userCache[resp ? 'set' : 'get'](key, resp) : null;
        },
        getCached: function(key) {
            return this._cache('orgs');
        },
        setCached: function(key, resp) {
            return this._cache('orgs', resp);
        },
        url: function() {
            var api_url = this.config.ensembleUrl + '/api/Organizations';
            // Make this arbitrarily large so we can retrieve ALL orgs in a single request
            var sizeParam = 'PageSize=9999';
            var indexParam = 'PageIndex=1';
            var url = api_url + '?' + sizeParam + '&' + indexParam;
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        }
    });

});

define('ev-script/views/library-select',['require','underscore','ev-script/views/base','text!ev-script/templates/options.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/options.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'render');
            this.picker = options.picker;
            this.$el.html('<option value="-1">Loading...</option>');
            this.collection.on('reset', this.render);
        },
        render: function() {
            var selectedId = this.picker.model.get('libraryId') || this.auth.getUser().get('LibraryID');
            this.$el.html(this.template({
                selectedId: selectedId,
                collection: this.collection
            }));
            this.$el.trigger('change');
        }
    });

});

define('ev-script/collections/libraries',['require','ev-script/collections/base','ev-script/util/cache'],function(require) {

    'use strict';

    var BaseCollection = require('ev-script/collections/base'),
        cacheUtil = require('ev-script/util/cache');

    return BaseCollection.extend({
        initialize: function(models, options) {
            BaseCollection.prototype.initialize.call(this, models, options);
            this.filterValue = options.organizationId || '';
        },
        _cache: function(key, resp) {
            var cachedValue = null,
                user = this.auth.getUser(),
                userCache = user ? cacheUtil.getUserCache(this.config.ensembleUrl, user.id) : null;
            if (userCache) {
                var libsCache = userCache.get('libs');
                if (!libsCache) {
                    userCache.set('libs', libsCache = new cacheUtil.Cache());
                }
                cachedValue = libsCache[resp ? 'set' : 'get'](key, resp);
            }
            return cachedValue;
        },
        getCached: function(key) {
            return this._cache(key);
        },
        setCached: function(key, resp) {
            return this._cache(key, resp);
        },
        url: function() {
            var api_url = this.config.ensembleUrl + '/api/Libraries';
            // Make this arbitrarily large so we can retrieve ALL libraries under an org in a single request
            var sizeParam = 'PageSize=9999';
            var indexParam = 'PageIndex=1';
            var onParam = 'FilterOn=OrganizationId';
            var valueParam = 'FilterValue=' + encodeURIComponent(this.filterValue);
            var url = api_url + '?' + sizeParam + '&' + indexParam + '&' + onParam + '&' + valueParam;
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        }
    });

});


define('text!ev-script/templates/unit-selects.html',[],function () { return '<div id="<%= formId %>" class="unit-selects">\n    <label for="<%= orgSelectId %>">Organization:</label><select id="<%= orgSelectId %>" class="form-select organizations" title="Select Organization"></select><label for="<%= libSelectId %>">Library:</label><select id="<%= libSelectId %>" class="form-select libraries" title="Select Library"></select><input type="submit" value="Go" class="form-submit" />\n</div>\n';});

define('ev-script/views/unit-selects',['require','jquery','underscore','ev-script/views/base','ev-script/views/organization-select','ev-script/collections/organizations','ev-script/views/library-select','ev-script/collections/libraries','text!ev-script/templates/unit-selects.html'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        BaseView = require('ev-script/views/base'),
        OrganizationSelectView = require('ev-script/views/organization-select'),
        Organizations = require('ev-script/collections/organizations'),
        LibrarySelectView = require('ev-script/views/library-select'),
        Libraries = require('ev-script/collections/libraries');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/unit-selects.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'loadOrgs', 'loadLibraries', 'changeOrganization', 'changeLibrary');
            this.picker = options.picker;
            this.id = options.id;
            this.$el.html(this.template({
                formId: this.id + '-unit-selects',
                orgSelectId: this.id + '-org-select',
                libSelectId: this.id + '-lib-select'
            }));
            this.orgSelect = new OrganizationSelectView({
                el: this.$('.organizations'),
                picker: this.picker,
                appId: this.appId,
                collection: new Organizations({}, {
                    appId: this.appId
                })
            });
            this.libSelect = new LibrarySelectView({
                el: this.$('.libraries'),
                picker: this.picker,
                appId: this.appId,
                collection: new Libraries({}, {
                    appId: this.appId
                })
            });
        },
        events: {
            'change select.organizations': 'changeOrganization',
            'change select.libraries': 'changeLibrary'
        },
        changeOrganization: function(e) {
            this.picker.model.set({
                organizationId: e.target.value
            });
            this.loadLibraries();
        },
        changeLibrary: function(e) {
            this.picker.model.set({
                libraryId: e.target.value
            });
        },
        loadOrgs: function() {
            var orgs = new Organizations({}, {
                appId: this.appId
            });
            orgs.fetch({
                picker: this.picker,
                success: _.bind(function(collection, response, options) {
                    this.orgSelect.collection.reset(collection.models);
                }, this),
                error: _.bind(function(collection, xhr, options) {
                    this.ajaxError(xhr, _.bind(function() {
                        this.loadOrgs();
                    }, this));
                }, this)
            });
        },
        loadLibraries: function() {
            var orgId = this.picker.model.get('organizationId');
            var libs = new Libraries({}, {
                organizationId: orgId,
                appId: this.appId
            });
            libs.fetch({
                picker: this.picker,
                cacheKey: orgId,
                success: _.bind(function(collection, response, options) {
                    this.libSelect.collection.reset(collection.models);
                }, this),
                error: _.bind(function(collection, xhr, options) {
                    this.ajaxError(xhr, _.bind(function() {
                        this.loadLibraries();
                    }, this));
                }, this)
            });
        }
    });

});

/**
 * ev-scroll-loader 1.0.0 2016-02-24
 * Ensemble Video jQuery Scroll Loader Plugin
 * https://github.com/ensembleVideo/ev-scroll-loader
 * Copyright (c) 2016 Symphony Video, Inc.
 * Licensed (MIT AND GPL-2.0)
 */
(function(factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define('ev-scroll-loader',['jquery'], factory);
    } else if (typeof module === 'object' && typeof module.exports === 'object') {
        factory(require('jquery'));
    } else {
        factory(jQuery);
    }
})(function($) {

    'use strict';

    var defaults = {
        onScrolled: function() {}
    };

    var methods = {
        init: function(options) {
            var settings = $.extend({}, defaults, options);
            return this.each(function() {
                var $this = $(this),
                    $wrap = $this.wrap('<div class=\"scrollWrap\"/>').closest('.scrollWrap');
                $this.addClass('scroll-content');
                $wrap.append('<div class="loader"></div>');
                $wrap.css({
                    'position': 'relative',
                    'height': settings.height ? (typeof settings.height === 'number' ? settings.height + 'px' : settings.height) : '100%',
                    'max-height': $this[0].scrollHeight + 'px',
                    'overflow-y': 'scroll'
                });
                $wrap.scroll(function() {
                    // When we have scrolled to the bottom of our content, call the onScrolled handler.  We subtract a pixel below to account for rounding.
                    if ($wrap.scrollTop() >= $wrap[0].scrollHeight - $wrap.height() - 1) {
                        settings.onScrolled.call($this);
                    }
                });
            });
        },
        showLoader: function() {
            var $wrap = $(this).closest('.scrollWrap');
            $('.loader', $wrap).show();
            return this;
        },
        hideLoader: function() {
            var $wrap = $(this).closest('.scrollWrap');
            $('.loader', $wrap).hide();
            return this;
        }
    };

    $.fn.evScrollLoader = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
    };

});


define('text!ev-script/templates/results.html',[],function () { return '<div class="total">Search returned <%= totalResults %> results.</div>\n<div class="results">\n    <table class="content-list"></table>\n</div>\n';});


define('text!ev-script/templates/no-results.html',[],function () { return '<tr class="odd"><td colspan="2">No results available.</td></tr>\n';});

define('ev-script/views/results',['require','jquery','underscore','ev-script/views/base','ev-scroll-loader','text!ev-script/templates/results.html','text!ev-script/templates/no-results.html'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    require('ev-scroll-loader');

    /*
     * Base object for result views since video and playlist results are rendered differently
     */
    return BaseView.extend({
        resultsTemplate: _.template(require('text!ev-script/templates/results.html')),
        emptyTemplate: _.template(require('text!ev-script/templates/no-results.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'render', 'loadMore', 'addHandler', 'previewItem', 'setHeight', 'resizeResults');
            this.picker = options.picker;
            this.appId = options.appId;
            this.loadLock = false;
        },
        events: {
            'click a.action-preview': 'previewItem'
        },
        getItemHtml: function(item, index) {
            if (this.resultTemplate) {
                return this.resultTemplate({
                    item: item,
                    index: index
                });
            }
        },
        previewItem: function(e) {
            var element = e.currentTarget;
            var id = $(element).attr('rel');
            var item = this.collection.get(id);
            var settings = {
                id: id,
                content: item.toJSON(),
                appId: this.appId
            };
            var previewView = new this.previewClass({
                el: element,
                model: new this.modelClass(settings),
                appId: this.appId,
                picker: this.picker
            });
            // Stop event propagation so we don't trigger preview of stored field item as well
            e.stopPropagation();
            e.preventDefault();
        },
        loadMore: function() {
            if (this.collection.hasMore && !this.loadLock) {
                this.loadLock = true;
                this.collection.fetch({
                    remove: false,
                    picker: this.picker,
                    success: _.bind(function(collection, response, options) {
                        if (_.size(response.Data) < this.config.pageSize) {
                            collection.hasMore = false;
                            this.$scrollLoader.evScrollLoader('hideLoader');
                        } else {
                            collection.hasMore = true;
                            collection.pageIndex += 1;
                        }
                        this.loadLock = false;
                    }, this),
                    error: _.bind(function(collection, xhr, options) {
                        this.ajaxError(xhr, _.bind(function() {
                            this.loadMore();
                        }, this));
                        this.loadLock = false;
                    }, this)
                });
            }
        },
        addHandler: function(item, collection, options) {
            var $item = $(this.getItemHtml(item, collection.indexOf(item)));
            this.decorate($item);
            this.$('.content-list').append($item);
        },
        // Override this in extending views to update the DOM when items are added
        decorate: function($item) {},
        render: function() {
            this.$el.html(this.resultsTemplate({
                totalResults: this.collection.totalResults
            }));
            this.$total = this.$('.total');
            this.$results = this.$('.results');
            this.resizeResults();
            var $contentList = this.$('.content-list');
            if (!this.collection.isEmpty()) {
                this.collection.each(function(item, index) {
                    var $item = $(this.getItemHtml(item, index));
                    this.decorate($item);
                    $contentList.append($item);
                }, this);
            } else {
                $contentList.append(this.emptyTemplate());
            }
            var scrollHeight = this.config.scrollHeight;
            this.$scrollLoader = $contentList.evScrollLoader({
                height: scrollHeight,
                onScrolled: this.loadMore
            });
            if (!this.collection.hasMore) {
                this.$scrollLoader.evScrollLoader('hideLoader');
            }
            // Prevent multiple bindings if the collection hasn't changed between render calls
            this.collection.off('add', this.addHandler).on('add', this.addHandler);
        },
        setHeight: function(height) {
            this.$el.height(height);
            this.resizeResults();
        },
        resizeResults: function() {
            if (this.config.fitToParent && this.$results) {
                this.$results.height(this.$el.height() - this.$total.outerHeight(true));
                // Truncation of metadata depends on window size...so re-decorate
                this.$('.resultItem').each(_.bind(function(index, element) {
                    this.decorate($(element));
                }, this));
            }
        }
    });

});

define('ev-script/views/preview',['require','jquery','underscore','ev-script/views/base','ev-script/models/video-settings','jquery-ui'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        BaseView = require('ev-script/views/base'),
        VideoSettings = require('ev-script/models/video-settings');

    require('jquery-ui');

    return BaseView.extend({
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            var $dialogWrap = $('<div class="dialogWrap ev-preview"></div>'),
                content = this.model.get('content') || {
                    Title: this.model.get('id')
                },
                embedSettings = new this.model.constructor(this.model.toJSON()),
                // Desired media dimensions
                mediaDims = {
                    width: this.model.get('width'),
                    height: this.model.get('height')
                },
                // Dialog dimensions TBD
                dialogDims = {},
                // Desired difference between media width and containing dialog width
                widthOffset = 50,
                // Desired difference between media height and containing dialog height
                heightOffset = this.info.useLegacyEmbeds() ? 140 : 100,
                // Used for scaling media dimensions to fit within desired dialog size
                ratio,
                // Maximum width of media based on desired dialog width
                maxWidth,
                // Maximum height of media based on desired dialog height
                maxHeight,
                // Our dialog
                $dialog;
            this.$el.after($dialogWrap);
            dialogDims.width = Math.min(mediaDims.width + widthOffset, $(window).width() - this.config.dialogMargin);
            dialogDims.height = Math.min(mediaDims.height + heightOffset, $(window).height() - this.config.dialogMargin);
            // Only bother scaling if we're dealing with videos
            if (this.model instanceof VideoSettings) {
                maxWidth = dialogDims.width - widthOffset;
                maxHeight = dialogDims.height - heightOffset;
                while (mediaDims.width > maxWidth || mediaDims.height > maxHeight) {
                    ratio = mediaDims.width > maxWidth ? maxWidth / mediaDims.width : maxHeight / mediaDims.height;
                    mediaDims.width = mediaDims.width * ratio;
                    mediaDims.height = mediaDims.height * ratio;
                }
                mediaDims.width = Math.ceil(mediaDims.width);
                mediaDims.height = Math.ceil(mediaDims.height);
            }
            embedSettings.set('width', mediaDims.width);
            embedSettings.set('height', mediaDims.height);
            $dialog = $dialogWrap.dialog({
                title: this.unencode(content.Title || content.Name),
                modal: true,
                width: dialogDims.width,
                height: dialogDims.height,
                draggable: false,
                resizable: false,
                dialogClass: 'ev-dialog',
                create: _.bind(function(event, ui) {
                    var embedView = new this.embedClass({
                        model: embedSettings,
                        appId: this.appId
                    });
                    $dialogWrap.html(embedView.$el);
                }, this),
                close: function(event, ui) {
                    $dialogWrap.dialog('destroy').remove();
                }
            });
        }
    });

});


define('text!ev-script/templates/video-embed.html',[],function () { return '<iframe src="<%- ensembleUrl %>/app/plugin/embed.aspx?ID=<%- id %>&autoPlay=<%- autoPlay %>&displayTitle=<%- displayTitle %>&displaySharing=<%- displaySharing %>&displayAnnotations=<%- displayAnnotations %>&displayCaptionSearch=<%- displayCaptionSearch %>&displayAttachments=<%- displayAttachments %>&displayLinks=<%- displayLinks %>&displayMetaData=<%- displayMetaData %>&displayDateProduced=<%- displayDateProduced %>&displayEmbedCode=<%- displayEmbedCode %>&displayDownloadIcon=<%- displayDownloadIcon %>&hideControls=true&showCaptions=<%- showCaptions %>&width=<%- width %>&height=<%- height %>&isNewPluginEmbed=true"\n        frameborder="0"\n        width="<%- width %>"\n        height="<%- (parseInt(height, 10) + 40) %>"\n        allowfullscreen>\n</iframe>\n';});


define('text!ev-script/templates/video-embed-legacy.html',[],function () { return '<iframe src="<%- ensembleUrl %>/app/plugin/embed.aspx?ID=<%- id %>&autoPlay=<%- autoPlay %>&displayTitle=<%- displayTitle %>&hideControls=<%- hideControls %>&showCaptions=<%- showCaptions %>&width=<%- width %>&height=<%- height %>"\n        frameborder="0"\n        style="width: <%- width %>px;height:<%- (parseInt(height, 10) + 56) %>px;"\n        allowfullscreen>\n</iframe>\n';});

define('ev-script/views/video-embed',['require','underscore','ev-script/views/base','text!ev-script/templates/video-embed.html','text!ev-script/templates/video-embed-legacy.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/video-embed.html')),
        legacyTemplate: _.template(require('text!ev-script/templates/video-embed-legacy.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            // Width and height really should be set by now...but use a reasonable default if not
            var width = (this.model.get('width') ? this.model.get('width') : '640'),
                height = (this.model.get('height') ? this.model.get('height') : '360'),
                showTitle = this.model.get('showtitle'),
                embed = '';
            if (!this.info.useLegacyEmbeds()) {
                embed = this.template({
                    ensembleUrl: this.config.ensembleUrl,
                    id: this.model.get('id'),
                    autoPlay: this.model.get('autoplay'),
                    displayTitle: showTitle,
                    displaySharing: this.model.get('socialsharing'),
                    displayAnnotations: this.model.get('annotations'),
                    displayCaptionSearch: this.model.get('captionsearch'),
                    displayAttachments: this.model.get('attachments'),
                    displayLinks: this.model.get('links'),
                    displayMetaData: this.model.get('metadata'),
                    displayDateProduced: this.model.get('dateproduced'),
                    displayEmbedCode: this.model.get('embedcode'),
                    displayDownloadIcon: this.model.get('download'),
                    showCaptions: this.model.get('showcaptions'),
                    width: width,
                    height: height
                });
            } else {
                embed = this.legacyTemplate({
                    ensembleUrl: this.config.ensembleUrl,
                    id: this.model.get('id'),
                    autoPlay: this.model.get('autoplay'),
                    displayTitle: showTitle,
                    hideControls: this.model.get('hidecontrols'),
                    showCaptions: this.model.get('showcaptions'),
                    width: width,
                    height: (showTitle ? height + 25 : height)
                });
            }
            this.$el.html(embed);
        }
    });

});

define('ev-script/models/base',['require','jquery','underscore','backbone','ev-script/util/cache','ev-script/collections/base'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        cacheUtil = require('ev-script/util/cache'),
        BaseCollection = require('ev-script/collections/base');

    return Backbone.Model.extend({
        initialize: function(attributes, options) {
            this.appId = options.appId;
            this.config = cacheUtil.getAppConfig(this.appId);
        },
        getCached: function() {},
        setCached: function() {},
        fetch: function(options) {
            if (options && options.success) {
                options.success = _.wrap(options.success, _.bind(function(success) {
                    // We've successfully queried the API for something that
                    // requires authentication but we're in an unauthenticated
                    // state.  Double-check our authentication and proceed.
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (this.requiresAuth && !this.auth.isAuthenticated()) {
                        this.auth.fetchUser()
                        .always(function() {
                            success.apply(this, args);
                        });
                    } else {
                        success.apply(this, args);
                    }
                }, this));
                // TODO - maybe wrap error to handle 401?
            }
            return Backbone.Model.prototype.fetch.call(this, options);
        },
        sync: function(method, collection, options) {
            _.defaults(options || (options = {}), {
                xhrFields: { withCredentials: true }
            });
            if (method === 'read') {
                var cached = this.getCached(options.cacheKey);
                if (cached) {
                    var deferred = $.Deferred();
                    if (options.success) {
                        deferred.done(options.success);
                    }
                    return deferred.resolve(cached).promise();
                } else {
                    // Grab the response and cache
                    options.success = options.success || function(collection, response, options) {};
                    options.success = _.wrap(options.success, _.bind(function(success) {
                        this.setCached(options.cacheKey, arguments[1]);
                        success.apply(this, Array.prototype.slice.call(arguments, 1));
                    }, this));
                    return Backbone.Model.prototype.sync.call(this, method, collection, options);
                }
            } else {
                return Backbone.Model.prototype.sync.call(this, method, collection, options);
            }
        }
    });

});

define('ev-script/models/video-encoding',['require','backbone','ev-script/models/base','underscore','ev-script/util/cache'],function(require) {

    'use strict';

    var Backbone = require('backbone'),
        BaseModel = require('ev-script/models/base'),
        _ = require('underscore'),
        cacheUtil = require('ev-script/util/cache');

    return BaseModel.extend({
        idAttribute: 'videoID',
        initialize: function(attributes, options) {
            BaseModel.prototype.initialize.call(this, attributes, options);
            this.requiresAuth = false;
        },
        // TODO - cache responses
        getCached: function(key) {},
        setCached: function(key, resp) {},
        url: function() {
            // Note the response is actually JSONP.  We'll strip the padding
            // below with our dataFilter.
            var url = this.config.ensembleUrl + '/app/api/content/show.json/' + this.get('fetchId');
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        },
        getDims: function() {
            var dimsRaw = this.get('dimensions') || "640x360",
                dimsStrs = dimsRaw.split('x'),
                dims = [];
            dims[0] = this.isAudio() ? 400 : (parseInt(dimsStrs[0], 10) || 640);
            dims[1] = this.isAudio() ? 26 : (parseInt(dimsStrs[1], 10) || 360);
            return dims;
        },
        getRatio: function() {
            var dims = this.getDims();
            return dims[0] / dims[1];
        },
        getWidth: function() {
            return this.getDims()[0];
        },
        getHeight: function() {
            return this.getDims()[1];
        },
        isAudio: function() {
            return (/^audio/i).test(this.get('contentType') || '');
        },
        parse: function(response) {
            if (_.isArray(response.dataSet.encodings)) {
                // This is a collection, so return the highest bitrate encoding
                return _.max(response.dataSet.encodings, function(encoding, index, encodings) {
                    return parseInt(encoding.bitRate, 10);
                });
            } else {
                return response.dataSet.encodings;
            }
        },
        sync: function(method, model, options) {
            _.extend(options, {
                dataFilter: function(data) {
                    // Strip padding from JSONP response
                    var match = data.match(/\{[\s\S]*\}/);
                    return match ? match[0] : data;
                }
            });
            return Backbone.sync.call(this, method, model, options);
        }
    });

});

define('ev-script/views/video-preview',['require','underscore','ev-script/views/preview','ev-script/views/video-embed','ev-script/models/video-encoding'],function(require) {

    'use strict';

    var _ = require('underscore'),
        PreviewView = require('ev-script/views/preview'),
        VideoEmbedView = require('ev-script/views/video-embed'),
        VideoEncoding = require('ev-script/models/video-encoding');

    return PreviewView.extend({
        embedClass: VideoEmbedView,
        initialize: function(options) {
            // Although our super sets this...we don't call our super init until
            // later so we should set appId here
            this.appId = options.appId;
            this.encoding = options.encoding || new VideoEncoding({
                fetchId: this.model.id
            }, {
                appId: this.appId
            });
            this.picker = options.picker;
            var success = _.bind(function() {
                this.model.set({
                    width: this.encoding.getWidth(),
                    height: this.encoding.getHeight()
                });
                PreviewView.prototype.initialize.call(this, options);
            }, this);
            if (this.encoding.isNew()) {
                this.encoding.fetch({
                    success: success,
                    // The loader indicator will show if it detects an AJAX
                    // request on our picker
                    picker: this.picker
                });
            } else {
                success();
            }
        }
    });

});

(function($) {

  // Matches trailing non-space characters.
  var chop = /(\s*\S+|\s)$/;

  // Return a truncated html string.  Delegates to $.fn.truncate.
  $.truncate = function(html, options) {
    return $('<div></div>').append(html).truncate(options).html();
  };

  // Truncate the contents of an element in place.
  $.fn.truncate = function(options) {
    if ($.isNumeric(options)) options = {length: options};
    var o = $.extend({}, $.truncate.defaults, options);

    return this.each(function() {
      var self = $(this);

      if (o.noBreaks) self.find('br').replaceWith(' ');

      var text = self.text();
      var excess = text.length - o.length;

      if (o.stripTags) self.text(text);

      // Chop off any partial words if appropriate.
      if (o.words && excess > 0) {
        excess = text.length - text.slice(0, o.length).replace(chop, '').length - 1;
      }

      if (excess < 0 || !excess && !o.truncated) return;

      // Iterate over each child node in reverse, removing excess text.
      $.each(self.contents().get().reverse(), function(i, el) {
        var $el = $(el);
        var text = $el.text();
        var length = text.length;

        // If the text is longer than the excess, remove the node and continue.
        if (length <= excess) {
          o.truncated = true;
          excess -= length;
          $el.remove();
          return;
        }

        // Remove the excess text and append the ellipsis.
        if (el.nodeType === 3) {
          $(el.splitText(length - excess - 1)).replaceWith(o.ellipsis);
          return false;
        }

        // Recursively truncate child nodes.
        $el.truncate($.extend(o, {length: length - excess}));
        return false;
      });
    });
  };

  $.truncate.defaults = {

    // Strip all html elements, leaving only plain text.
    stripTags: false,

    // Only truncate at word boundaries.
    words: false,

    // Replace instances of <br> with a single space.
    noBreaks: false,

    // The maximum length of the truncated html.
    length: Infinity,

    // The character to use as the ellipsis.  The word joiner (U+2060) can be
    // used to prevent a hanging ellipsis, but displays incorrectly in Chrome
    // on Windows 7.
    // http://code.google.com/p/chromium/issues/detail?id=68323
    ellipsis: '\u2026' // '\u2060\u2026'

  };

})(jQuery);

define("jquery-truncate-html", function(){});


define('text!ev-script/templates/video-result.html',[],function () { return '<tr class="<%= (index % 2 ? \'odd\' : \'even\') %> resultItem">\n    <td class="content-actions">\n        <div class="thumbnail-wrap">\n            <img class="thumbnail" src="<%= item.get(\'ThumbnailUrl\').replace(/width=100/i, \'width=200\') %>" alt="<%= item.get(\'Title\') %> thumbnail image"/>\n            <% if (item.get(\'IsCaptioned\')) { %>\n            <i class="ccbadge fa fa-cc fa-lg text-dark5" title="CC" alt="CC"></i>\n            <% } %>\n        </div>\n        <div class="action-links">\n            <a class="action-add" href="#" title="Choose <%= item.get(\'Title\') %>" rel="<%= item.get(\'ID\') %>"><i class="fa fa-plus-circle fa-lg"></i><span>Choose</span></a>\n            <a class="action-preview" href="#" title="Preview: <%= item.get(\'Title\') %>" rel="<%= item.get(\'ID\') %>"><i class="fa fa-play-circle fa-lg"></i><span>Preview: <%= item.get(\'Title\') %></span></a>\n        </div>\n    </td>\n    <td class="content-meta">\n        <table class="content-item">\n            <tbody>\n                <tr class="title">\n                    <td colspan="2">\n                        <a class="action-preview" title="Preview: <%= item.get(\'Title\') %>" href="#" rel="<%= item.get(\'ID\') %>"><%= item.get(\'Title\') %></a>\n                    </td>\n                </tr>\n                <tr class="trunc"><td class="label">Description</td><td class="value"><%= item.get(\'Description\') %></td></tr>\n                <tr><td class="label">Date Added</td><td class="value"><%- new Date(item.get(\'AddedOn\')).toLocaleString() %></td></tr>\n                <tr class="trunc"><td class="label">Keywords</td><td class="value"><%= item.get(\'Keywords\') %></td></tr>\n                <tr><td class="label">Library</td><td class="value"><%- item.get(\'LibraryName\') %></td></tr>\n            </tbody>\n        </table>\n    </td>\n</tr>\n';});

define('ev-script/views/video-results',['require','jquery','underscore','ev-script/views/results','ev-script/models/video-settings','ev-script/views/video-preview','jquery-truncate-html','text!ev-script/templates/video-result.html'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        ResultsView = require('ev-script/views/results'),
        VideoSettings = require('ev-script/models/video-settings'),
        VideoPreviewView = require('ev-script/views/video-preview');

    require('jquery-truncate-html');

    return ResultsView.extend({
        modelClass: VideoSettings,
        previewClass: VideoPreviewView,
        resultTemplate: _.template(require('text!ev-script/templates/video-result.html')),
        initialize: function(options) {
            ResultsView.prototype.initialize.call(this, options);
        },
        decorate: function($item) {
            // Handle truncation (more/less) of truncatable fields
            $('.trunc .value', $item).each(function(element) {
                var $this = $(this),
                    $full,
                    $short,
                    truncLen = 100,
                    fullText = $this.data('fullText') || $this.html(),
                    truncText = $.truncate(fullText, {
                        length: truncLen,
                        stripTags: true,
                        noBreaks: true
                    });
                $this.empty();
                if ($(window).width() < 1100 && fullText.length > truncLen) {
                    $this.data('fullText', fullText);
                    $full = $('<span>' + fullText + '</span>');
                    $short = $('<span>' + truncText + '</span>');
                    var $shorten = $('<a href="#">Less</a>').click(function(e) {
                        $full.hide();
                        $short.show();
                        e.preventDefault();
                    });
                    var $expand = $('<a href="#">More</a>').click(function(e) {
                        $short.hide();
                        $full.show();
                        e.preventDefault();
                    });
                    $full.hide().append($shorten);
                    $short.append($expand);
                    $this.append($short).append($full);
                } else {
                    $this.append(fullText);
                }
            });
        }
    });

});

define('ev-script/collections/videos',['require','ev-script/collections/base','ev-script/util/cache','underscore'],function(require) {

    'use strict';

    var BaseCollection = require('ev-script/collections/base'),
        cacheUtil = require('ev-script/util/cache'),
        _ = require('underscore');

    return BaseCollection.extend({
        initialize: function(models, options) {
            BaseCollection.prototype.initialize.call(this, models, options);
            this.libraryId = options.libraryId || '';
            this.filterOn = options.filterOn || '';
            this.filterValue = options.filterValue || '';
            if (this.info.checkVersion('>=4.1.0')) {
                this.sourceUrl = options.sourceId === 'shared' ? '/api/SharedLibrary' : '/api/MediaLibrary';
            } else {
                this.sourceUrl = options.sourceId === 'shared' ? '/api/SharedContent' : '/api/Content';
            }
            this.pageIndex = 1;
        },
        _cache: function(key, resp) {
            var cachedValue = null,
                user = this.auth.getUser(),
                userCache = user ? cacheUtil.getUserCache(this.config.ensembleUrl, user.id) : null;
            if (userCache) {
                var videosCache = userCache.get('videos');
                if (!videosCache) {
                    userCache.set('videos', videosCache = new cacheUtil.Cache());
                }
                cachedValue = videosCache[resp ? 'set' : 'get'](key, resp);
            }
            return cachedValue;
        },
        getCached: function(key) {
            return this._cache(key);
        },
        setCached: function(key, resp) {
            return this._cache(key, resp);
        },
        clearCache: function() {
            var user = this.auth.getUser(),
                userCache = user ? cacheUtil.getUserCache(this.config.ensembleUrl, user.id) : null;
            if (userCache) {
                userCache.set('videos', null);
            }
        },
        url: function() {
            var api_url = this.config.ensembleUrl + this.sourceUrl,
                sizeParam = 'PageSize=' + this.config.pageSize,
                indexParam = 'PageIndex=' + this.pageIndex,
                onParam = 'FilterOn=' + encodeURIComponent(this.filterOn),
                valueParam = 'FilterValue=' + encodeURIComponent(this.filterValue),
                url = api_url + '/' + this.libraryId + '?' + sizeParam + '&' + indexParam + '&' + onParam + '&' + valueParam;
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        },
        parse: function(response) {
            var videos = response.Data;
            _.each(videos, function(video) {
                video.Description = _.unescape(video.Description);
                video.Keywords = _.unescape(video.Keywords);
            });
            return videos;
        }
    });

});

define('ev-script/collections/media-workflows',['require','ev-script/collections/base','ev-script/util/cache'],function(require) {

    'use strict';

    var BaseCollection = require('ev-script/collections/base'),
        cacheUtil = require('ev-script/util/cache');

    return BaseCollection.extend({
        initialize: function(models, options) {
            BaseCollection.prototype.initialize.call(this, models, options);
            this.filterValue = options.libraryId || '';
        },
        _cache: function(key, resp) {
            var cachedValue = null,
                user = this.auth.getUser(),
                userCache = user ? cacheUtil.getUserCache(this.config.ensembleUrl, user.id) : null;
            if (userCache) {
                var workflowsCache = userCache.get('workflows');
                if (!workflowsCache) {
                    userCache.set('workflows', workflowsCache = new cacheUtil.Cache());
                }
                cachedValue = workflowsCache[resp ? 'set' : 'get'](key, resp);
            }
            return cachedValue;
        },
        getCached: function(key) {
            return this._cache(key);
        },
        setCached: function(key, resp) {
            return this._cache(key, resp);
        },
        url: function() {
            var api_url = this.config.ensembleUrl + '/api/MediaWorkflows';
            // Make this arbitrarily large so we can retrieve ALL workflows in a single request
            var sizeParam = 'PageSize=9999';
            var indexParam = 'PageIndex=1';
            var onParam = 'FilterOn=LibraryId';
            var valueParam = 'FilterValue=' + encodeURIComponent(this.filterValue);
            var url = api_url + '?' + sizeParam + '&' + indexParam + '&' + onParam + '&' + valueParam;
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        },
        // Override base parse in order to grab settings
        parse: function(response) {
            this.settings = response.Settings;
            return response.Data;
        }
    });

});


define('ev-script/views/workflow-select',['require','underscore','ev-script/views/base','text!ev-script/templates/options.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/options.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'render');
            this.$el.html('<option value="-1">Loading...</option>');
            this.render();
        },
        render: function() {
            var selected = this.collection.findWhere({
                'IsDefault': true
            }) || this.collection.at(0);
            this.$el.html(this.template({
                selectedId: selected.id,
                collection: this.collection
            }));
        },
        getSelected: function() {
            return this.collection.get(this.$('option:selected').val());
        }
    });

});


define('text!ev-script/templates/upload.html',[],function () { return '<form class="upload-form" method="POST" action="">\n    <select class="form-select" name="MediaWorkflowID"></select>\n    <div class="fieldWrap">\n        <label for="Title">Title *</label>\n        <input class="form-text" type="text" name="Title" id="Title" />\n    </div>\n    <div class="fieldWrap">\n        <label for="Description">Description</label>\n        <textarea class="form-text" name="Description" id="Description" />\n    </div>\n    <div class="upload"></div>\n</form>\n';});

define('ev-script/views/upload',['require','jquery','underscore','plupload','ev-script/views/base','backbone','ev-script/views/workflow-select','ev-script/models/video-settings','jquery.plupload.queue','text!ev-script/templates/upload.html'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        plupload = require('plupload'),
        BaseView = require('ev-script/views/base'),
        Backbone = require('backbone'),
        WorkflowSelect = require('ev-script/views/workflow-select'),
        VideoSettings = require('ev-script/models/video-settings');

    // Explicit dependency declaration
    require('jquery.plupload.queue');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/upload.html')),
        events: {
            'change select': 'handleSelect'
        },
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'render', 'decorateUploader', 'closeDialog', 'handleSelect');
            this.field = options.field;
            this.$anchor = this.$el;
            this.setElement(this.template());
            this.$upload = this.$('.upload');
            this.workflows = options.workflows;
            this.workflowSelect = new WorkflowSelect({
                appId: this.appId,
                el: this.$('select')[0],
                collection: this.workflows
            });
            this.render();
            this.decorateUploader();
            this.appEvents.on('hidePickers', this.closeDialog);
        },
        getWidth: function() {
            return Math.min(600, $(window).width() - this.config.dialogMargin);
        },
        getHeight: function() {
            return Math.min(400, $(window).height() - this.config.dialogMargin);
        },
        decorateUploader: function() {
            var extensions = "",
                selected = this.workflowSelect.getSelected(),
                maxUploadSize = parseInt(selected.get('MaxUploadSize'), 10); //,
                // runtimes = 'html5,html4',
                // iOS = (navigator.userAgent.indexOf('iPad') > -1) || (navigator.userAgent.indexOf('iPhone') > -1),
                // MSIE = (navigator.userAgent.indexOf('MSIE') > -1),
                // Android = (navigator.userAgent.indexOf('Android') > -1),
                // SafariVersion5 = (navigator.userAgent.match(/Version\/5.*Safari/i) != null) && (navigator.userAgent.indexOf('Chrome') === -1) && !iOS && !Android;

            // runtime selection based on browser
            // if (iOS) {
            //     runtimes = 'html5,html4';
            // } else if (MSIE) {
            //     runtimes = 'silverlight,html4';
            // } else if (Android) {
            //     runtimes = 'flash,html5,html4';
            // }

            if (this.workflows.settings.SupportedVideo) {
                extensions += this.workflows.settings.SupportedVideo.replace(/\*\./g, '').replace(/;/g, ',').replace(/\s/g, '');
            }

            if (this.workflows.settings.SupportedAudio) {
                extensions += this.workflows.settings.SupportedAudio.replace(/\*\./g, '').replace(/;/g, ',').replace(/\s/g, '');
            }

            if (this.$upload.pluploadQueue()) {
                this.$upload.pluploadQueue().destroy();
            }

            this.$upload.pluploadQueue({
                url: this.workflows.settings.SubmitUrl,
                runtimes: 'html5,html4,flash', //runtimes,
                max_file_size: maxUploadSize > 0 ? maxUploadSize + 'gb' : '12gb',
                max_file_count: 1,
                max_retries: 5,
                chunk_size: '2mb',
                unique_names: false,
                multiple_queues: false,
                multi_selection: false,
                drag_drop: true,
                multipart: true,
                flash_swf_url: this.config.pluploadFlashPath,
                // FIXME
                // silverlight_xap_url: 'FIXME',
                preinit: {
                    Init: _.bind(function(up, info) {
                        // Remove runtime tooltip
                        $('.plupload_container', this.$upload).removeAttr('title');
                        // Change text since we only allow single file upload
                        $('.plupload_add', this.$upload).text('Add file');
                    }, this),
                    PostInit: _.bind(function(up, info) {
                        // Change text since we only allow single file upload
                        $('.plupload_droptext', this.$upload).text('Drag file here.');
                    }, this),
                    UploadFile: _.bind(function(up, file) {
                        up.settings.multipart_params = {
                            'Title': this.$('#Title').val(),
                            'Description': this.$('#Description').val(),
                            'MediaWorkflowID': this.$('select').val()
                        };
                    }, this)
                },
                init: {
                    StateChanged: _.bind(function(up) {
                        switch (up.state) {
                            case plupload.STARTED:
                                if (up.state === plupload.STARTED) {
                                    if ($('.plupload_cancel', this.$upload).length === 0) {
                                        // Add cancel button
                                        this.$cancel = $('<a class="plupload_button plupload_cancel" href="#">Cancel upload</a>')
                                        .insertBefore($('.plupload_filelist_footer .plupload_clearer', this.$upload))
                                        .click(_.bind(function() {
                                            up.stop();
                                            this.decorateUploader();
                                        }, this));
                                    }
                                    if (this.$cancel) {
                                        this.$cancel.show();
                                    }
                                }
                                break;
                            case plupload.STOPPED:
                                if (this.$cancel) {
                                    this.$cancel.hide();
                                }
                                break;
                        }
                    }, this),
                    BeforeUpload: _.bind(function(up, file) {
                        var $title = this.$('#Title'),
                            title = $title.val();
                        if (!title || title.trim() === '') {
                            $title.focus();
                            up.stop();
                            $('.plupload_upload_status', this.$upload).hide();
                            $('.plupload_buttons', this.$upload).show();
                        }
                    }, this),
                    FilesAdded: _.bind(function(up, files) {
                        var validExtensions = extensions.split(',');
                        _.each(files, function(file) {
                            var parts = file.name.split('.'),
                                extension = parts[parts.length - 1];
                            if (!_.contains(validExtensions, extension.toLowerCase())) {
                                up.removeFile(file);
                                up.trigger('Error', {
                                    code : plupload.FILE_EXTENSION_ERROR,
                                    message : plupload.translate('File extension error.'),
                                    file : file
                                });
                            }
                        });
                        // Keep the last file in the queue
                        if (up.files.length > 1) {
                            up.splice(0, up.files.length - 1);
                        }
                    }, this),
                    UploadComplete: _.bind(function() {
                        this.closeDialog();
                    }, this),
                    FileUploaded: _.bind(function(up, file, info) {
                        this.appEvents.trigger('fileUploaded');
                    }, this)
                }
            });
            // Hacks to deal with z-index issue in dialog
            // see https://github.com/moxiecode/plupload/issues/468
            this.$upload.pluploadQueue().bind('refresh', function() {
                $('div.upload > div.plupload').css({ 'z-index': '0' });
                $('.plupload_button').css({ 'z-index': '1' });
            });
            this.$upload.pluploadQueue().refresh();
        },
        closeDialog: function() {
            if (this.$dialog) {
                this.$dialog.dialog('close');
            }
        },
        handleSelect: function(e) {
            this.decorateUploader();
        },
        render: function() {
            var $dialogWrap = $('<div class="dialogWrap"></div>'),
                $dialog;
            this.$anchor.after($dialogWrap);
            this.$dialog = $dialogWrap.dialog({
                title: 'Upload Media to Ensemble',
                modal: true,
                width: this.getWidth(),
                height: this.getHeight(),
                draggable: false,
                resizable: false,
                dialogClass: 'ev-dialog',
                create: _.bind(function(event, ui) {
                    $dialogWrap.html(this.$el);
                }, this),
                close: _.bind(function(event, ui) {
                    this.$upload.pluploadQueue().destroy();
                    $dialogWrap.dialog('destroy').remove();
                    this.appEvents.off('hidePickers', this.closeDialog);
                    this.$dialog = null;
                }, this)
            });
        }
    });

});

define('ev-script/views/video-picker',['require','jquery','underscore','ev-script/views/picker','ev-script/views/search','ev-script/views/library-type-select','ev-script/views/unit-selects','ev-script/views/video-results','ev-script/collections/videos','ev-script/collections/media-workflows','ev-script/views/upload'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        PickerView = require('ev-script/views/picker'),
        SearchView = require('ev-script/views/search'),
        TypeSelectView = require('ev-script/views/library-type-select'),
        UnitSelectsView = require('ev-script/views/unit-selects'),
        VideoResultsView = require('ev-script/views/video-results'),
        Videos = require('ev-script/collections/videos'),
        MediaWorkflows = require('ev-script/collections/media-workflows'),
        UploadView = require('ev-script/views/upload');

    return PickerView.extend({
        initialize: function(options) {
            PickerView.prototype.initialize.call(this, options);
            _.bindAll(this, 'loadVideos', 'loadWorkflows', 'changeLibrary', 'handleSubmit', 'uploadHandler');
            var callback = _.bind(function() {
                    this.loadVideos();
                }, this);
            this.$filterBlock = this.$('div.ev-filter-block');
            if (this.info.get('ApplicationVersion')) {
                this.$record = $('<div class="ev-actions"><button type="button" class="action-record" title="Record"><i class="fa fa-circle fa-fw"></i><span>Record<span></button></div>').css('display', 'none');
                this.$filterBlock.prepend(this.$record);
                this.$upload = $('<div class="ev-actions"><button type="button" class="action-upload" title="Upload"><i class="fa fa-upload fa-fw"></i><span>Upload<span></button></div>').css('display', 'none');
                this.$filterBlock.prepend(this.$upload);
            }
            this.searchView = new SearchView({
                id: this.id + '-search',
                tagName: 'div',
                className: 'ev-search',
                picker: this,
                appId: this.appId,
                callback: callback
            });
            this.$filterBlock.prepend(this.searchView.$el);
            this.searchView.render();
            this.typeSelectView = new TypeSelectView({
                id: this.id + '-type-select',
                tagName: 'div',
                className: 'ev-type-select',
                picker: this,
                appId: this.appId,
                callback: callback
            });
            this.$filterBlock.prepend(this.typeSelectView.$el);
            this.typeSelectView.render();
            if (this.info.get('ApplicationVersion')) {
                this.unitSelects = new UnitSelectsView({
                    id: this.id + '-unit-selects',
                    tagName: 'div',
                    className: 'ev-unit-selects',
                    picker: this,
                    appId: this.appId
                });
                this.$filterBlock.prepend(this.unitSelects.$el);
            }
            this.resultsView = new VideoResultsView({
                el: this.$('div.ev-results'),
                picker: this,
                appId: this.appId
            });
            this.$el.append(this.resultsView.$el);
        },
        events: {
            'click .action-add': 'chooseItem',
            'click .action-upload': 'uploadHandler',
            'click .action-record': 'recordHandler',
            'change .unit-selects select.libraries': 'changeLibrary',
            'submit .unit-selects': 'handleSubmit'
        },
        changeLibrary: function(e) {
            this.loadVideos();
            this.loadWorkflows();
        },
        handleSubmit: function(e) {
            this.loadVideos();
            e.preventDefault();
        },
        uploadHandler: function(e) {
            var uploadView = new UploadView({
                appId: this.appId,
                field: this.field,
                workflows: this.workflows
            });
            e.preventDefault();
        },
        recordHandler: function(e) {
            window.alert('record');
            e.preventDefault();
        },
        showPicker: function() {
            PickerView.prototype.showPicker.call(this);
            if (this.info.get('ApplicationVersion')) {
                this.unitSelects.loadOrgs();
                this.unitSelects.$('select').filter(':visible').first().focus();
            } else {
                this.searchView.$('input[type="text"]').focus();
                this.loadVideos();
            }
        },
        loadVideos: function() {
            var searchVal = $.trim(this.model.get('search').toLowerCase()),
                sourceId = this.model.get('sourceId'),
                libraryId = this.model.get('libraryId'),
                cacheKey = sourceId + libraryId + searchVal,
                videos = new Videos({}, {
                    sourceId: sourceId,
                    libraryId: libraryId,
                    filterOn: '',
                    filterValue: searchVal,
                    appId: this.appId
                }),
                clearVideosCache = _.bind(function() {
                    videos.clearCache();
                    this.loadVideos();
                }, this);
            videos.fetch({
                picker: this,
                cacheKey: cacheKey,
                success: _.bind(function(collection, response, options) {
                    var totalRecords = collection.totalResults = parseInt(response.Pager.TotalRecords, 10);
                    var size = _.size(response.Data);
                    if (size === totalRecords) {
                        collection.hasMore = false;
                    } else {
                        collection.hasMore = true;
                        collection.pageIndex += 1;
                    }
                    this.resultsView.collection = collection;
                    this.resultsView.render();
                }, this),
                error: _.bind(function(collection, xhr, options) {
                    this.ajaxError(xhr, _.bind(function() {
                        this.loadVideos();
                    }, this));
                }, this)
            });
            this.appEvents.off('fileUploaded').on('fileUploaded', clearVideosCache);
        },
        loadWorkflows: function() {
            this.workflows = new MediaWorkflows({}, {
                appId: this.appId
            });
            // FIXME - add libraryId (as with playlists)
            this.workflows.filterValue = this.model.get('libraryId');
            this.workflows.fetch({
                cacheKey: this.workflows.filterValue,
                success: _.bind(function(collection, response, options) {
                    var currentUser = this.auth.getUser(),
                        canRecord = this.info.anthemEnabled && currentUser && currentUser.get('CanUseAnthem');
                    if (!collection.isEmpty()) {
                        this.$upload.css('display', 'inline-block');
                        if (canRecord) {
                            this.$record.css('display', 'inline-block');
                        }
                    } else {
                        this.$upload.css('display', 'none');
                        this.$record.css('display', 'none');
                    }
                    // This is the last portion of the filter block that loads
                    // so now it should be fully rendered...resize our results
                    // to make sure they have the proper height.
                    // TODO - better place for this? Or better method of
                    // handling?
                    this.resizeResults();
                }, this),
                error: _.bind(function(collection, xhr, options) {
                    this.ajaxError(xhr, _.bind(function() {
                        this.loadWorkflows();
                    }, this));
                }, this),
                reset: true
            });
        },
        resizeResults: function() {
            if (this.config.fitToParent) {
                this.resultsView.setHeight(this.$el.height() - this.hider.$el.outerHeight(true) - this.$filterBlock.outerHeight(true));
            }
        }
    });

});

define('ev-script/views/settings',['require','underscore','ev-script/views/base','jquery-ui'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    require('jquery-ui');

    return BaseView.extend({
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'show', 'cancelHandler', 'submitHandler');
            this.field = options.field;
        },
        events: {
            'submit': 'submitHandler',
            'click .action-cancel': 'cancelHandler'
        },
        show: function() {
            this.render();
            this.$el.dialog('open');
        },
        cancelHandler: function(e) {
            this.$el.dialog('close');
            e.preventDefault();
        },
        submitHandler: function(e) {
            this.updateModel();
            this.$el.dialog('close');
            e.preventDefault();
        },
        // Override me
        updateModel: function() {}
    });

});


define('text!ev-script/templates/video-settings.html',[],function () { return '<form>\n    <fieldset>\n        <div class="fieldWrap">\n            <label for="size">Size</label>\n            <select class="form-select size" id="size" name="size" <% if (isAudio) { print(\'disabled\'); } %> >\n                <option value="original">Original</option>\n            </select>\n        </div>\n        <div>\n            <div class="fieldWrap">\n                <input id="showtitle" class="form-checkbox" <% if (model.get(\'showtitle\')) { print(\'checked="checked"\'); } %> name="showtitle" type="checkbox"/>\n                <label for="showtitle">Title</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="socialsharing" class="form-checkbox" <% if (model.get(\'socialsharing\')) { print(\'checked="checked"\'); } %> name="socialsharing" type="checkbox"/>\n                <label for="socialsharing">Social Tools</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="annotations" class="form-checkbox" <% if (model.get(\'annotations\')) { print(\'checked="checked"\'); } %> name="annotations" type="checkbox"/>\n                <label for="annotations">Annotations</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="captionsearch" class="form-checkbox" <% if (model.get(\'captionsearch\')) { print(\'checked="checked"\'); } %> name="captionsearch" type="checkbox"/>\n                <label for="captionsearch">Caption Search</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="autoplay" class="form-checkbox" <% if (model.get(\'autoplay\')) { print(\'checked="checked"\'); } %>  name="autoplay" type="checkbox"/>\n                <label for="autoplay">Auto Play (PC Only)</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="attachments" class="form-checkbox" <% if (model.get(\'attachments\')) { print(\'checked="checked"\'); } %> name="attachments" type="checkbox"/>\n                <label for="attachments">Attachments</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="links" class="form-checkbox" <% if (model.get(\'links\')) { print(\'checked="checked"\'); } %> name="links" type="checkbox"/>\n                <label for="links">Links</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="metadata" class="form-checkbox" <% if (model.get(\'metadata\')) { print(\'checked="checked"\'); } %> name="metadata" type="checkbox"/>\n                <label for="metadata">Meta Data</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="dateproduced" class="form-checkbox" <% if (model.get(\'dateproduced\')) { print(\'checked="checked"\'); } %> name="dateproduced" type="checkbox"/>\n                <label for="dateproduced">Date Produced</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="embedcode" class="form-checkbox" <% if (model.get(\'embedcode\')) { print(\'checked="checked"\'); } %> name="embedcode" type="checkbox"/>\n                <label for="embedcode">Embed Code</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="download" class="form-checkbox" <% if (model.get(\'download\')) { print(\'checked="checked"\'); } %> name="download" type="checkbox"/>\n                <label for="download">Download Link</label>\n            </div>\n            <div class="fieldWrap">\n                <input id="showcaptions" class="form-checkbox" <% if (model.get(\'showcaptions\')) { print(\'checked="checked"\'); } %>  name="showcaptions" type="checkbox"/>\n                <label for="showcaptions">Captions "On" By Default</label>\n            </div>\n        </div>\n        <div class="form-actions">\n            <button type="submit" class="form-submit action-submit" value="Submit"><i class="fa fa-save"></i><span>Save</span></button>\n            <button type="button" class="form-submit action-cancel" value="Cancel"><i class="fa fa-times"></i><span>Cancel</span></button>\n        </div>\n    </fieldset>\n</form>\n';});


define('text!ev-script/templates/video-settings-legacy.html',[],function () { return '<form>\n    <fieldset>\n        <div class="fieldWrap">\n            <label for="size">Size</label>\n            <select class="form-select size" id="size" name="size" <% if (isAudio) { print(\'disabled\'); } %> >\n                <option value="original">Original</option>\n            </select>\n        </div>\n        <div class="fieldWrap">\n            <label for="showtitle">Show Title</label>\n            <input id="showtitle" class="form-checkbox" <% if (model.get(\'showtitle\')) { print(\'checked="checked"\'); } %> name="showtitle" type="checkbox"/>\n        </div>\n        <div class="fieldWrap">\n            <label for="autoplay">Auto Play</label>\n            <input id="autoplay" class="form-checkbox" <% if (model.get(\'autoplay\')) { print(\'checked="checked"\'); } %>  name="autoplay" type="checkbox"/>\n        </div>\n        <div class="fieldWrap">\n            <label for="showcaptions">Show Captions</label>\n            <input id="showcaptions" class="form-checkbox" <% if (model.get(\'showcaptions\')) { print(\'checked="checked"\'); } %>  name="showcaptions" type="checkbox" <% if (isAudio) { print(\'disabled\'); } %> />\n        </div>\n        <div class="fieldWrap">\n            <label for="hidecontrols">Hide Controls</label>\n            <input id="hidecontrols" class="form-checkbox" <% if (model.get(\'hidecontrols\')) { print(\'checked="checked"\'); } %>  name="hidecontrols" type="checkbox" <% if (isAudio) { print(\'disabled\'); } %> />\n        </div>\n        <div class="form-actions">\n            <input type="button" class="form-submit action-cancel" value="Cancel"/>\n            <input type="submit" class="form-submit action-submit" value="Submit"/>\n        </div>\n    </fieldset>\n</form>\n';});


define('text!ev-script/templates/sizes.html',[],function () { return '<% _.each(sizes, function(size) { %>\n    <option value="<%= size %>" <% if (size === target) { print(\'selected="selected"\'); } %>><%= size %></option>\n<% }); %>\n';});

define('ev-script/views/video-settings',['require','jquery','underscore','ev-script/views/settings','jquery-ui','text!ev-script/templates/video-settings.html','text!ev-script/templates/video-settings-legacy.html','text!ev-script/templates/sizes.html'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        SettingsView = require('ev-script/views/settings');

    require('jquery-ui');

    return SettingsView.extend({
        template: _.template(require('text!ev-script/templates/video-settings.html')),
        legacyTemplate: _.template(require('text!ev-script/templates/video-settings-legacy.html')),
        sizesTemplate: _.template(require('text!ev-script/templates/sizes.html')),
        initialize: function(options) {
            SettingsView.prototype.initialize.call(this, options);
            this.encoding = options.encoding;
            this.encoding.on('change:id', _.bind(function() {
                this.render();
            }, this));
        },
        updateModel: function() {
            var attrs = {
                'showtitle': this.$('#showtitle').is(':checked'),
                'autoplay': this.$('#autoplay').is(':checked'),
                'showcaptions': this.$('#showcaptions').is(':checked'),
                'hidecontrols': this.$('#hidecontrols').is(':checked')
            };
            if (!this.info.useLegacyEmbeds()) {
                attrs = _.extend(attrs, {
                    'socialsharing': this.$('#socialsharing').is(':checked'),
                    'annotations': this.$('#annotations').is(':checked'),
                    'captionsearch': this.$('#captionsearch').is(':checked'),
                    'attachments': this.$('#attachments').is(':checked'),
                    'links': this.$('#links').is(':checked'),
                    'metadata': this.$('#metadata').is(':checked'),
                    'dateproduced': this.$('#dateproduced').is(':checked'),
                    'embedcode': this.$('#embedcode').is(':checked'),
                    'download': this.$('#download').is(':checked')
                });
            }
            var sizeVal = this.$('#size').val();
            if (!sizeVal || sizeVal === 'original') {
                // isNew signifies that the encoding hasn't been fetched yet
                if (this.encoding && !this.encoding.isNew()) {
                    _.extend(attrs, {
                        width: this.encoding.getWidth(),
                        height: this.encoding.getHeight()
                    });
                }
            } else {
                var dims = sizeVal.split('x');
                _.extend(attrs, {
                    width: parseInt(dims[0], 10),
                    height: parseInt(dims[1], 10)
                });
            }
            this.field.model.set(attrs);
        },
        renderSize: function() {
            var width = this.field.model.get('width'),
                height = this.field.model.get('height'),
                ratio = 16 / 9,
                options = ['1280x720', '1024x576', '848x480', '720x405', '640x360', '610x344', '560x315', '480x270', '400x225', '320x180', '240x135', '160x90'];
            if (width && height) {
               ratio = width / height;
            } else if (this.encoding.id) {
                width = this.encoding.getWidth();
                height = this.encoding.getHeight();
                ratio = this.encoding.getRatio();
            }
            // Use a fuzz factor to determine ratio equality since our sizes are not always accurate
            if (Math.ceil(ratio * 10) / 10 === Math.ceil((4 / 3) * 10) / 10) {
                options = ['1280x960', '1024x770', '848x636', '720x540', '640x480', '610x460', '560x420', '480x360', '400x300', '320x240', '240x180', '160x120'];
            }
            var size = width + 'x' + height;
            if (this.config.defaultVideoWidth) {
                // Find the first available option that matches our desired width
                var override = _.find(options, _.bind(function(option) { return new RegExp('^' + this.config.defaultVideoWidth).test(option); }, this));
                size = override || size;
            }
            this.$('.size').append(this.sizesTemplate({
                sizes: options,
                target: size
            }));
        },
        render: function() {
            var html = '';
            if (!this.info.useLegacyEmbeds()) {
                html = this.template({
                    model: this.field.model,
                    isAudio: this.encoding && this.encoding.isAudio()
                });
            } else {
                html = this.legacyTemplate({
                    model: this.field.model,
                    isAudio: this.encoding && this.encoding.isAudio()
                });
            }
            this.$el.html(html);
            if (this.encoding && !this.encoding.isAudio()) {
                this.renderSize();
            }
            var content = this.field.model.get('content');
            this.$el.dialog({
                title: this.unencode(content ? content.Title : this.field.model.get('id')),
                modal: true,
                autoOpen: false,
                draggable: false,
                resizable: false,
                dialogClass: 'ev-dialog',
                width: Math.min(680, $(window).width() - this.config.dialogMargin),
                height: Math.min(240, $(window).height() - this.config.dialogMargin)
            });
        }
    });

});


define('text!ev-script/templates/playlist-embed.html',[],function () { return '<iframe src="<%- ensembleUrl %>/app/plugin/embed.aspx?DestinationID=<%- modelId %>&playlistEmbed=true&isNewPluginEmbed=true&hideControls=true&displayTitle=true&displayEmbedCode=<%- displayEmbedCode %>&displayStatistics=<%- displayStatistics %>&displayVideoDuration=<%- displayDuration %>&displayAttachments=<%- displayAttachments %>&displayAnnotations=<%- displayAnnotations %>&displayLinks=<%- displayLinks %>&displayCredits=<%- displayCredits %>&displaySharing=<%- displaySharing %>&autoPlay=<%- autoPlay %>&showCaptions=<%- showCaptions %>&displayDateProduced=<%- displayDateProduced %>&audioPreviewImage=<%- audioPreviewImage %>&displayCaptionSearch=<%- displayCaptionSearch %>&<% if (isShowcase) { print(showcaseParams); } else { print(playlistParams); } %>"\n        frameborder="0"\n        style="width:<%- width %>px;height:<%- height %>px;"\n        width="<%- width %>"\n        height="<%- height %>"\n        allowfullscreen>\n</iframe>\n';});


define('text!ev-script/templates/playlist-embed-legacy.html',[],function () { return '<iframe src="<%- ensembleUrl %>/app/plugin/embed.aspx?DestinationID=<%- modelId %>"\n        frameborder="0"\n        style="width:<%- width %>px;height:<%- height %>px;"\n        width="<%- width %>"\n        height="<%- height %>"\n        allowfullscreen>\n</iframe>\n';});


define('text!ev-script/templates/playlist-embed-playlist-params.html',[],function () { return 'orderBy=<%- playlistSortBy %>&orderByDirection=<%- playlistSortDirection %>\n';});


define('text!ev-script/templates/playlist-embed-showcase-params.html',[],function () { return 'displayShowcase=true<% if (categoryList) { %>&displayCategoryList=true&categoryOrientation=<%- categoryOrientation %><% } %>\n';});

define('ev-script/views/playlist-embed',['require','underscore','ev-script/views/base','text!ev-script/templates/playlist-embed.html','text!ev-script/templates/playlist-embed-legacy.html','text!ev-script/templates/playlist-embed-playlist-params.html','text!ev-script/templates/playlist-embed-showcase-params.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseView = require('ev-script/views/base');

    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/playlist-embed.html')),
        legacyTemplate: _.template(require('text!ev-script/templates/playlist-embed-legacy.html')),
        playlistParamsTemplate: _.template(require('text!ev-script/templates/playlist-embed-playlist-params.html')),
        showcaseParamsTemplate: _.template(require('text!ev-script/templates/playlist-embed-showcase-params.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            var embed = '';
            if (!this.info.useLegacyEmbeds()) {
                var data = {
                    modelId: this.model.get('id'),
                    width: this.model.get('width'),
                    height: this.model.get('height'),
                    ensembleUrl: this.config.ensembleUrl,
                    displayEmbedCode: this.model.get('embedcode'),
                    displayStatistics: this.model.get('statistics'),
                    displayDuration: this.model.get('duration'),
                    displayAttachments: this.model.get('attachments'),
                    displayAnnotations: this.model.get('annotations'),
                    displayLinks: this.model.get('links'),
                    displayCredits: this.model.get('credits'),
                    displaySharing: this.model.get('socialsharing'),
                    autoPlay: this.model.get('autoplay'),
                    showCaptions: this.model.get('showcaptions'),
                    displayDateProduced: this.model.get('dateproduced'),
                    audioPreviewImage: this.model.get('audiopreviewimage'),
                    displayCaptionSearch: this.model.get('captionsearch')
                };
                if (this.model.get('layout') === 'showcase') {
                    var showcaseLayout = this.model.get('showcaseLayout');
                    data = _.extend(data, {
                        isShowcase: true,
                        showcaseParams: this.showcaseParamsTemplate({
                            // featuredContent: showcaseLayout.featuredContent,
                            categoryList: showcaseLayout.categoryList,
                            categoryOrientation: showcaseLayout.categoryOrientation
                        })
                    });
                } else {
                    var playlistLayout = this.model.get('playlistLayout');
                    data = _.extend(data, {
                        isShowcase: false,
                        playlistParams: this.playlistParamsTemplate({
                            playlistSortBy: playlistLayout.playlistSortBy,
                            playlistSortDirection: playlistLayout.playlistSortDirection
                        })
                    });
                }
                embed = this.template(data);
            } else {
                embed = this.legacyTemplate({
                    modelId: this.model.get('id'),
                    width: this.model.get('width'),
                    height: this.model.get('height'),
                    ensembleUrl: this.config.ensembleUrl
                });
            }
            this.$el.html(embed);
        }
    });

});

define('ev-script/views/playlist-preview',['require','ev-script/views/preview','ev-script/views/playlist-embed'],function(require) {

    'use strict';

    var PreviewView = require('ev-script/views/preview'),
        PlaylistEmbedView = require('ev-script/views/playlist-embed');

    return PreviewView.extend({
        initialize: function(options) {
            PreviewView.prototype.initialize.call(this, options);
        },
        embedClass: PlaylistEmbedView
    });

});


define('text!ev-script/templates/playlist-result.html',[],function () { return '<tr class="<%= (index % 2 ? \'odd\' : \'even\') %>">\n    <td class="content-actions">\n        <div class="action-links">\n            <a class="action-add" href="#" title="Choose <%- item.get(\'Name\') %>" rel="<%= item.get(\'ID\') %>">\n                <i class="fa fa-plus-circle fa-lg"></i><span>Choose</span>\n            </a>\n            <a class="action-preview" href="#" title="Preview: <%- item.get(\'Name\') %>" rel="<%= item.get(\'ID\') %>">\n                <i class="fa fa-play-circle fa-lg"></i><span>Preview: <%- item.get(\'Name\') %></span>\n            </a>\n        </div>\n    </td>\n    <td class="content-meta">\n        <% if (item.get(\'IsSecure\')) { print(\'<span class="item-security"><i class="fa fa-lock fa-lg"></i></span>\'); } %>\n        <span><%- item.get(\'Name\') %></span>\n    </td>\n</tr>\n';});

define('ev-script/views/playlist-results',['require','underscore','jquery','ev-script/views/results','ev-script/models/playlist-settings','ev-script/views/playlist-preview','text!ev-script/templates/playlist-result.html'],function(require) {

    'use strict';

    var _ = require('underscore'),
        $ = require('jquery'),
        ResultsView = require('ev-script/views/results'),
        PlaylistSettings = require('ev-script/models/playlist-settings'),
        PlaylistPreviewView = require('ev-script/views/playlist-preview');

    return ResultsView.extend({
        modelClass: PlaylistSettings,
        previewClass: PlaylistPreviewView,
        resultTemplate: _.template(require('text!ev-script/templates/playlist-result.html')),
        initialize: function(options) {
            ResultsView.prototype.initialize.call(this, options);
        }
    });

});

define('ev-script/collections/playlists',['require','ev-script/collections/base','ev-script/util/cache'],function(require) {

    'use strict';

    var BaseCollection = require('ev-script/collections/base'),
        cacheUtil = require('ev-script/util/cache');

    return BaseCollection.extend({
        initialize: function(models, options) {
            BaseCollection.prototype.initialize.call(this, models, options);
            this.libraryId = options.libraryId || '';
            this.filterValue = options.filterValue || '';
            this.pageIndex = 1;
        },
        _cache: function(key, resp) {
            var cachedValue = null,
                user = this.auth.getUser(),
                userCache = user ? cacheUtil.getUserCache(this.config.ensembleUrl, user.id) : null;
            if (userCache) {
                var playlistsCache = userCache.get('playlists');
                if (!playlistsCache) {
                    userCache.set('playlists', playlistsCache = new cacheUtil.Cache());
                }
                cachedValue = playlistsCache[resp ? 'set' : 'get'](key, resp);
            }
            return cachedValue;
        },
        getCached: function(key) {
            return this._cache(key);
        },
        setCached: function(key, resp) {
            return this._cache(key, resp);
        },
        url: function() {
            var api_url = this.config.ensembleUrl + '/api/Playlists',
                sizeParam = 'PageSize=' + this.config.pageSize,
                indexParam = 'PageIndex=' + this.pageIndex,
                url, onParam, valueParam;
            if (this.info.get('ApplicationVersion')) {
                onParam = 'FilterOn=Name';
                valueParam = 'FilterValue=' + encodeURIComponent(this.filterValue);
                url = api_url + '/' + encodeURIComponent(this.libraryId) + '?' + sizeParam + '&' + indexParam + (this.filterValue ? '&' + onParam + '&' + valueParam : '');
            } else {
                onParam = 'FilterOn=LibraryId';
                valueParam = 'FilterValue=' + encodeURIComponent(this.libraryId);
                url = api_url + '?' + sizeParam + '&' + indexParam + '&' + onParam + '&' + valueParam;
            }
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        }
    });

});

define('ev-script/views/playlist-picker',['require','jquery','underscore','ev-script/views/picker','ev-script/views/unit-selects','ev-script/views/search','ev-script/views/playlist-results','ev-script/collections/playlists'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        PickerView = require('ev-script/views/picker'),
        UnitSelectsView = require('ev-script/views/unit-selects'),
        SearchView = require('ev-script/views/search'),
        PlaylistResultsView = require('ev-script/views/playlist-results'),
        Playlists = require('ev-script/collections/playlists');

    return PickerView.extend({
        initialize: function(options) {
            PickerView.prototype.initialize.call(this, options);
            _.bindAll(this, 'loadPlaylists', 'changeLibrary', 'handleSubmit');
            this.$filterBlock = this.$('div.ev-filter-block');
            if (this.info.get('ApplicationVersion')) {
                this.searchView = new SearchView({
                    id: this.id + '-search',
                    tagName: 'div',
                    className: 'ev-search',
                    picker: this,
                    appId: this.appId,
                    callback: _.bind(function() {
                        this.loadPlaylists();
                    }, this)
                });
                this.$filterBlock.prepend(this.searchView.$el);
                this.searchView.render();
            }
            this.unitSelects = new UnitSelectsView({
                id: this.id + '-unit-selects',
                tagName: 'div',
                className: 'ev-unit-selects',
                picker: this,
                appId: this.appId
            });
            this.$filterBlock.prepend(this.unitSelects.$el);
            this.resultsView = new PlaylistResultsView({
                el: this.$('div.ev-results'),
                picker: this,
                appId: this.appId
            });
            this.$el.append(this.resultsView.$el);
        },
        events: {
            'click a.action-add': 'chooseItem',
            'change .unit-selects select.libraries': 'changeLibrary',
            'submit .unit-selects': 'handleSubmit'
        },
        changeLibrary: function(e) {
            this.loadPlaylists();
        },
        handleSubmit: function(e) {
            this.loadPlaylists();
            e.preventDefault();
        },
        showPicker: function() {
            PickerView.prototype.showPicker.call(this);
            this.unitSelects.loadOrgs();
            this.unitSelects.$('select').filter(':visible').first().focus();
        },
        loadPlaylists: function() {
            var searchVal = $.trim(this.model.get('search').toLowerCase()),
                libraryId = this.model.get('libraryId'),
                playlists = new Playlists({}, {
                    libraryId: libraryId,
                    filterValue: searchVal,
                    appId: this.appId
                });
            playlists.fetch({
                picker: this,
                cacheKey: libraryId + searchVal,
                success: _.bind(function(collection, response, options) {
                    var totalRecords = collection.totalResults = parseInt(response.Pager.TotalRecords, 10);
                    var size = _.size(response.Data);
                    if (size === totalRecords) {
                        collection.hasMore = false;
                    } else {
                        collection.hasMore = true;
                        collection.pageIndex += 1;
                    }
                    this.resultsView.collection = collection;
                    this.resultsView.render();
                    // TODO - better place for this?
                    this.resizeResults();
                }, this),
                error: _.bind(function(collection, xhr, options) {
                    this.ajaxError(xhr, _.bind(function() {
                        this.loadPlaylists();
                    }, this));
                }, this)
            });
        },
        resizeResults: function() {
            if (this.config.fitToParent) {
                this.resultsView.setHeight(this.$el.height() - this.hider.$el.outerHeight(true) - this.$filterBlock.outerHeight(true));
            }
        }
    });

});


define('text!ev-script/templates/playlist-settings.html',[],function () { return '<form>\n    <fieldset>\n        <div class="accordion">\n            <h4>Choose Layout</h4>\n            <div>\n                <div class="fieldWrap">\n                    <input id="playlist" class="form-radio" <% if (model.get(\'layout\') === \'playlist\') { print(\'checked="checked"\'); } %> name="layout" value="playlist" type="radio"/>\n                    <label for="playlist">Playlist</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="showcase" class="form-radio" <% if (model.get(\'layout\') === \'showcase\') { print(\'checked="checked"\'); } %> name="layout" value="showcase" type="radio"/>\n                    <label for="showcase">Showcase</label>\n                </div>\n            </div>\n            <h4>Layout Options</h4>\n            <div>\n                <div class="playlistOptions" <% if (model.get(\'layout\') === \'showcase\') { print(\'style="display:none;"\'); } %>>\n                    <div class="fieldWrap">\n                        <label for="playlistSortBy">Sort By</label>\n                        <select id="playlistSortBy" class="form-select">\n                            <option value="videoDate" <% if (model.get(\'playlistLayout\').playlistSortBy === \'videoDate\') { print(\'selected="selected"\'); } %>>Date Added</option>\n                            <option value="videoDateProduced" <% if (model.get(\'playlistLayout\').playlistSortBy === \'videoDateProduced\') { print(\'selected="selected"\'); } %>>Date Produced</option>\n                            <option value="videoDescription" <% if (model.get(\'playlistLayout\').playlistSortBy === \'videoDescription\') { print(\'selected="selected"\'); } %>>Description</option>\n                            <option value="videoTitle" <% if (model.get(\'playlistLayout\').playlistSortBy === \'videoTitle\') { print(\'selected="selected"\'); } %>>Title</option>\n                            <option value="videoDuration" <% if (model.get(\'playlistLayout\').playlistSortBy === \'videoDuration\') { print(\'selected="selected"\'); } %>>Duration</option>\n                            <option value="videoKeywords" <% if (model.get(\'playlistLayout\').playlistSortBy === \'videoKeywords\') { print(\'selected="selected"\'); } %>>Keywords</option>\n                            <!-- <option value="videoCustomPosition">Custom Order</option> -->\n                        </select>\n                    </div>\n                    <div>\n                        <div class="fieldWrap">\n                            <input id="playlistSortDirectionAsc" class="form-radio" <% if (model.get(\'playlistLayout\').playlistSortDirection === \'asc\') { print(\'checked="checked"\'); } %> name="playlistSortDirection" value="asc" type="radio"/>\n                            <label for="playlist">Ascending</label>\n                        </div>\n                        <div class="fieldWrap">\n                            <input id="playlistSortDirectionDesc" class="form-radio" <% if (model.get(\'playlistLayout\').playlistSortDirection === \'desc\') { print(\'checked="checked"\'); } %> name="playlistSortDirection" value="desc" type="radio"/>\n                            <label for="playlist">Descending</label>\n                        </div>\n                    </div>\n                </div>\n                <div class="showcaseOptions" <% if (model.get(\'layout\') === \'playlist\') { print(\'style="display:none;"\'); } %>>\n<!--\n                    <div class="fieldWrap">\n                        <input id="featuredContent" class="form-checkbox" type="checkbox" name="featuredContent" <% if (model.get(\'showcaseLayout\').featuredContent) { print(\'checked="checked"\'); } %>/>\n                        <label for="featuredContent">Featured Content</label>\n                    </div>\n -->\n                    <div class="fieldWrap">\n                        <input id="categoryList" class="form-checkbox" type="checkbox" name="categoryList" <% if (model.get(\'showcaseLayout\').categoryList) { print(\'checked="checked"\'); } %>/>\n                        <label for="categoryList">Category List</label>\n                    </div>\n                    <div>\n                        <div class="fieldWrap">\n                            <input id="categoryOrientationHorizontal" class="form-radio" <% if (model.get(\'showcaseLayout\').categoryOrientation === \'horizontal\') { print(\'checked="checked"\'); } %> <% if (!model.get(\'showcaseLayout\').categoryList) { print(\'disabled\'); } %> name="categoryOrientation" value="horizontal" type="radio"/>\n                            <label for="playlist">Horizontal</label>\n                        </div>\n                        <div class="fieldWrap">\n                            <input id="categoryOrientationVertical" class="form-radio" <% if (model.get(\'showcaseLayout\').categoryOrientation === \'vertical\') { print(\'checked="checked"\'); } %> <% if (!model.get(\'showcaseLayout\').categoryList) { print(\'disabled\'); } %> name="categoryOrientation" value="vertical" type="radio"/>\n                            <label for="playlist">Vertical</label>\n                        </div>\n                    </div>\n                </div>\n            </div>\n            <h4>Content Details</h4>\n            <div>\n                <div class="fieldWrap">\n                    <input id="embedcode" class="form-checkbox" <% if (!isSecure && model.get(\'embedcode\')) { print(\'checked="checked"\'); } %> name="embedcode" type="checkbox" <% if (isSecure) { print(\'disabled\') } %> />\n                    <label for="embedcode">Embed Code</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="statistics" class="form-checkbox" <% if (model.get(\'statistics\')) { print(\'checked="checked"\'); } %> name="statistics" type="checkbox"/>\n                    <label for="statistics">Statistics</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="duration" class="form-checkbox" <% if (model.get(\'duration\')) { print(\'checked="checked"\'); } %> name="duration" type="checkbox"/>\n                    <label for="duration">Duration</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="attachments" class="form-checkbox" <% if (model.get(\'attachments\')) { print(\'checked="checked"\'); } %> name="attachments" type="checkbox"/>\n                    <label for="attachments">Attachments</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="annotations" class="form-checkbox" <% if (model.get(\'annotations\')) { print(\'checked="checked"\'); } %> name="annotations" type="checkbox"/>\n                    <label for="annotations">Annotations</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="links" class="form-checkbox" <% if (model.get(\'links\')) { print(\'checked="checked"\'); } %> name="links" type="checkbox"/>\n                    <label for="links">Links</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="credits" class="form-checkbox" <% if (model.get(\'credits\')) { print(\'checked="checked"\'); } %> name="credits" type="checkbox"/>\n                    <label for="credits">Credits</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="socialsharing" class="form-checkbox" <% if (!isSecure && model.get(\'socialsharing\')) { print(\'checked="checked"\'); } %> name="socialsharing" type="checkbox" <% if (isSecure) { print(\'disabled\') } %> />\n                    <label for="socialsharing">Social Tools</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="autoplay" class="form-checkbox" <% if (model.get(\'autoplay\')) { print(\'checked="checked"\'); } %>  name="autoplay" type="checkbox"/>\n                    <label for="autoplay">Auto Play (PC Only)</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="showcaptions" class="form-checkbox" <% if (model.get(\'showcaptions\')) { print(\'checked="checked"\'); } %>  name="showcaptions" type="checkbox"/>\n                    <label for="showcaptions">Captions "On" By Default</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="dateproduced" class="form-checkbox" <% if (model.get(\'dateproduced\')) { print(\'checked="checked"\'); } %> name="dateproduced" type="checkbox"/>\n                    <label for="dateproduced">Date Produced</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="audiopreviewimage" class="form-checkbox" <% if (model.get(\'audiopreviewimage\')) { print(\'checked="checked"\'); } %> name="audiopreviewimage" type="checkbox"/>\n                    <label for="audiopreviewimage">Audio Preview Image</label>\n                </div>\n                <div class="fieldWrap">\n                    <input id="captionsearch" class="form-checkbox" <% if (model.get(\'captionsearch\')) { print(\'checked="checked"\'); } %> name="captionsearch" type="checkbox"/>\n                    <label for="captionsearch">Caption Search</label>\n                </div>\n            </div>\n        </div>\n        <div class="form-actions">\n            <button type="submit" class="form-submit action-submit" value="Submit"><i class="fa fa-save"></i><span>Save</span></button>\n            <button type="button" class="form-submit action-cancel" value="Cancel"><i class="fa fa-times"></i><span>Cancel</span></button>\n        </div>\n    </fieldset>\n</form>\n';});

define('ev-script/views/playlist-settings',['require','jquery','underscore','ev-script/views/settings','jquery-ui','text!ev-script/templates/playlist-settings.html'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        SettingsView = require('ev-script/views/settings');

    require('jquery-ui');

    return SettingsView.extend({
        template: _.template(require('text!ev-script/templates/playlist-settings.html')),
        initialize: function(options) {
            SettingsView.prototype.initialize.call(this, options);
            _.bindAll(this, 'changeLayout', 'changeCategoryList');
        },
        events: {
            'submit': 'submitHandler',
            'click .action-cancel': 'cancelHandler',
            'change input[name="layout"]': 'changeLayout',
            'change input[name="categoryList"]': 'changeCategoryList'
        },
        updateModel: function() {
            var content = this.field.model.get('content'),
                attrs = {
                    'layout': this.$('input[name="layout"]:checked').val(),
                    'embedcode': content && content.IsSecure ? false : this.$('#embedcode').is(':checked'),
                    'statistics': this.$('#statistics').is(':checked'),
                    'duration': this.$('#duration').is(':checked'),
                    'attachments': this.$('#attachments').is(':checked'),
                    'annotations': this.$('#annotations').is(':checked'),
                    'links': this.$('#links').is(':checked'),
                    'credits': this.$('#credits').is(':checked'),
                    'socialsharing': content && content.IsSecure ? false : this.$('#socialsharing').is(':checked'),
                    'autoplay': this.$('#autoplay').is(':checked'),
                    'showcaptions': this.$('#showcaptions').is(':checked'),
                    'dateproduced': this.$('#dateproduced').is(':checked'),
                    'audiopreviewimage': this.$('#audiopreviewimage').is(':checked'),
                    'captionsearch': this.$('#captionsearch').is(':checked')
                };
            if (attrs.layout === 'playlist') {
                attrs.playlistLayout = {
                    playlistSortBy: this.$('#playlistSortBy option:selected').val(),
                    playlistSortDirection: this.$('input[name="playlistSortDirection"]:checked').val()
                };
            } else {
                attrs.showcaseLayout = {
                    // featuredContent: this.$('#featuredContent').is(':checked')
                    categoryList: this.$('#categoryList').is(':checked'),
                    categoryOrientation: this.$('input[name="categoryOrientation"]:checked').val()
                };
            }
            this.field.model.set(attrs);
        },
        render: function() {
            var content = this.field.model.get('content'),
                html = this.template({
                    model: this.field.model,
                    isAudio: this.encoding && this.encoding.isAudio(),
                    isSecure: content && content.IsSecure
                });
            this.$el.html(html);
            this.$('.accordion').accordion({
                active: 2,
                heightStyle: 'content',
                collapsible: true
            });
            this.$el.dialog({
                title: this.unencode(content ? content.Name : this.field.model.get('id')),
                modal: true,
                autoOpen: false,
                draggable: false,
                resizable: false,
                dialogClass: 'ev-dialog',
                width: Math.min(680, $(window).width() - this.config.dialogMargin),
                height: Math.min(420, $(window).height() - this.config.dialogMargin)
            });
        },
        changeLayout: function(e) {
            if (e.currentTarget.value === 'playlist') {
                this.$('.playlistOptions').show();
                this.$('.showcaseOptions').hide();
            } else {
                this.$('.playlistOptions').hide();
                this.$('.showcaseOptions').show();
            }
        },
        changeCategoryList: function(e) {
            if ($(e.currentTarget).is(':checked')) {
                this.$('#categoryOrientationHorizontal').attr('disabled', false);
                this.$('#categoryOrientationVertical').attr('disabled', false);
            } else {
                this.$('#categoryOrientationHorizontal').attr('disabled', true);
                this.$('#categoryOrientationVertical').attr('disabled', true);
            }
        }
    });

});


define('text!ev-script/templates/field.html',[],function () { return '<div class="logo">\n    <a target="_blank" href="<%= ensembleUrl %>"><span>Ensemble Logo</span></a>\n</div>\n<% if (modelId) { %>\n    <% if (thumbnailUrl) { %>\n        <div class="thumbnail">\n            <img alt="Media thumbnail" src="<%= thumbnailUrl %>"/>\n        </div>\n    <% } %>\n    <div class="title"><%= name %></div>\n    <div class="ev-actions">\n        <a href="#" class="action-choose" title="Change <%= label %>"><i class="fa fa-folder-open fa-lg"></i><span>Change <%= label %><span></a>\n        <a href="#" class="action-preview" title="Preview: <%= name %>"><i class="fa fa-play-circle fa-lg"></i><span>Preview: <%= name %><span></a>\n        <% if (type === \'video\' || showPlaylistOptions) { %>\n            <a href="#" class="action-options" title="<%= label %> Embed Options"><i class="fa fa-cog fa-lg"></i><span><%= label %> Embed Options<span></a>\n        <% } %>\n        <a href="#" class="action-remove" title="Remove <%= label %>"><i class="fa fa-minus-circle fa-lg"></i><span>Remove <%= label %><span></a>\n    </div>\n<% } else { %>\n    <div class="title"><em>Add <%= label %></em></div>\n    <div class="ev-actions">\n        <a href="#" class="action-choose" title="Choose <%= label %>"><i class="fa fa-folder-open fa-lg"></i><span>Choose <%= label %><span></a>\n    </div>\n<% } %>\n';});

define('ev-script/views/field',['require','jquery','underscore','ev-script/views/base','ev-script/models/video-settings','ev-script/models/playlist-settings','ev-script/views/video-picker','ev-script/views/video-settings','ev-script/views/video-preview','ev-script/models/video-encoding','ev-script/views/playlist-picker','ev-script/views/playlist-settings','ev-script/views/playlist-preview','text!ev-script/templates/field.html'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        BaseView = require('ev-script/views/base'),
        VideoSettings = require('ev-script/models/video-settings'),
        PlaylistSettings = require('ev-script/models/playlist-settings'),
        VideoPickerView = require('ev-script/views/video-picker'),
        VideoSettingsView = require('ev-script/views/video-settings'),
        VideoPreviewView = require('ev-script/views/video-preview'),
        VideoEncoding = require('ev-script/models/video-encoding'),
        PlaylistPickerView = require('ev-script/views/playlist-picker'),
        PlaylistSettingsView = require('ev-script/views/playlist-settings'),
        PlaylistPreviewView = require('ev-script/views/playlist-preview');

    /*
     * View for our field (element that we set with the selected content identifier)
     */
    return BaseView.extend({
        template: _.template(require('text!ev-script/templates/field.html')),
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'chooseHandler', 'optionsHandler', 'removeHandler', 'previewHandler', 'resizePicker');
            this.$field = options.$field;
            this.showChoose = true;
            var pickerOptions = {
                id: this.id + '-picker',
                tagName: 'div',
                className: 'ev-' + this.model.get('type') + '-picker',
                field: this,
                appId: this.appId
            };
            var settingsOptions = {
                id: this.id + '-settings',
                tagName: 'div',
                className: 'ev-settings',
                field: this,
                appId: this.appId
            };
            if (this.model instanceof VideoSettings) {
                this.modelClass = VideoSettings;
                this.pickerClass = VideoPickerView;
                this.settingsClass = VideoSettingsView;
                this.previewClass = VideoPreviewView;
                this.encoding = new VideoEncoding({}, {
                    appId: this.appId
                });
                if (!this.model.isNew()) {
                    this.encoding.set({
                        fetchId: this.model.id
                    });
                    this.encoding.fetch();
                }
                this.model.on('change:id', _.bind(function() {
                    // Only fetch encoding if identifier is set
                    if (this.model.id) {
                        this.encoding.set({
                            fetchId: this.model.id
                        });
                        this.encoding.fetch({
                            success: _.bind(function(response) {
                                this.model.set({
                                    width: this.encoding.getWidth(),
                                    height: this.encoding.getHeight()
                                });
                            }, this)
                        });
                    } else {
                        this.encoding.clear();
                    }
                }, this));
                _.extend(settingsOptions, {
                    encoding: this.encoding
                });
            } else if (this.model instanceof PlaylistSettings) {
                this.modelClass = PlaylistSettings;
                this.pickerClass = PlaylistPickerView;
                this.settingsClass = PlaylistSettingsView;
                this.previewClass = PlaylistPreviewView;
            }
            this.picker = new this.pickerClass(_.extend({}, pickerOptions, {
                // We don't want to modify field model until we actually pick a new video...so use a copy as our current model
                model: new this.modelClass(this.model.toJSON()),
            }));
            this.settings = new this.settingsClass(settingsOptions);
            this.$field.after(this.picker.$el);
            this.renderActions();
            this.model.on('change', _.bind(function() {
                if (!this.model.isNew()) {
                    var json = this.model.toJSON();
                    this.$field.val(JSON.stringify(json));
                    this.appEvents.trigger('fieldUpdated', this.$field, json);
                    this.renderActions();
                }
            }, this));
            this.appEvents.on('showPicker', function(fieldId) {
                if (this.id === fieldId) {
                    this.$('.action-choose').hide();
                    this.showChoose = false;
                    // We only want one picker showing at a time so notify all fields to hide them (unless it's ours)
                    if (this.config.hidePickers) {
                        this.appEvents.trigger('hidePickers', this.id);
                    }
                    this.resizePicker();
                }
            }, this);
            this.appEvents.on('hidePicker', function(fieldId) {
                if (this.id === fieldId) {
                    this.$('.action-choose').show();
                    this.showChoose = true;
                }
            }, this);
            this.appEvents.on('hidePickers', function(fieldId) {
                // When the picker for our field is hidden we need need to show our 'Choose' button
                if (!fieldId || (this.id !== fieldId)) {
                    this.$('.action-choose').show();
                    this.showChoose = true;
                }
            }, this);
            this.appEvents.on('resize', _.bind(function() {
                this.resizePicker();
            }, this));
        },
        events: {
            'click .action-choose': 'chooseHandler',
            'click .action-preview': 'previewHandler',
            'click .action-options': 'optionsHandler',
            'click .action-remove': 'removeHandler'
        },
        chooseHandler: function(e) {
            this.appEvents.trigger('showPicker', this.id);
            e.preventDefault();
        },
        optionsHandler: function(e) {
            this.settings.show();
            e.preventDefault();
        },
        removeHandler: function(e) {
            this.model.clear();
            this.$field.val('');
            // Silent here because we don't want to trigger our change handler above
            // (which would set the field value to our model defaults)
            this.model.set(this.model.defaults, {
                silent: true
            });
            this.appEvents.trigger('fieldUpdated', this.$field);
            this.renderActions();
            e.preventDefault();
        },
        previewHandler: function(e) {
            var element = e.currentTarget;
            var previewView = new this.previewClass({
                el: element,
                encoding: this.encoding,
                model: this.model,
                appId: this.appId
            });
            e.preventDefault();
        },
        renderActions: function() {
            var ensembleUrl = this.config.ensembleUrl,
                name, label, type, thumbnailUrl;
            if (this.model instanceof VideoSettings) {
                label = 'Media';
                type = 'video';
            } else {
                label = 'Playlist';
                type = 'playlist';
            }
            if (this.model.id) {
                name = this.model.id;
                var content = this.model.get('content');
                if (content) {
                    name = content.Name || content.Title;
                    // Validate thumbnailUrl as it could potentially have been modified and we want to protect against XSRF
                    // (a GET shouldn't have side effects...but make sure we actually have a thumbnail url just in case)
                    var re = new RegExp('^' + ensembleUrl.toLocaleLowerCase() + '\/app\/assets\/');
                    if (content.ThumbnailUrl && re.test(content.ThumbnailUrl.toLocaleLowerCase())) {
                        thumbnailUrl = content.ThumbnailUrl;
                    }
                }
            }
            if (!this.$actions) {
                this.$actions = $('<div class="ev-field"/>');
                this.$field.after(this.$actions);
            }
            this.$actions.html(this.template({
                ensembleUrl: ensembleUrl,
                modelId: this.model.id,
                label: label,
                type: type,
                name: name,
                thumbnailUrl: thumbnailUrl,
                showPlaylistOptions: !this.info.useLegacyEmbeds()
            }));
            // If our picker is shown, hide our 'Choose' button
            if (!this.showChoose) {
                this.$('.action-choose').hide();
            }
        },
        resizePicker: function() {
            if (this.config.fitToParent) {
                this.picker.setHeight(this.$el.height() - this.$actions.outerHeight(true));
            }
        }
    });

});

;(function(exports) {

// export the class if we are in a Node-like system.
if (typeof module === 'object' && module.exports === exports)
  exports = module.exports = SemVer;

// The debug function is excluded entirely from the minified version.

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
exports.SEMVER_SPEC_VERSION = '2.0.0';

var MAX_LENGTH = 256;
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

// The actual regexps go on exports.re
var re = exports.re = [];
var src = exports.src = [];
var R = 0;

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.

var NUMERICIDENTIFIER = R++;
src[NUMERICIDENTIFIER] = '0|[1-9]\\d*';
var NUMERICIDENTIFIERLOOSE = R++;
src[NUMERICIDENTIFIERLOOSE] = '[0-9]+';


// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.

var NONNUMERICIDENTIFIER = R++;
src[NONNUMERICIDENTIFIER] = '\\d*[a-zA-Z-][a-zA-Z0-9-]*';


// ## Main Version
// Three dot-separated numeric identifiers.

var MAINVERSION = R++;
src[MAINVERSION] = '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                   '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                   '(' + src[NUMERICIDENTIFIER] + ')';

var MAINVERSIONLOOSE = R++;
src[MAINVERSIONLOOSE] = '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                        '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                        '(' + src[NUMERICIDENTIFIERLOOSE] + ')';

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.

var PRERELEASEIDENTIFIER = R++;
src[PRERELEASEIDENTIFIER] = '(?:' + src[NUMERICIDENTIFIER] +
                            '|' + src[NONNUMERICIDENTIFIER] + ')';

var PRERELEASEIDENTIFIERLOOSE = R++;
src[PRERELEASEIDENTIFIERLOOSE] = '(?:' + src[NUMERICIDENTIFIERLOOSE] +
                                 '|' + src[NONNUMERICIDENTIFIER] + ')';


// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.

var PRERELEASE = R++;
src[PRERELEASE] = '(?:-(' + src[PRERELEASEIDENTIFIER] +
                  '(?:\\.' + src[PRERELEASEIDENTIFIER] + ')*))';

var PRERELEASELOOSE = R++;
src[PRERELEASELOOSE] = '(?:-?(' + src[PRERELEASEIDENTIFIERLOOSE] +
                       '(?:\\.' + src[PRERELEASEIDENTIFIERLOOSE] + ')*))';

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.

var BUILDIDENTIFIER = R++;
src[BUILDIDENTIFIER] = '[0-9A-Za-z-]+';

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.

var BUILD = R++;
src[BUILD] = '(?:\\+(' + src[BUILDIDENTIFIER] +
             '(?:\\.' + src[BUILDIDENTIFIER] + ')*))';


// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.

var FULL = R++;
var FULLPLAIN = 'v?' + src[MAINVERSION] +
                src[PRERELEASE] + '?' +
                src[BUILD] + '?';

src[FULL] = '^' + FULLPLAIN + '$';

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
var LOOSEPLAIN = '[v=\\s]*' + src[MAINVERSIONLOOSE] +
                 src[PRERELEASELOOSE] + '?' +
                 src[BUILD] + '?';

var LOOSE = R++;
src[LOOSE] = '^' + LOOSEPLAIN + '$';

var GTLT = R++;
src[GTLT] = '((?:<|>)?=?)';

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifer, meaning "any version"
// Only the first item is strictly required.
var XRANGEIDENTIFIERLOOSE = R++;
src[XRANGEIDENTIFIERLOOSE] = src[NUMERICIDENTIFIERLOOSE] + '|x|X|\\*';
var XRANGEIDENTIFIER = R++;
src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + '|x|X|\\*';

var XRANGEPLAIN = R++;
src[XRANGEPLAIN] = '[v=\\s]*(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:' + src[PRERELEASE] + ')?' +
                   src[BUILD] + '?' +
                   ')?)?';

var XRANGEPLAINLOOSE = R++;
src[XRANGEPLAINLOOSE] = '[v=\\s]*(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:' + src[PRERELEASELOOSE] + ')?' +
                        src[BUILD] + '?' +
                        ')?)?';

var XRANGE = R++;
src[XRANGE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAIN] + '$';
var XRANGELOOSE = R++;
src[XRANGELOOSE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAINLOOSE] + '$';

// Tilde ranges.
// Meaning is "reasonably at or greater than"
var LONETILDE = R++;
src[LONETILDE] = '(?:~>?)';

var TILDETRIM = R++;
src[TILDETRIM] = '(\\s*)' + src[LONETILDE] + '\\s+';
re[TILDETRIM] = new RegExp(src[TILDETRIM], 'g');
var tildeTrimReplace = '$1~';

var TILDE = R++;
src[TILDE] = '^' + src[LONETILDE] + src[XRANGEPLAIN] + '$';
var TILDELOOSE = R++;
src[TILDELOOSE] = '^' + src[LONETILDE] + src[XRANGEPLAINLOOSE] + '$';

// Caret ranges.
// Meaning is "at least and backwards compatible with"
var LONECARET = R++;
src[LONECARET] = '(?:\\^)';

var CARETTRIM = R++;
src[CARETTRIM] = '(\\s*)' + src[LONECARET] + '\\s+';
re[CARETTRIM] = new RegExp(src[CARETTRIM], 'g');
var caretTrimReplace = '$1^';

var CARET = R++;
src[CARET] = '^' + src[LONECARET] + src[XRANGEPLAIN] + '$';
var CARETLOOSE = R++;
src[CARETLOOSE] = '^' + src[LONECARET] + src[XRANGEPLAINLOOSE] + '$';

// A simple gt/lt/eq thing, or just "" to indicate "any version"
var COMPARATORLOOSE = R++;
src[COMPARATORLOOSE] = '^' + src[GTLT] + '\\s*(' + LOOSEPLAIN + ')$|^$';
var COMPARATOR = R++;
src[COMPARATOR] = '^' + src[GTLT] + '\\s*(' + FULLPLAIN + ')$|^$';


// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
var COMPARATORTRIM = R++;
src[COMPARATORTRIM] = '(\\s*)' + src[GTLT] +
                      '\\s*(' + LOOSEPLAIN + '|' + src[XRANGEPLAIN] + ')';

// this one has to use the /g flag
re[COMPARATORTRIM] = new RegExp(src[COMPARATORTRIM], 'g');
var comparatorTrimReplace = '$1$2$3';


// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
var HYPHENRANGE = R++;
src[HYPHENRANGE] = '^\\s*(' + src[XRANGEPLAIN] + ')' +
                   '\\s+-\\s+' +
                   '(' + src[XRANGEPLAIN] + ')' +
                   '\\s*$';

var HYPHENRANGELOOSE = R++;
src[HYPHENRANGELOOSE] = '^\\s*(' + src[XRANGEPLAINLOOSE] + ')' +
                        '\\s+-\\s+' +
                        '(' + src[XRANGEPLAINLOOSE] + ')' +
                        '\\s*$';

// Star ranges basically just allow anything at all.
var STAR = R++;
src[STAR] = '(<|>)?=?\\s*\\*';

// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
for (var i = 0; i < R; i++) {
  ;
  if (!re[i])
    re[i] = new RegExp(src[i]);
}

exports.parse = parse;
function parse(version, loose) {
  if (version instanceof SemVer)
    return version;

  if (typeof version !== 'string')
    return null;

  if (version.length > MAX_LENGTH)
    return null;

  var r = loose ? re[LOOSE] : re[FULL];
  if (!r.test(version))
    return null;

  try {
    return new SemVer(version, loose);
  } catch (er) {
    return null;
  }
}

exports.valid = valid;
function valid(version, loose) {
  var v = parse(version, loose);
  return v ? v.version : null;
}


exports.clean = clean;
function clean(version, loose) {
  var s = parse(version.trim().replace(/^[=v]+/, ''), loose);
  return s ? s.version : null;
}

exports.SemVer = SemVer;

function SemVer(version, loose) {
  if (version instanceof SemVer) {
    if (version.loose === loose)
      return version;
    else
      version = version.version;
  } else if (typeof version !== 'string') {
    throw new TypeError('Invalid Version: ' + version);
  }

  if (version.length > MAX_LENGTH)
    throw new TypeError('version is longer than ' + MAX_LENGTH + ' characters')

  if (!(this instanceof SemVer))
    return new SemVer(version, loose);

  ;
  this.loose = loose;
  var m = version.trim().match(loose ? re[LOOSE] : re[FULL]);

  if (!m)
    throw new TypeError('Invalid Version: ' + version);

  this.raw = version;

  // these are actually numbers
  this.major = +m[1];
  this.minor = +m[2];
  this.patch = +m[3];

  if (this.major > MAX_SAFE_INTEGER || this.major < 0)
    throw new TypeError('Invalid major version')

  if (this.minor > MAX_SAFE_INTEGER || this.minor < 0)
    throw new TypeError('Invalid minor version')

  if (this.patch > MAX_SAFE_INTEGER || this.patch < 0)
    throw new TypeError('Invalid patch version')

  // numberify any prerelease numeric ids
  if (!m[4])
    this.prerelease = [];
  else
    this.prerelease = m[4].split('.').map(function(id) {
      if (/^[0-9]+$/.test(id)) {
        var num = +id
        if (num >= 0 && num < MAX_SAFE_INTEGER)
          return num
      }
      return id;
    });

  this.build = m[5] ? m[5].split('.') : [];
  this.format();
}

SemVer.prototype.format = function() {
  this.version = this.major + '.' + this.minor + '.' + this.patch;
  if (this.prerelease.length)
    this.version += '-' + this.prerelease.join('.');
  return this.version;
};

SemVer.prototype.inspect = function() {
  return '<SemVer "' + this + '">';
};

SemVer.prototype.toString = function() {
  return this.version;
};

SemVer.prototype.compare = function(other) {
  ;
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  return this.compareMain(other) || this.comparePre(other);
};

SemVer.prototype.compareMain = function(other) {
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  return compareIdentifiers(this.major, other.major) ||
         compareIdentifiers(this.minor, other.minor) ||
         compareIdentifiers(this.patch, other.patch);
};

SemVer.prototype.comparePre = function(other) {
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  // NOT having a prerelease is > having one
  if (this.prerelease.length && !other.prerelease.length)
    return -1;
  else if (!this.prerelease.length && other.prerelease.length)
    return 1;
  else if (!this.prerelease.length && !other.prerelease.length)
    return 0;

  var i = 0;
  do {
    var a = this.prerelease[i];
    var b = other.prerelease[i];
    ;
    if (a === undefined && b === undefined)
      return 0;
    else if (b === undefined)
      return 1;
    else if (a === undefined)
      return -1;
    else if (a === b)
      continue;
    else
      return compareIdentifiers(a, b);
  } while (++i);
};

// preminor will bump the version up to the next minor release, and immediately
// down to pre-release. premajor and prepatch work the same way.
SemVer.prototype.inc = function(release, identifier) {
  switch (release) {
    case 'premajor':
      this.prerelease.length = 0;
      this.patch = 0;
      this.minor = 0;
      this.major++;
      this.inc('pre', identifier);
      break;
    case 'preminor':
      this.prerelease.length = 0;
      this.patch = 0;
      this.minor++;
      this.inc('pre', identifier);
      break;
    case 'prepatch':
      // If this is already a prerelease, it will bump to the next version
      // drop any prereleases that might already exist, since they are not
      // relevant at this point.
      this.prerelease.length = 0;
      this.inc('patch', identifier);
      this.inc('pre', identifier);
      break;
    // If the input is a non-prerelease version, this acts the same as
    // prepatch.
    case 'prerelease':
      if (this.prerelease.length === 0)
        this.inc('patch', identifier);
      this.inc('pre', identifier);
      break;

    case 'major':
      // If this is a pre-major version, bump up to the same major version.
      // Otherwise increment major.
      // 1.0.0-5 bumps to 1.0.0
      // 1.1.0 bumps to 2.0.0
      if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0)
        this.major++;
      this.minor = 0;
      this.patch = 0;
      this.prerelease = [];
      break;
    case 'minor':
      // If this is a pre-minor version, bump up to the same minor version.
      // Otherwise increment minor.
      // 1.2.0-5 bumps to 1.2.0
      // 1.2.1 bumps to 1.3.0
      if (this.patch !== 0 || this.prerelease.length === 0)
        this.minor++;
      this.patch = 0;
      this.prerelease = [];
      break;
    case 'patch':
      // If this is not a pre-release version, it will increment the patch.
      // If it is a pre-release it will bump up to the same patch version.
      // 1.2.0-5 patches to 1.2.0
      // 1.2.0 patches to 1.2.1
      if (this.prerelease.length === 0)
        this.patch++;
      this.prerelease = [];
      break;
    // This probably shouldn't be used publicly.
    // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
    case 'pre':
      if (this.prerelease.length === 0)
        this.prerelease = [0];
      else {
        var i = this.prerelease.length;
        while (--i >= 0) {
          if (typeof this.prerelease[i] === 'number') {
            this.prerelease[i]++;
            i = -2;
          }
        }
        if (i === -1) // didn't increment anything
          this.prerelease.push(0);
      }
      if (identifier) {
        // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
        // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
        if (this.prerelease[0] === identifier) {
          if (isNaN(this.prerelease[1]))
            this.prerelease = [identifier, 0];
        } else
          this.prerelease = [identifier, 0];
      }
      break;

    default:
      throw new Error('invalid increment argument: ' + release);
  }
  this.format();
  return this;
};

exports.inc = inc;
function inc(version, release, loose, identifier) {
  if (typeof(loose) === 'string') {
    identifier = loose;
    loose = undefined;
  }

  try {
    return new SemVer(version, loose).inc(release, identifier).version;
  } catch (er) {
    return null;
  }
}

exports.diff = diff;
function diff(version1, version2) {
  if (eq(version1, version2)) {
    return null;
  } else {
    var v1 = parse(version1);
    var v2 = parse(version2);
    if (v1.prerelease.length || v2.prerelease.length) {
      for (var key in v1) {
        if (key === 'major' || key === 'minor' || key === 'patch') {
          if (v1[key] !== v2[key]) {
            return 'pre'+key;
          }
        }
      }
      return 'prerelease';
    }
    for (var key in v1) {
      if (key === 'major' || key === 'minor' || key === 'patch') {
        if (v1[key] !== v2[key]) {
          return key;
        }
      }
    }
  }
}

exports.compareIdentifiers = compareIdentifiers;

var numeric = /^[0-9]+$/;
function compareIdentifiers(a, b) {
  var anum = numeric.test(a);
  var bnum = numeric.test(b);

  if (anum && bnum) {
    a = +a;
    b = +b;
  }

  return (anum && !bnum) ? -1 :
         (bnum && !anum) ? 1 :
         a < b ? -1 :
         a > b ? 1 :
         0;
}

exports.rcompareIdentifiers = rcompareIdentifiers;
function rcompareIdentifiers(a, b) {
  return compareIdentifiers(b, a);
}

exports.major = major;
function major(a, loose) {
  return new SemVer(a, loose).major;
}

exports.minor = minor;
function minor(a, loose) {
  return new SemVer(a, loose).minor;
}

exports.patch = patch;
function patch(a, loose) {
  return new SemVer(a, loose).patch;
}

exports.compare = compare;
function compare(a, b, loose) {
  return new SemVer(a, loose).compare(b);
}

exports.compareLoose = compareLoose;
function compareLoose(a, b) {
  return compare(a, b, true);
}

exports.rcompare = rcompare;
function rcompare(a, b, loose) {
  return compare(b, a, loose);
}

exports.sort = sort;
function sort(list, loose) {
  return list.sort(function(a, b) {
    return exports.compare(a, b, loose);
  });
}

exports.rsort = rsort;
function rsort(list, loose) {
  return list.sort(function(a, b) {
    return exports.rcompare(a, b, loose);
  });
}

exports.gt = gt;
function gt(a, b, loose) {
  return compare(a, b, loose) > 0;
}

exports.lt = lt;
function lt(a, b, loose) {
  return compare(a, b, loose) < 0;
}

exports.eq = eq;
function eq(a, b, loose) {
  return compare(a, b, loose) === 0;
}

exports.neq = neq;
function neq(a, b, loose) {
  return compare(a, b, loose) !== 0;
}

exports.gte = gte;
function gte(a, b, loose) {
  return compare(a, b, loose) >= 0;
}

exports.lte = lte;
function lte(a, b, loose) {
  return compare(a, b, loose) <= 0;
}

exports.cmp = cmp;
function cmp(a, op, b, loose) {
  var ret;
  switch (op) {
    case '===':
      if (typeof a === 'object') a = a.version;
      if (typeof b === 'object') b = b.version;
      ret = a === b;
      break;
    case '!==':
      if (typeof a === 'object') a = a.version;
      if (typeof b === 'object') b = b.version;
      ret = a !== b;
      break;
    case '': case '=': case '==': ret = eq(a, b, loose); break;
    case '!=': ret = neq(a, b, loose); break;
    case '>': ret = gt(a, b, loose); break;
    case '>=': ret = gte(a, b, loose); break;
    case '<': ret = lt(a, b, loose); break;
    case '<=': ret = lte(a, b, loose); break;
    default: throw new TypeError('Invalid operator: ' + op);
  }
  return ret;
}

exports.Comparator = Comparator;
function Comparator(comp, loose) {
  if (comp instanceof Comparator) {
    if (comp.loose === loose)
      return comp;
    else
      comp = comp.value;
  }

  if (!(this instanceof Comparator))
    return new Comparator(comp, loose);

  ;
  this.loose = loose;
  this.parse(comp);

  if (this.semver === ANY)
    this.value = '';
  else
    this.value = this.operator + this.semver.version;

  ;
}

var ANY = {};
Comparator.prototype.parse = function(comp) {
  var r = this.loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
  var m = comp.match(r);

  if (!m)
    throw new TypeError('Invalid comparator: ' + comp);

  this.operator = m[1];
  if (this.operator === '=')
    this.operator = '';

  // if it literally is just '>' or '' then allow anything.
  if (!m[2])
    this.semver = ANY;
  else
    this.semver = new SemVer(m[2], this.loose);
};

Comparator.prototype.inspect = function() {
  return '<SemVer Comparator "' + this + '">';
};

Comparator.prototype.toString = function() {
  return this.value;
};

Comparator.prototype.test = function(version) {
  ;

  if (this.semver === ANY)
    return true;

  if (typeof version === 'string')
    version = new SemVer(version, this.loose);

  return cmp(version, this.operator, this.semver, this.loose);
};


exports.Range = Range;
function Range(range, loose) {
  if ((range instanceof Range) && range.loose === loose)
    return range;

  if (!(this instanceof Range))
    return new Range(range, loose);

  this.loose = loose;

  // First, split based on boolean or ||
  this.raw = range;
  this.set = range.split(/\s*\|\|\s*/).map(function(range) {
    return this.parseRange(range.trim());
  }, this).filter(function(c) {
    // throw out any that are not relevant for whatever reason
    return c.length;
  });

  if (!this.set.length) {
    throw new TypeError('Invalid SemVer Range: ' + range);
  }

  this.format();
}

Range.prototype.inspect = function() {
  return '<SemVer Range "' + this.range + '">';
};

Range.prototype.format = function() {
  this.range = this.set.map(function(comps) {
    return comps.join(' ').trim();
  }).join('||').trim();
  return this.range;
};

Range.prototype.toString = function() {
  return this.range;
};

Range.prototype.parseRange = function(range) {
  var loose = this.loose;
  range = range.trim();
  ;
  // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
  var hr = loose ? re[HYPHENRANGELOOSE] : re[HYPHENRANGE];
  range = range.replace(hr, hyphenReplace);
  ;
  // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
  range = range.replace(re[COMPARATORTRIM], comparatorTrimReplace);
  ;

  // `~ 1.2.3` => `~1.2.3`
  range = range.replace(re[TILDETRIM], tildeTrimReplace);

  // `^ 1.2.3` => `^1.2.3`
  range = range.replace(re[CARETTRIM], caretTrimReplace);

  // normalize spaces
  range = range.split(/\s+/).join(' ');

  // At this point, the range is completely trimmed and
  // ready to be split into comparators.

  var compRe = loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
  var set = range.split(' ').map(function(comp) {
    return parseComparator(comp, loose);
  }).join(' ').split(/\s+/);
  if (this.loose) {
    // in loose mode, throw out any that are not valid comparators
    set = set.filter(function(comp) {
      return !!comp.match(compRe);
    });
  }
  set = set.map(function(comp) {
    return new Comparator(comp, loose);
  });

  return set;
};

// Mostly just for testing and legacy API reasons
exports.toComparators = toComparators;
function toComparators(range, loose) {
  return new Range(range, loose).set.map(function(comp) {
    return comp.map(function(c) {
      return c.value;
    }).join(' ').trim().split(' ');
  });
}

// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
function parseComparator(comp, loose) {
  ;
  comp = replaceCarets(comp, loose);
  ;
  comp = replaceTildes(comp, loose);
  ;
  comp = replaceXRanges(comp, loose);
  ;
  comp = replaceStars(comp, loose);
  ;
  return comp;
}

function isX(id) {
  return !id || id.toLowerCase() === 'x' || id === '*';
}

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
function replaceTildes(comp, loose) {
  return comp.trim().split(/\s+/).map(function(comp) {
    return replaceTilde(comp, loose);
  }).join(' ');
}

function replaceTilde(comp, loose) {
  var r = loose ? re[TILDELOOSE] : re[TILDE];
  return comp.replace(r, function(_, M, m, p, pr) {
    ;
    var ret;

    if (isX(M))
      ret = '';
    else if (isX(m))
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
    else if (isX(p))
      // ~1.2 == >=1.2.0- <1.3.0-
      ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
    else if (pr) {
      ;
      if (pr.charAt(0) !== '-')
        pr = '-' + pr;
      ret = '>=' + M + '.' + m + '.' + p + pr +
            ' <' + M + '.' + (+m + 1) + '.0';
    } else
      // ~1.2.3 == >=1.2.3 <1.3.0
      ret = '>=' + M + '.' + m + '.' + p +
            ' <' + M + '.' + (+m + 1) + '.0';

    ;
    return ret;
  });
}

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
// ^1.2.3 --> >=1.2.3 <2.0.0
// ^1.2.0 --> >=1.2.0 <2.0.0
function replaceCarets(comp, loose) {
  return comp.trim().split(/\s+/).map(function(comp) {
    return replaceCaret(comp, loose);
  }).join(' ');
}

function replaceCaret(comp, loose) {
  ;
  var r = loose ? re[CARETLOOSE] : re[CARET];
  return comp.replace(r, function(_, M, m, p, pr) {
    ;
    var ret;

    if (isX(M))
      ret = '';
    else if (isX(m))
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
    else if (isX(p)) {
      if (M === '0')
        ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
      else
        ret = '>=' + M + '.' + m + '.0 <' + (+M + 1) + '.0.0';
    } else if (pr) {
      ;
      if (pr.charAt(0) !== '-')
        pr = '-' + pr;
      if (M === '0') {
        if (m === '0')
          ret = '>=' + M + '.' + m + '.' + p + pr +
                ' <' + M + '.' + m + '.' + (+p + 1);
        else
          ret = '>=' + M + '.' + m + '.' + p + pr +
                ' <' + M + '.' + (+m + 1) + '.0';
      } else
        ret = '>=' + M + '.' + m + '.' + p + pr +
              ' <' + (+M + 1) + '.0.0';
    } else {
      ;
      if (M === '0') {
        if (m === '0')
          ret = '>=' + M + '.' + m + '.' + p +
                ' <' + M + '.' + m + '.' + (+p + 1);
        else
          ret = '>=' + M + '.' + m + '.' + p +
                ' <' + M + '.' + (+m + 1) + '.0';
      } else
        ret = '>=' + M + '.' + m + '.' + p +
              ' <' + (+M + 1) + '.0.0';
    }

    ;
    return ret;
  });
}

function replaceXRanges(comp, loose) {
  ;
  return comp.split(/\s+/).map(function(comp) {
    return replaceXRange(comp, loose);
  }).join(' ');
}

function replaceXRange(comp, loose) {
  comp = comp.trim();
  var r = loose ? re[XRANGELOOSE] : re[XRANGE];
  return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
    ;
    var xM = isX(M);
    var xm = xM || isX(m);
    var xp = xm || isX(p);
    var anyX = xp;

    if (gtlt === '=' && anyX)
      gtlt = '';

    if (xM) {
      if (gtlt === '>' || gtlt === '<') {
        // nothing is allowed
        ret = '<0.0.0';
      } else {
        // nothing is forbidden
        ret = '*';
      }
    } else if (gtlt && anyX) {
      // replace X with 0
      if (xm)
        m = 0;
      if (xp)
        p = 0;

      if (gtlt === '>') {
        // >1 => >=2.0.0
        // >1.2 => >=1.3.0
        // >1.2.3 => >= 1.2.4
        gtlt = '>=';
        if (xm) {
          M = +M + 1;
          m = 0;
          p = 0;
        } else if (xp) {
          m = +m + 1;
          p = 0;
        }
      } else if (gtlt === '<=') {
        // <=0.7.x is actually <0.8.0, since any 0.7.x should
        // pass.  Similarly, <=7.x is actually <8.0.0, etc.
        gtlt = '<'
        if (xm)
          M = +M + 1
        else
          m = +m + 1
      }

      ret = gtlt + M + '.' + m + '.' + p;
    } else if (xm) {
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0';
    } else if (xp) {
      ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0';
    }

    ;

    return ret;
  });
}

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
function replaceStars(comp, loose) {
  ;
  // Looseness is ignored here.  star is always as loose as it gets!
  return comp.trim().replace(re[STAR], '');
}

// This function is passed to string.replace(re[HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0
function hyphenReplace($0,
                       from, fM, fm, fp, fpr, fb,
                       to, tM, tm, tp, tpr, tb) {

  if (isX(fM))
    from = '';
  else if (isX(fm))
    from = '>=' + fM + '.0.0';
  else if (isX(fp))
    from = '>=' + fM + '.' + fm + '.0';
  else
    from = '>=' + from;

  if (isX(tM))
    to = '';
  else if (isX(tm))
    to = '<' + (+tM + 1) + '.0.0';
  else if (isX(tp))
    to = '<' + tM + '.' + (+tm + 1) + '.0';
  else if (tpr)
    to = '<=' + tM + '.' + tm + '.' + tp + '-' + tpr;
  else
    to = '<=' + to;

  return (from + ' ' + to).trim();
}


// if ANY of the sets match ALL of its comparators, then pass
Range.prototype.test = function(version) {
  if (!version)
    return false;

  if (typeof version === 'string')
    version = new SemVer(version, this.loose);

  for (var i = 0; i < this.set.length; i++) {
    if (testSet(this.set[i], version))
      return true;
  }
  return false;
};

function testSet(set, version) {
  for (var i = 0; i < set.length; i++) {
    if (!set[i].test(version))
      return false;
  }

  if (version.prerelease.length) {
    // Find the set of versions that are allowed to have prereleases
    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
    // That should allow `1.2.3-pr.2` to pass.
    // However, `1.2.4-alpha.notready` should NOT be allowed,
    // even though it's within the range set by the comparators.
    for (var i = 0; i < set.length; i++) {
      ;
      if (set[i].semver === ANY)
        return true;

      if (set[i].semver.prerelease.length > 0) {
        var allowed = set[i].semver;
        if (allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch)
          return true;
      }
    }

    // Version has a -pre, but it's not one of the ones we like.
    return false;
  }

  return true;
}

exports.satisfies = satisfies;
function satisfies(version, range, loose) {
  try {
    range = new Range(range, loose);
  } catch (er) {
    return false;
  }
  return range.test(version);
}

exports.maxSatisfying = maxSatisfying;
function maxSatisfying(versions, range, loose) {
  return versions.filter(function(version) {
    return satisfies(version, range, loose);
  }).sort(function(a, b) {
    return rcompare(a, b, loose);
  })[0] || null;
}

exports.validRange = validRange;
function validRange(range, loose) {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, loose).range || '*';
  } catch (er) {
    return null;
  }
}

// Determine if version is less than all the versions possible in the range
exports.ltr = ltr;
function ltr(version, range, loose) {
  return outside(version, range, '<', loose);
}

// Determine if version is greater than all the versions possible in the range.
exports.gtr = gtr;
function gtr(version, range, loose) {
  return outside(version, range, '>', loose);
}

exports.outside = outside;
function outside(version, range, hilo, loose) {
  version = new SemVer(version, loose);
  range = new Range(range, loose);

  var gtfn, ltefn, ltfn, comp, ecomp;
  switch (hilo) {
    case '>':
      gtfn = gt;
      ltefn = lte;
      ltfn = lt;
      comp = '>';
      ecomp = '>=';
      break;
    case '<':
      gtfn = lt;
      ltefn = gte;
      ltfn = gt;
      comp = '<';
      ecomp = '<=';
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }

  // If it satisifes the range it is not outside
  if (satisfies(version, range, loose)) {
    return false;
  }

  // From now on, variable terms are as if we're in "gtr" mode.
  // but note that everything is flipped for the "ltr" function.

  for (var i = 0; i < range.set.length; ++i) {
    var comparators = range.set[i];

    var high = null;
    var low = null;

    comparators.forEach(function(comparator) {
      high = high || comparator;
      low = low || comparator;
      if (gtfn(comparator.semver, high.semver, loose)) {
        high = comparator;
      } else if (ltfn(comparator.semver, low.semver, loose)) {
        low = comparator;
      }
    });

    // If the edge version comparator has a operator then our version
    // isn't outside it
    if (high.operator === comp || high.operator === ecomp) {
      return false;
    }

    // If the lowest version comparator has an operator and our version
    // is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === comp) &&
        ltefn(version, low.semver)) {
      return false;
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false;
    }
  }
  return true;
}

// Use the define() function if we're in AMD land
if (typeof define === 'function' && define.amd)
  define('semver',exports);

})(
  typeof exports === 'object' ? exports :
  typeof define === 'function' && define.amd ? {} :
  semver = {}
);

define('ev-script/models/app-info',['require','underscore','semver','ev-script/models/base'],function(require) {

    'use strict';

    var _ = require('underscore'),
        semver = require('semver'),
        BaseModel = require('ev-script/models/base');

    return BaseModel.extend({
        initialize: function(attributes, options) {
            BaseModel.prototype.initialize.call(this, attributes, options);
            this.requiresAuth = false;
        },
        url: function() {
            var url = this.config.ensembleUrl + '/api/Info';
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        },
        parse: function(response) {
            return response;
        },
        checkVersion: function(condition) {
            var version = this.get('ApplicationVersion');
            return version && semver.satisfies(version, condition);
        },
        useLegacyEmbeds: function() {
            return this.checkVersion('<3.12.0');
        },
        anthemEnabled: function() {
            return this.checkVersion('>=4.2.0');
        }
    });

});

define('ev-script/models/current-user',['require','underscore','ev-script/models/base'],function(require) {

    'use strict';

    var _ = require('underscore'),
        BaseModel = require('ev-script/models/base');

    return BaseModel.extend({
        idAttribute: 'ID',
        initialize: function(attributes, options) {
            BaseModel.prototype.initialize.call(this, attributes, options);
            // The API actually does require authentication...but we don't want
            // special handling
            this.requiresAuth = false;
        },
        url: function() {
            var url = this.config.ensembleUrl + '/api/CurrentUser';
            return this.config.urlCallback ? this.config.urlCallback(url) : url;
        },
        parse: function(response) {
            return response.Data[0];
        }
    });

});

define('ev-script/auth/base/auth',['require','jquery','underscore','backbone','ev-script/util/events','ev-script/util/cache','ev-script/models/current-user'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        eventsUtil = require('ev-script/util/events'),
        cacheUtil = require('ev-script/util/cache'),
        CurrentUser = require('ev-script/models/current-user'),
        BaseAuth = function(appId) {
            _.bindAll(this, 'getUser', 'login', 'logout', 'isAuthenticated', 'handleUnauthorized');
            this.appId = appId;
            this.config = cacheUtil.getAppConfig(appId);
            this.info = cacheUtil.getAppInfo(appId);
            this.globalEvents = eventsUtil.getEvents('global');
            this.appEvents = eventsUtil.getEvents(appId);
            this.user = null;
            this.appEvents.on('appLoaded', function() {
                this.fetchUser();
            }, this);
        };

    // Reusing Backbone's object model for extension
    BaseAuth.extend = Backbone.Model.extend;

    _.extend(BaseAuth.prototype, {
        fetchUser: function() {
            var currentUser = new CurrentUser({}, {
                appId: this.appId
            });
            return currentUser.fetch({
                success: _.bind(function(model, response, options) {
                    this.user = model;
                    this.globalEvents.trigger('loggedIn', this.config.ensembleUrl);
                }, this),
                error: _.bind(function(model, response, options) {
                    this.user = null;
                    this.globalEvents.trigger('loggedOut', this.config.ensembleUrl);
                }, this)
            }).promise();
        },
        getUser: function() {
            return this.user;
        },
        // Return failed promise...subclasses should override
        login: function(loginInfo) {
            return $.Deferred().reject().promise();
        },
        // Return failed promise...subclasses should override
        logout: function() {
            return $.Deferred().reject().promise();
        },
        isAuthenticated: function() {
            return this.user != null;
        },
        handleUnauthorized: function(element, authCallback) {}
    });

    return BaseAuth;

});

/*!
 * jQuery Cookie Plugin v1.4.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD
		define('jquery.cookie',['jquery'], factory);
	} else if (typeof exports === 'object') {
		// CommonJS
		factory(require('jquery'));
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function ($) {

	var pluses = /\+/g;

	function encode(s) {
		return config.raw ? s : encodeURIComponent(s);
	}

	function decode(s) {
		return config.raw ? s : decodeURIComponent(s);
	}

	function stringifyCookieValue(value) {
		return encode(config.json ? JSON.stringify(value) : String(value));
	}

	function parseCookieValue(s) {
		if (s.indexOf('"') === 0) {
			// This is a quoted cookie as according to RFC2068, unescape...
			s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}

		try {
			// Replace server-side written pluses with spaces.
			// If we can't decode the cookie, ignore it, it's unusable.
			// If we can't parse the cookie, ignore it, it's unusable.
			s = decodeURIComponent(s.replace(pluses, ' '));
			return config.json ? JSON.parse(s) : s;
		} catch(e) {}
	}

	function read(s, converter) {
		var value = config.raw ? s : parseCookieValue(s);
		return $.isFunction(converter) ? converter(value) : value;
	}

	var config = $.cookie = function (key, value, options) {

		// Write

		if (value !== undefined && !$.isFunction(value)) {
			options = $.extend({}, config.defaults, options);

			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setTime(+t + days * 864e+5);
			}

			return (document.cookie = [
				encode(key), '=', stringifyCookieValue(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}

		// Read

		var result = key ? undefined : {};

		// To prevent the for loop in the first place assign an empty array
		// in case there are no cookies at all. Also prevents odd result when
		// calling $.cookie().
		var cookies = document.cookie ? document.cookie.split('; ') : [];

		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			var name = decode(parts.shift());
			var cookie = parts.join('=');

			if (key && key === name) {
				// If second argument (value) is a function it's a converter...
				result = read(cookie, value);
				break;
			}

			// Prevent storing a cookie that we couldn't decode.
			if (!key && (cookie = read(cookie)) !== undefined) {
				result[name] = cookie;
			}
		}

		return result;
	};

	config.defaults = {};

	$.removeCookie = function (key, options) {
		if ($.cookie(key) === undefined) {
			return false;
		}

		// Must not alter options, thus extending a fresh object...
		$.cookie(key, '', $.extend({}, options, { expires: -1 }));
		return !$.cookie(key);
	};

}));


define('text!ev-script/auth/basic/template.html',[],function () { return '<div class="logo"></div>\n<form>\n    <fieldset>\n        <div class="fieldWrap">\n            <label for="username">Username</label>\n            <input id="username" name="username" class="form-text"type="text"/>\n        </div>\n        <div class="fieldWrap">\n            <label for="password">Password</label>\n            <input id="password" name="password" class="form-text"type="password"/>\n        </div>\n        <div class="form-actions">\n            <label></label>\n            <input type="submit" class="form-submit action-submit" value="Submit"/>\n        </div>\n    </fieldset>\n</form>\n';});

define('ev-script/auth/basic/view',['require','exports','module','jquery','underscore','backbone','ev-script/util/cache','ev-script/util/events','jquery.cookie','jquery-ui','text!ev-script/auth/basic/template.html'],function(require, template) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        cacheUtil = require('ev-script/util/cache'),
        eventsUtil = require('ev-script/util/events');

    require('jquery.cookie');
    require('jquery-ui');

    return Backbone.View.extend({
        template: _.template(require('text!ev-script/auth/basic/template.html')),
        initialize: function(options) {
            this.appId = options.appId;
            this.config = cacheUtil.getAppConfig(this.appId);
            this.appEvents = eventsUtil.getEvents(this.appId);
            this.submitCallback = options.submitCallback || function() {};
            this.auth = options.auth;
        },
        render: function() {
            var html = this.template();
            this.$dialog = $('<div class="ev-auth"></div>');
            this.$el.after(this.$dialog);
            this.$dialog.dialog({
                title: 'Ensemble Video Login - ' + this.config.ensembleUrl,
                modal: true,
                draggable: false,
                resizable: false,
                width: Math.min(540, $(window).width() - this.config.dialogMargin),
                height: Math.min(250, $(window).height() - this.config.dialogMargin),
                dialogClass: 'ev-dialog',
                create: _.bind(function(event, ui) {
                    this.$dialog.html(html);
                }, this),
                close: _.bind(function(event, ui) {
                    this.$dialog.dialog('destroy').remove();
                    this.appEvents.trigger('hidePickers');
                }, this)
            });
            $('form', this.$dialog).submit(_.bind(function(e) {
                var $form = $(e.target);
                var username = $('#username', $form).val();
                var password = $('#password', $form).val();
                if (username && password) {
                    this.auth.login({
                        username: username,
                        password: password
                    })
                    .always(this.submitCallback);
                    this.$dialog.dialog('destroy').remove();
                }
                e.preventDefault();
            }, this));
        }
    });

});

define('ev-script/auth/basic/auth',['require','jquery','underscore','backbone','ev-script/auth/base/auth','ev-script/auth/basic/view','ev-script/collections/organizations'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        BaseAuth = require('ev-script/auth/base/auth'),
        AuthView = require('ev-script/auth/basic/view'),
        Organizations = require('ev-script/collections/organizations'),
        // Note: This isn't really basic authentication at all...we just set
        // cookies containing credentials to be handled by a proxy.  The proxy
        // uses these to forward our request with a basic auth header.
        BasicAuth = BaseAuth.extend({
            constructor: function(appId) {
                BasicAuth.__super__.constructor.call(this, appId);
            },
            fetchUser: function() {
                // Hack to handle legacy (pre-3.6) API which doesn't have a
                // currentUser endpoint.  See if we can successfully query orgs
                // instead (probably least expensive due to minimal data) to see
                // if valid credentials are set, then use a randomly generated
                // user id
                if (this.info.get('ApplicationVersion')) {
                    return BasicAuth.__super__.fetchUser.call(this);
                } else {
                    var orgs = new Organizations({}, {
                        appId: this.appId
                    });
                    // Don't want special treatment of failure due to
                    // authentication in this case
                    orgs.requiresAuth = false;
                    return orgs.fetch({
                        success: _.bind(function(collection, response, options) {
                            this.user = new Backbone.Model({
                                id: Math.floor(Math.random() * 10000000000000001).toString(16)
                            });
                            this.globalEvents.trigger('loggedIn', this.config.ensembleUrl);
                        }, this),
                        error: _.bind(function(collection, xhr, options) {
                            this.user = null;
                            this.globalEvents.trigger('loggedOut', this.config.ensembleUrl);
                        }, this)
                    }).promise();
                }
            },
            login: function(loginInfo) {
                var cookieOptions = { path: this.config.authPath };
                $.cookie(this.config.ensembleUrl + '-user', loginInfo.username, _.extend({}, cookieOptions));
                $.cookie(this.config.ensembleUrl + '-pass', loginInfo.password, _.extend({}, cookieOptions));
                return this.fetchUser();
            },
            logout: function() {
                var deferred = $.Deferred();
                var cookieOptions = { path: this.config.authPath };
                $.removeCookie(this.config.ensembleUrl + '-user', _.extend({}, cookieOptions));
                $.removeCookie(this.config.ensembleUrl + '-pass', _.extend({}, cookieOptions));
                this.user = null;
                this.globalEvents.trigger('loggedOut', this.config.ensembleUrl);
                deferred.resolve();
                return deferred.promise();
            },
            handleUnauthorized: function(element, authCallback) {
                this.logout();
                var authView = new AuthView({
                    el: element,
                    submitCallback: authCallback,
                    appId: this.appId,
                    auth: this
                });
                authView.render();
            }
        });

    return BasicAuth;
});


define('text!ev-script/auth/forms/template.html',[],function () { return '<div class="logo"></div>\n<form>\n    <fieldset>\n        <div class="fieldWrap">\n            <label for="username">Username</label>\n            <input id="username" name="username" class="form-text" type="text"/>\n        </div>\n        <div class="fieldWrap">\n            <label for="password">Password</label>\n            <input id="password" name="password" class="form-text" type="password"/>\n        </div>\n        <div class="fieldWrap">\n            <label for="provider">Identity Provider</label>\n            <select id="provider" name="provider" class="form-select"></select>\n        </div>\n        <div class="fieldWrap">\n            <label for="remember">Remember Me</label>\n            <input id="remember" name="remember" type="checkbox"></input>\n        </div>\n        <div class="form-actions">\n            <label></label>\n            <input type="submit" class="form-submit action-submit" value="Submit"/>\n            <div class="loader"></div>\n        </div>\n    </fieldset>\n</form>\n';});

define('ev-script/auth/forms/view',['require','exports','module','jquery','underscore','backbone','ev-script/util/cache','ev-script/util/events','jquery.cookie','jquery-ui','text!ev-script/auth/forms/template.html','text!ev-script/templates/options.html'],function(require, template) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        cacheUtil = require('ev-script/util/cache'),
        eventsUtil = require('ev-script/util/events');

    require('jquery.cookie');
    require('jquery-ui');

    return Backbone.View.extend({
        template: _.template(require('text!ev-script/auth/forms/template.html')),
        optionsTemplate: _.template(require('text!ev-script/templates/options.html')),
        initialize: function(options) {
            this.appId = options.appId;
            this.config = cacheUtil.getAppConfig(this.appId);
            this.appEvents = eventsUtil.getEvents(this.appId);
            this.submitCallback = options.submitCallback || function() {};
            this.auth = options.auth;
        },
        render: function() {
            var $html = $(this.template()),
                $select = $('#provider', $html).append(this.optionsTemplate({
                    collection: this.collection,
                    selectedId: this.config.defaultProvider
                }));
            this.$dialog = $('<div class="ev-auth"></div>');
            this.$el.after(this.$dialog);

            // Handle loading indicator in form
            var $loader = $('div.loader', $html),
                loadingOn = _.bind(function(e, xhr, settings) {
                    $loader.addClass('loading');
                }, this),
                loadingOff = _.bind(function(e, xhr, settings) {
                    $loader.removeClass('loading');
                }, this);
            $(window.document).on('ajaxSend', loadingOn).on('ajaxComplete', loadingOff);

            this.$dialog.dialog({
                title: 'Ensemble Video Login - ' + this.config.ensembleUrl,
                modal: true,
                draggable: false,
                resizable: false,
                width: Math.min(540, $(window).width() - this.config.dialogMargin),
                height: Math.min(250, $(window).height() - this.config.dialogMargin),
                dialogClass: 'ev-dialog',
                create: _.bind(function(event, ui) {
                    this.$dialog.html($html);
                }, this),
                close: _.bind(function(event, ui) {
                    $(window.document).off('ajaxSend', loadingOn).off('ajaxComplete', loadingOff);
                    this.$dialog.dialog('destroy').remove();
                    this.appEvents.trigger('hidePickers');
                }, this)
            });
            $('form', this.$dialog).submit(_.bind(function(e) {
                var $form = $(e.target);
                var username = $('#username', $form).val();
                var password = $('#password', $form).val();
                if (username && password) {
                    this.auth.login({
                        username: username,
                        password: password,
                        authSourceId: $('#provider :selected', $form).val(),
                        persist: $('#remember', $form).is(':checked')
                    }).then(_.bind(function() {
                        this.$dialog.dialog('destroy').remove();
                        this.submitCallback();
                    }, this));
                }
                e.preventDefault();
            }, this));
        }
    });

});

define('ev-script/collections/identity-providers',['require','ev-script/collections/base','ev-script/util/cache'],function(require) {

    'use strict';

    var BaseCollection = require('ev-script/collections/base'),
        cacheUtil = require('ev-script/util/cache'),
        cached = new cacheUtil.Cache();

    return BaseCollection.extend({
        initialize: function(models, options) {
            BaseCollection.prototype.initialize.call(this, models, options);
            this.requiresAuth = false;
        },
        getCached: function(key) {
            return cached.get(this.config.ensembleUrl);
        },
        setCached: function(key, resp) {
            return cached.set(this.config.ensembleUrl, resp);
        },
        url: function() {
            var api_url = this.config.ensembleUrl + '/api/IdentityProviders';
            return this.config.urlCallback ? this.config.urlCallback(api_url) : api_url;
        }
    });

});

define('ev-script/auth/forms/auth',['require','jquery','underscore','ev-script/auth/base/auth','ev-script/models/current-user','ev-script/auth/forms/view','ev-script/collections/identity-providers'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        BaseAuth = require('ev-script/auth/base/auth'),
        CurrentUser = require('ev-script/models/current-user'),
        AuthView = require('ev-script/auth/forms/view'),
        IdentityProviders = require('ev-script/collections/identity-providers'),
        FormsAuth = BaseAuth.extend({
            constructor: function(appId) {
                BaseAuth.prototype.constructor.call(this, appId);
                this.identityProviders = new IdentityProviders({}, {
                    appId: appId
                });
                this.asPromise = this.identityProviders.fetch();
            },
            login: function(loginInfo) {
                var url = this.config.ensembleUrl + '/api/Login';
                return $.ajax({
                    url: this.config.urlCallback ? this.config.urlCallback(url) : url,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        user: loginInfo.username,
                        password: loginInfo.password,
                        identityProviderId: loginInfo.authSourceId,
                        persist: loginInfo.persist
                    },
                    xhrFields: {
                        withCredentials: true
                    },
                    success: _.bind(function(data, status, xhr) {
                        this.user = new CurrentUser(data.Data[0], {
                            appId: this.appId
                        });
                        this.globalEvents.trigger('loggedIn', this.config.ensembleUrl);
                    }, this)
                }).promise();
            },
            logout: function() {
                var url = this.config.ensembleUrl + '/api/Logout';
                return $.ajax({
                    url: this.config.urlCallback ? this.config.urlCallback(url) : url,
                    type: 'POST',
                    xhrFields: {
                        withCredentials: true
                    },
                    success: _.bind(function(data, status, xhr) {
                        this.user = null;
                        this.globalEvents.trigger('loggedOut', this.config.ensembleUrl);
                    }, this)
                }).promise();
            },
            handleUnauthorized: function(element, authCallback) {
                this.user = null;
                this.globalEvents.trigger('loggedOut', this.config.ensembleUrl);
                this.asPromise.done(_.bind(function() {
                    var authView = new AuthView({
                        el: element,
                        submitCallback: authCallback,
                        appId: this.appId,
                        auth: this,
                        collection: this.identityProviders
                    });
                    authView.render();
                }, this));
            }
        });

    return FormsAuth;

});


define('text!ev-script/auth/none/template.html',[],function () { return '<div class="logo"></div>\n<form>\n    <h3>You are unauthorized to access this content.</h3>\n</form>\n';});

define('ev-script/auth/none/view',['require','exports','module','jquery','underscore','backbone','ev-script/util/cache','ev-script/util/events','jquery-ui','text!ev-script/auth/none/template.html'],function(require, template) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        cacheUtil = require('ev-script/util/cache'),
        eventsUtil = require('ev-script/util/events');

    require('jquery-ui');

    return Backbone.View.extend({
        template: _.template(require('text!ev-script/auth/none/template.html')),
        initialize: function(options) {
            this.appId = options.appId;
            this.config = cacheUtil.getAppConfig(this.appId);
            this.appEvents = eventsUtil.getEvents(this.appId);
        },
        render: function() {
            var $html = $(this.template());
            this.$dialog = $('<div class="ev-auth"></div>');
            this.$el.after(this.$dialog);
            this.$dialog.dialog({
                title: 'Ensemble Video Login - ' + this.config.ensembleUrl,
                modal: true,
                draggable: false,
                resizable: false,
                width: Math.min(540, $(window).width() - this.config.dialogMargin),
                height: Math.min(250, $(window).height() - this.config.dialogMargin),
                dialogClass: 'ev-dialog',
                create: _.bind(function(event, ui) {
                    this.$dialog.html($html);
                }, this),
                close: _.bind(function(event, ui) {
                    this.$dialog.dialog('destroy').remove();
                    this.appEvents.trigger('hidePickers');
                }, this)
            });
        }
    });

});

define('ev-script/auth/none/auth',['require','jquery','underscore','ev-script/auth/base/auth','ev-script/auth/none/view'],function(require) {

    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        BaseAuth = require('ev-script/auth/base/auth'),
        AuthView = require('ev-script/auth/none/view'),
        // This auth type doesn't actually prompt to authenticate.  Rather, it
        // displays an authentication warning.
        NoneAuth = BaseAuth.extend({
            constructor: function(appId) {
                BaseAuth.prototype.constructor.call(this, appId);
            },
            handleUnauthorized: function(element, authCallback) {
                this.user = null;
                this.globalEvents.trigger('loggedOut', this.config.ensembleUrl);
                var authView = new AuthView({
                    el: element,
                    submitCallback: authCallback,
                    appId: this.appId,
                    auth: this,
                    collection: this.identityProviders
                });
                authView.render();
            }
        });

    return NoneAuth;

});

define('ev-script',['require','backbone','underscore','jquery','ev-script/models/video-settings','ev-script/models/playlist-settings','ev-script/views/field','ev-script/views/video-embed','ev-script/views/playlist-embed','ev-script/models/app-info','ev-script/auth/basic/auth','ev-script/auth/forms/auth','ev-script/auth/none/auth','ev-script/util/events','ev-script/util/cache'],function(require) {

    'use strict';

    var Backbone = require('backbone'),
        _ = require('underscore'),
        $ = require('jquery'),
        VideoSettings = require('ev-script/models/video-settings'),
        PlaylistSettings = require('ev-script/models/playlist-settings'),
        FieldView = require('ev-script/views/field'),
        VideoEmbedView = require('ev-script/views/video-embed'),
        PlaylistEmbedView = require('ev-script/views/playlist-embed'),
        AppInfo = require('ev-script/models/app-info'),
        BasicAuth = require('ev-script/auth/basic/auth'),
        FormsAuth = require('ev-script/auth/forms/auth'),
        NoneAuth = require('ev-script/auth/none/auth'),
        eventsUtil = require('ev-script/util/events'),
        cacheUtil = require('ev-script/util/cache');

    var EnsembleApp = function(appOptions) {

        // Lame unique id generator
        var appId = Math.floor(Math.random() * 10000000000000001).toString(16);

        // Get or create a new cache to store objects specific to EV
        // installation but common across 'app' instances (e.g. videos
        // accessible by a given user).
        var evCache = cacheUtil.caches.get(appOptions.ensembleUrl);
        if (!evCache) {
            evCache = cacheUtil.caches.set(appOptions.ensembleUrl, new cacheUtil.Cache());
        }

        var defaults = {
            // Application root of the EV installation.
            ensembleUrl: '',
            // Cookie path.
            authPath: '',
            // Models/collections will typically fetch directly from the API,
            // but this method is called in case that needs to be overridden
            // (e.g. in cross-domain scenarios where we're using a proxy).
            urlCallback: function(url) { return url; },
            // Number of results to fetch at a time from the server (page size).
            pageSize: 100,
            // The height of our scroll loader. This can be an integer (number
            // of pixels), or css string, e.g. '80%'.
            scrollHeight: null,
            // If true, content will try to resize to fit parent container.
            fitToParent: false,
            // In scenarios where we have multiple fields on a page we want to
            // automatically hide inactive pickers to preserve screen real
            // estate.  Set to false to disable.
            hidePickers: true,
            // The difference between window dimensions and maximum dialog size.
            dialogMargin: 40,
            // This can be 'forms', 'basic' (default) or 'none' (in which case
            // an access denied message is displayed and user is not prompted
            // to authenticate).
            authType: 'basic',
            // Set this in order to select the default identity provider in the
            // forms auth identity provider dropdown.
            defaultProvider: '',
            // Set this in order to select the default width in video settings
            defaultVideoWidth: '',
            // Location for plupload flash runtime
            pluploadFlashPath: ''
        };

        // Add our configuration to the app cache...this is specific to this
        // 'app' instance.  There may be multiple instances on a single page w/
        // unique settings.
        var config = cacheUtil.setAppConfig(appId, _.extend({}, defaults, appOptions));

        // Create an event aggregator specific to our app
        eventsUtil.initEvents(appId);
        this.appEvents = eventsUtil.getEvents(appId);
        // eventsUtil also provides us with a global event aggregator for events
        // that span app instances
        this.globalEvents = eventsUtil.getEvents();

        // Features depend on info asynchronously retreived below...so leverage
        // promises to coordinate loading
        var loading = $.Deferred();
        _.extend(this, loading.promise());

        var info = new AppInfo({}, {
            appId: appId
        });
        cacheUtil.setAppInfo(appId, info);
        info.fetch({})
        .always(_.bind(function() {
            // This is kinda lazy...but this will only be set in 3.6+ versions
            // so we don't actually need to check the version number
            if (!info.get('ApplicationVersion') && config.authType === 'forms') {
                loading.reject('Configured to use forms authentication against a pre-3.6 API.');
            } else {
                // This will initialize and cache an auth object for our app
                var auth;
                switch (config.authType) {
                    case 'forms':
                        auth = new FormsAuth(appId);
                        break;
                    case 'none':
                        auth = new NoneAuth(appId);
                        break;
                    default:
                        auth = new BasicAuth(appId);
                        break;
                }
                cacheUtil.setAppAuth(appId, auth);

                // TODO - document and add some flexibility to params (e.g. in addition
                // to selector allow element or object).
                this.handleField = function(fieldWrap, settingsModel, fieldSelector) {
                    var $field = $(fieldSelector, fieldWrap);
                    var fieldView = new FieldView({
                        id: fieldWrap.id || appId,
                        el: fieldWrap,
                        model: settingsModel,
                        $field: $field,
                        appId: appId
                    });
                };

                // TODO - document.  See handleField comment too.
                this.handleEmbed = function(embedWrap, settingsModel) {
                    if (settingsModel instanceof VideoSettings) {
                        var videoEmbed = new VideoEmbedView({
                            el: embedWrap,
                            model: settingsModel,
                            appId: appId
                        });
                    } else {
                        var playlistEmbed = new PlaylistEmbedView({
                            el: embedWrap,
                            model: settingsModel,
                            appId: appId
                        });
                    }
                };

                this.getEmbedCode = function(settings) {
                    var $div = $('<div/>');
                    if (settings.type === 'video') {
                        this.handleEmbed($div[0], new VideoSettings(settings));
                    } else {
                        this.handleEmbed($div[0], new PlaylistSettings(settings));
                    }
                    return $div.html();
                };

                this.appEvents.trigger('appLoaded');
                loading.resolve();
            }
        }, this));
    };

    return {
        VideoSettings: VideoSettings,
        PlaylistSettings: PlaylistSettings,
        EnsembleApp: EnsembleApp
    };

});

    // Register in the values from the outer closure for common dependencies
    // as local almond modules

    define('jquery', function () {
        return $ || jQuery;
    });

    define('jquery-ui', ['jquery'], function() {});

    define('plupload', function() {
        return plupload;
    });

    define('jquery.plupload.queue', ['jquery', 'plupload'], function() {});

    // Use almond's special top-level, synchronous require to trigger factory
    // functions, get the final module value, and export it as the public
    // value.
    return require('ev-script');
}));

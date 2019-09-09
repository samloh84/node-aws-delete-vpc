const _ = require('lodash');
const Promise = require('bluebird');

let wrap = function (fn, options) {
    let flatten_results = _.get(options, 'flatten_results', true);
    let concurrency = _.get(options, 'concurrency', 1);
    let message = _.get(options, 'message');

    return function () {
        let args = _.slice(arguments);

        if (_.size(args) > 0 && _.isArray(args[0])) {
            let count = _.size(args[0]);
            return Promise.map(args[0], function (argument, index) {
                if (!_.isNil(message)) {
                    if (_.isString(argument)) {
                        console.log(`${message} - ${index + 1} of ${count} - ${argument}`);
                    } else {
                        console.log(`${message} - ${index + 1} of ${count}`);
                    }
                }
                return Promise.resolve(fn.apply(null, _.concat([argument], _.slice(args, 1))));
            }, {concurrency: concurrency})
                .then(function (results) {
                    if (flatten_results) {
                        return _.flatten(results);
                    } else {
                        return results;
                    }
                });
        } else {
            if (!_.isNil(message)) {
                if (_.isString(args[0])) {
                    console.log(`${message} - ${args[0]}`);
                } else {
                    console.log(message);
                }
            }
            return Promise.resolve(fn.apply(null, args));
        }
    };
};

/**
 *
 * @param {Object} options
 * @param {*[]} options.args Arguments to all functions
 * @param {*[]|Promise<*[]>} options.op Op function
 * @param {*[]|Promise<*[]>} [options.op_args] Arguments to Op function
 * @param {*[]|Promise<*[]>} options.list Listing function
 * @param {*[]|Promise<*[]>} [options.list_args] Arguments to Listing function
 * @param {*[]|Promise<*[]>} options.validate Validate function
 * @param {*[]|Promise<*[]>} [options.validate_args] Arguments to Validate function
 * @param {Number} [options.delay=1000] Delay in microseconds
 * @param {Number} [options.max_retries=-1] Max number of retries
 * @param {String} options.message Message to print
 * @returns {Promise<boolean>}
 */
let retry = function (options) {
    let args = _.get(options, 'args');

    let list = _.get(options, 'list');
    let list_args = _.get(options, 'list_args');
    let op = _.get(options, 'op');
    let op_args = _.get(options, 'op_args', args);
    let validate = _.get(options, 'validate');
    let validate_args = _.get(options, 'validate_args', args);
    let delay = _.get(options, 'delay', 1000);
    let max_retries = _.get(options, 'retries', -1);
    let retries = _.get(options, 'retries', 0);
    let message = _.get(options, 'message');


    if (!_.isNil(message)) {
        console.log(message);
    }

    return Promise.resolve(op_args || args)
        .then(function (op_args) {
            if (_.isFunction(op_args)) {
                return Promise.resolve(op_args.apply(null, args));
            } else {
                return op_args;
            }
        })
        .then(function (op_args) {
            return Promise.resolve(op.apply(null, op_args))
                .catch(function (err) {
                    console.error(`Error executing ${op.name}: ${err.stack}`)
                });
        })
        .then(function () {
            return Promise.resolve(list_args || args);
        })
        .then(function (list_args) {
            if (_.isFunction(list_args)) {
                return Promise.resolve(list_args.apply(null, args));
            } else {
                return list_args;
            }
        })
        .then(function (list_args) {
            return Promise.resolve(list.apply(null, list_args));
        })
        .then(function (list_results) {
            return Promise.resolve(validate_args || list_results || args);
        })
        .then(function (validate_args) {
            if (_.isFunction(validate_args)) {
                return Promise.resolve(validate_args.apply(null, args));
            } else {
                return validate_args;
            }
        })
        .then(function (validate_args) {
            return Promise.resolve(validate.apply(null, validate_args));
        })
        .then(function (validate_result) {
            if (!validate_result && (max_retries < 0 || retries < max_retries)) {
                return Promise.delay(delay)
                    .then(function () {
                        if (!_.isNil(message)) {
                            console.log(`Retrying ${message} - ${retries + 1} of ${max_retries}`)
                        }
                        return retry(_.merge({}, options, {retries: retries++}));
                    })
            } else {
                if (!_.isNil(message)) {
                    if (validate_result) {
                        console.log(`${message} succeeded`);
                    } else {
                        console.log(`${message} failed`);
                    }
                }

                return validate_result;
            }
        });
};


let queue = function (queue, options) {
    let concurrency = _.get(options, 1);
    return Promise.map(queue, function (item) {
        let fn = _.get(item, 'fn');
        let args = _.get(item, 'args');
        return Promise.resolve(fn.apply(null, args));
    }, {concurrency: concurrency});

};


let debug_log = function (obj) {
    console.error(JSON.stringify(obj, null, 4));
};

module.exports = {
    wrap: wrap,
    retry: retry,
    queue: queue,
    debug_log: debug_log,
};
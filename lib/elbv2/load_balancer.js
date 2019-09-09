const Promise = require('bluebird');
const _ = require('lodash');
const elbv2 = require('../aws').elbv2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html#describeLoadBalancers-property
let describe_load_balancers = util.wrap(function (params) {
    return Promise.resolve(elbv2.describeLoadBalancers(params).promise())
        .then(function (results) {
            return _.get(results, 'LoadBalancers');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html#deleteLoadBalancer-property
let delete_load_balancer = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {LoadBalancerArn: params};
    }
    return Promise.resolve(elbv2.deleteLoadBalancer(params).promise());
}, {message: 'Deleting Load Balancer'});


let describe_load_balancers_by_load_balancer_arns = function (load_balancer_arns) {
    if (!_.isArray(load_balancer_arns)) {
        load_balancer_arns = [load_balancer_arns];
    }
    return describe_load_balancers({LoadBalancerArns: load_balancer_arns});
};

let describe_load_balancers_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_load_balancers()
        .then(function (load_balancers) {
            return _.filter(load_balancers, function (load_balancer) {
                return _.includes(vpc_ids, load_balancer.VpcId)
            });
        });
};


let delete_load_balancers_by_load_balancer_arns = function (load_balancer_arns) {
    if (!_.isArray(load_balancer_arns)) {
        load_balancer_arns = [load_balancer_arns];
    }
    return util.retry({
        args: load_balancer_arns,
        op: delete_load_balancer,
        list: describe_load_balancers_by_load_balancer_arns,
        validate: _.isEmpty,
        message: 'Deleting Load Balancers'
    });
};


module.exports = {
    describe_load_balancers: describe_load_balancers,
    delete_load_balancer: delete_load_balancer,
    describe_load_balancers_by_load_balancer_arns: describe_load_balancers_by_load_balancer_arns,
    describe_load_balancers_by_vpc_ids: describe_load_balancers_by_vpc_ids,
    delete_load_balancers_by_load_balancer_arns: delete_load_balancers_by_load_balancer_arns,
};

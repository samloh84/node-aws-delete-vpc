const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property
let describe_instances = util.wrap(function (params) {
    return Promise.resolve(ec2.describeInstances(params).promise())
        .then(function (results) {
            return _.flatten(_.map(_.get(results, 'Reservations'), 'Instances'));
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteInstance-property
let delete_instance = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {InstanceId: params};
    }
    return Promise.resolve(ec2.deleteInstance(params).promise());
}, {message: 'Deleting Instance'});


let describe_instances_by_instance_ids = function (instance_ids) {
    if (!_.isArray(instance_ids)) {
        instance_ids = [instance_ids];
    }
    return describe_instances({InstanceIds: instance_ids});
};

let describe_instances_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_instances({Filter: [{Name: 'vpc-id', Values: vpc_ids}]});
};


let delete_instances_by_instance_ids = function (instance_ids) {
    if (!_.isArray(instance_ids)) {
        instance_ids = [instance_ids];
    }
    return util.retry({
        args: instance_ids,
        op: delete_instance,
        list: describe_instances_by_instance_ids,
        validate: _.isEmpty,
        message: 'Deleting Instances'
    });
};


module.exports = {
    describe_instances: describe_instances,
    delete_instance: delete_instance,
    describe_instances_by_instance_ids: describe_instances_by_instance_ids,
    describe_instances_by_vpc_ids: describe_instances_by_vpc_ids,
    delete_instances_by_instance_ids: delete_instances_by_instance_ids,
};

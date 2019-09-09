const Promise = require('bluebird');
const _ = require('lodash');
const autoscaling = require('../aws').autoscaling;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/AutoScaling.html#describeAutoscalingGroups-property
let describe_autoscaling_groups = util.wrap(function (params) {
    return Promise.resolve(autoscaling.describeAutoScalingGroups(params).promise())
        .then(function (results) {
            return _.get(results, 'AutoScalingGroups');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/AutoScaling.html#deleteAutoscalingGroup-property
let delete_autoscaling_group = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {AutoScalingGroupName: params};
    }
    return Promise.resolve(autoscaling.deleteAutoScalingGroup(params).promise());
}, {message: 'Deleting AutoScalingGroup'});


let describe_autoscaling_groups_by_autoscaling_group_names = function (autoscaling_group_names) {
    if (!_.isArray(autoscaling_group_names)) {
        autoscaling_group_names = [autoscaling_group_names];
    }
    return describe_autoscaling_groups({
        AutoScalingGroupNames: autoscaling_group_names
    });
};

let describe_autoscaling_groups_by_subnet_ids = function (subnet_ids) {
    if (!_.isArray(subnet_ids)) {
        subnet_ids = [subnet_ids];
    }
    return describe_autoscaling_groups()
        .then(function (autoscaling_groups) {
            return _.filter(autoscaling_groups, function (autoscaling_group) {
                return _.includes(autoscaling_group.VPCZoneIdentifier, subnet_ids);
            });
        });
};


let delete_autoscaling_groups_by_autoscaling_group_names = function (autoscaling_group_names) {
    if (!_.isArray(autoscaling_group_names)) {
        autoscaling_group_names = [autoscaling_group_names];
    }
    return util.retry({
        args: autoscaling_group_names,
        op: delete_autoscaling_group,
        list: describe_autoscaling_groups_by_autoscaling_group_names,
        validate: _.isEmpty,
        message: 'Deleting AutoScalingGroup'
    });
};


module.exports = {
    describe_autoscaling_groups: describe_autoscaling_groups,
    delete_autoscaling_group: delete_autoscaling_group,
    describe_autoscaling_groups_by_autoscaling_group_names: describe_autoscaling_groups_by_autoscaling_group_names,
    describe_autoscaling_groups_by_subnet_ids: describe_autoscaling_groups_by_subnet_ids,
    delete_autoscaling_groups_by_autoscaling_group_names: delete_autoscaling_groups_by_autoscaling_group_names,
};

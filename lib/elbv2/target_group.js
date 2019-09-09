const Promise = require('bluebird');
const _ = require('lodash');
const elbv2 = require('../aws').elbv2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html#describeTargetGroups-property
let describe_target_groups = util.wrap(function (params) {
    return Promise.resolve(elbv2.describeTargetGroups(params).promise())
        .then(function (results) {
            return _.get(results, 'TargetGroups');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html#deleteTargetGroup-property
let delete_target_group = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {TargetGroupArn: params};
    }
    return Promise.resolve(elbv2.deleteTargetGroup(params).promise());
}, {message: 'Deleting Target Group'});


let describe_target_groups_by_target_group_arns = function (target_group_arns) {
    if (!_.isArray(target_group_arns)) {
        target_group_arns = [target_group_arns];
    }
    return describe_target_groups({TargetGroupArns: target_group_arns});
};

let describe_target_groups_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_target_groups()
        .then(function (target_groups) {
            return _.filter(target_groups, function (target_group) {
                return _.includes(vpc_ids, target_group.VpcId)
            });
        });
};


let delete_target_groups_by_target_group_arns = function (target_group_arns) {
    if (!_.isArray(target_group_arns)) {
        target_group_arns = [target_group_arns];
    }
    return util.retry({
        args: target_group_arns,
        op: delete_target_group,
        list: describe_target_groups_by_target_group_arns,
        validate: _.isEmpty,
        message: 'Deleting Target Groups'
    });
};


module.exports = {
    describe_target_groups: describe_target_groups,
    delete_target_group: delete_target_group,
    describe_target_groups_by_target_group_arns: describe_target_groups_by_target_group_arns,
    describe_target_groups_by_vpc_ids: describe_target_groups_by_vpc_ids,
    delete_target_groups_by_target_group_arns: delete_target_groups_by_target_group_arns,
};

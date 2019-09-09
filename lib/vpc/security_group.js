const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeSecurityGroups-property
let describe_security_groups = util.wrap(function (params) {
    return Promise.resolve(ec2.describeSecurityGroups(params).promise())
        .then(function (results) {
            return _.get(results, 'SecurityGroups');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSecurityGroup-property
let delete_security_group = util.wrap(function (params) {
    if (_.isArray(params)) {
        return Promise.map(params, function (security_group, index) {
            console.log(`Deleting Security Group ${index + 1} of ${_.size(params)}`);
            return delete_security_group(security_group);
        }, {concurrency: 1})
    } else if (_.isString(params)) {
        params = {GroupId: params};
    }
    console.log(`Deleting Security Group ${JSON.stringify(params)}`);
    return Promise.resolve(ec2.deleteSecurityGroup(params).promise());
}, {message: 'Delete Security Group'});


let describe_security_groups_by_security_group_ids = function (security_group_ids) {
    if (!_.isArray(security_group_ids)) {
        security_group_ids = [security_group_ids];
    }
    return describe_security_groups({GroupIds: security_group_ids});
};

let describe_security_groups_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_security_groups({
        Filter: [{
            Name: 'vpc-id',
            Values: vpc_ids
        }]
    });
};


// https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RevokeSecurityGroupIngress.html
let revoke_security_group_ingress = util.wrap(function (params) {
    return Promise.resolve(ec2.revokeSecurityGroupIngress(params).promise());
}, {message: 'Revoking Security Group Ingress Rule'});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#revokeSecurityGroupEgress-property
let revoke_security_group_egress = util.wrap(function (params) {
    return Promise.resolve(ec2.revokeSecurityGroupEgress(params).promise());
}, {message: 'Revoking Security Group Egress Rule'});


let revoke_security_group_rule = util.wrap(function (rule) {
    let direction = _.get(rule, 'direction');
    let params = _.omit(rule, ['direction']);
    if (direction === 'ingress') {
        return Promise.resolve(ec2.revokeSecurityGroupIngress(params).promise());
    } else {
        return Promise.resolve(ec2.revokeSecurityGroupEgress(params).promise());
    }
}, {message: 'Revoking Security Group Rule'});


let list_security_group_rules = function (security_group) {
    if (_.isArray(security_group)) {
        return _.flatten(_.map(security_group, list_security_group_rules));
    }

    let rules = [];

    let rule_directions = {
        IpPermissions: 'ingress',
        IpPermissionsEgress: 'egress'
    };
    let rule_reference_types = ['IpRanges', 'Ipv6Ranges', 'PrefixListIds', 'UserIdGroupPairs'];

    _.each(rule_directions, function (rule_direction, rule_list_key) {
        let rules = _.get(security_group, rule_list_key);

        _.each(rules, function (rule) {
            _.each(rule_reference_types, function (rule_reference_type) {
                _.each(_.get(rule, rule_reference_type), function (ip_permission_entry) {
                    let ip_permission_to_revoke = _.merge({}, _.omit(rule, rule_reference_types), _.set({}, rule_reference_type, [ip_permission_entry]));
                    rules.push({
                        direction: rule_direction,
                        GroupId: security_group.GroupId,
                        IpPermissions: [ip_permission_to_revoke]
                    })
                });
            });
        });

    });

    return rules;
};

let list_security_group_rules_by_security_group_ids = function (security_group_ids) {
    return describe_security_groups_by_security_group_ids(security_group_ids)
        .then(list_security_group_rules);
};

let revoke_security_group_rules_by_security_group_ids = function (security_group_ids) {
    if (!_.isArray(security_group_ids)) {
        security_group_ids = [security_group_ids];
    }

    return util.retry({
        args: security_group_ids,
        op: revoke_security_group_rule,
        op_args: list_security_group_rules_by_security_group_ids,
        list: list_security_group_rules_by_security_group_ids,
        validate: function (rules) {
            return _.isEmpty(rules);
        },
        message: 'Revoking Security Group Rules'
    });
};


let delete_security_groups_by_security_group_ids = function (security_group_ids) {
    if (!_.isArray(security_group_ids)) {
        security_group_ids = [security_group_ids];
    }

    return revoke_security_group_rules_by_security_group_ids(security_group_ids)
        .then(function () {
            return util.retry({
                args: security_group_ids,
                op: delete_security_group,
                list: describe_security_groups_by_security_group_ids,
                validate: _.isEmpty,
                message: 'Deleting Security Group'
            });
        });
};


module.exports = {
    revoke_security_group_egress: revoke_security_group_egress,
    list_security_group_rules: list_security_group_rules,
    describe_security_groups_by_vpc_ids: describe_security_groups_by_vpc_ids,
    revoke_security_group_rules_by_security_group_ids: revoke_security_group_rules_by_security_group_ids,
    describe_security_groups: describe_security_groups,
    list_security_group_rules_by_security_group_ids: list_security_group_rules_by_security_group_ids,
    describe_security_groups_by_security_group_ids: describe_security_groups_by_security_group_ids,
    revoke_security_group_rule: revoke_security_group_rule,
    delete_security_group: delete_security_group,
    delete_security_groups_by_security_group_ids: delete_security_groups_by_security_group_ids,
    revoke_security_group_ingress: revoke_security_group_ingress,
};

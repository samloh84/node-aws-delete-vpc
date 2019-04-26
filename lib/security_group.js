const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('./ec2');


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeSecurityGroups-property
function list_security_groups(params) {
    return ec2.describeSecurityGroups(params).promise()
        .then(function (response) {
            return response.SecurityGroups;
        });
}

function list_security_groups_by_vpc_ids(vpc_ids) {

    return list_security_groups({
        Filters: [
            {
                Name: "vpc-id",
                Values: vpc_ids
            }
        ]
    });
}

function list_security_groups_by_ids(security_group_ids) {

    return list_security_groups({
        Filters: [
            {
                Name: "group-id",
                Values: security_group_ids
            }
        ]
    });
}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#revokeSecurityGroupIngress-property
// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#revokeSecurityGroupEgress-property
function revoke_security_group_rules(security_group_ids) {
    if (_.isEmpty(security_group_ids)) {
        return;
    }


    function _list_security_group_rules(security_groups) {
        if (_.isNil(security_groups)) {
            security_groups = list_security_groups_by_ids(security_group_ids);
        } else {
            security_groups = Promise.resolve(security_groups);
        }

        return security_groups
            .then(function (security_groups) {
                let rules_to_revoke = [];

                let rule_directions = {
                    IpPermissions: 'ingress',
                    IpPermissionsEgress: 'egress'
                };
                let rule_reference_types = ['IpRanges', 'Ipv6Ranges', 'PrefixListIds', 'UserIdGroupPairs'];


                _.each(security_groups, function (security_group) {
                    _.each(rule_directions, function (rule_direction, rule_list_key) {
                        let rules = _.get(security_group, rule_list_key);

                        _.each(rules, function (rule) {
                            _.each(rule_reference_types, function (rule_reference_type) {
                                _.each(_.get(rule, rule_reference_type), function (ip_permission_entry) {
                                    let ip_permission_to_revoke = _.merge({}, _.omit(rule, rule_reference_types), _.set({}, rule_reference_type, [ip_permission_entry]));
                                    rules_to_revoke.push({
                                        direction: rule_direction,
                                        GroupId: security_group.GroupId,
                                        IpPermissions: [ip_permission_to_revoke]
                                    })
                                });
                            });
                        });

                    });
                });

                return rules_to_revoke;
            });

    }


    function _revoke_security_group_rules(security_group_rules) {
        if (_.isNil(security_group_rules)) {
            security_group_rules = _list_security_group_rules();
        } else {
            security_group_rules = Promise.resolve(security_group_rules);
        }

        return security_group_rules
            .then(function (rules) {
                return Promise.map(rules, function (rule, index) {
                    console.log(`Revoking Security Group Rule: ${index} of ${_.size(rules)}`);
                    let rule_to_revoke = _.omit(rule, ['direction']);
                    if (rule.direction === 'ingress') {
                        return ec2.revokeSecurityGroupIngress(rule_to_revoke).promise();
                    } else {
                        return ec2.revokeSecurityGroupEgress(rule_to_revoke).promise();
                    }
                }, {concurrency: 1});
            })
            .then(function () {
                return _list_security_group_rules()
            })
            .then(function (rules) {
                if (!_.isEmpty(rules.ingress) || !_.isEmpty(rules.egress)) {
                    return Promise.delay(15000)
                        .then(function () {
                            return _revoke_security_group_rules(rules);
                        })
                } else {
                    console.log(`Revoking ${_.size(rules)} Security Group Rules`);
                }

            });
    }

    return _revoke_security_group_rules();
}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSecurityGroup-property
// Note: If you attempt to delete a security group that is associated with an instance, or is referenced by another security group, the operation fails with InvalidGroup.InUse in EC2-Classic or DependencyViolation in EC2-VPC.
function delete_security_groups(security_group_ids) {

    //revokeSecurityGroupIngress
    //revokeSecurityGroupEgress

    if (_.isEmpty(security_group_ids)) {
        return Promise.resolve();
    }


    return Promise.map(security_group_ids, function (security_group_id) {
        console.log(`Deleting Security Group: ${security_group_id}`);
        return ec2.deleteSecurityGroup({GroupId: security_group_id}).promise()
    }, {concurrency: 1})
        .then(function () {
            return list_security_groups_by_ids(security_group_ids)
        })
        .then(function (security_groups) {
            if (!_.every(security_groups, {State: 'deleted'})) {
                return Promise.delay(15000)
                    .then(function () {
                        return delete_security_groups(security_group_ids);
                    })
            } else {
                console.log(`Deleted Security Groups: ${security_group_ids.join(', ')}`);
            }
        });

}


module.exports = {
    list_security_groups: list_security_groups,
    list_security_groups_by_vpc_ids: list_security_groups_by_vpc_ids,
    list_security_groups_by_ids: list_security_groups_by_ids,
    delete_security_groups: delete_security_groups,
    revoke_security_group_rules: revoke_security_group_rules
};
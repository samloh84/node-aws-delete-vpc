const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('./ec2');
const vpc = require('./vpc');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeNetworkAcls-property
function list_network_acls(params) {
    return ec2.describeNetworkAcls(params).promise()
        .then(function (response) {
            return response.NetworkAcls;
        });
}

function list_network_acls_by_vpc_ids(vpc_ids) {

    return list_network_acls({
        Filters: [
            {
                Name: "vpc-id",
                Values: vpc_ids
            }
        ]
    });
}

function list_network_acls_by_ids(network_acl_ids) {

    return list_network_acls({
        Filters: [
            {
                Name: "network-acl-id",
                Values: network_acl_ids
            }
        ]
    });
}


function replace_network_acl_associations(network_acl_ids) {

    function _list_network_acl_associations(network_acls) {
        if (_.isNil(network_acls)) {
            network_acls = list_network_acls_by_ids(network_acl_ids)
        } else {
            network_acls = Promise.resolve(network_acls);
        }

        return network_acls
            .then(function (network_acls) {
                let associations = [];

                _.each(network_acls, function (network_acl) {
                    if (network_acl.IsDefault) {
                        return;
                    }

                    _.each(network_acl.Associations, function (network_acl_association) {
                        associations.push({
                            AssociationId: network_acl_association.NetworkAclAssociationId,
                            NetworkAclId: network_acl_association.NetworkAclId,
                            SubnetId: network_acl_association.Subdirectory,
                            VpcId: network_acl.VpcId,
                        })
                    });
                });
                return associations;
            })
    }

    function _get_default_network_acl_ids(vpc_ids) {
        return list_network_acls_by_vpc_ids(vpc_ids)
            .then(function (network_acls) {
                let default_network_acl_ids = {};
                _.each(network_acls, function (network_acl) {
                    if (network_acl.IsDefault) {
                        _.set(default_network_acl_ids, network_acl.VpcId, network_acl.NetworkAclId)
                    }
                });
                return default_network_acl_ids;
            })
    }

    function _replace_network_acl_associations(network_acl_associations, default_network_acl_ids) {
        if (_.isNil(network_acl_associations)) {
            network_acl_associations = _list_network_acl_associations();
        } else {
            network_acl_associations = Promise.resolve(network_acl_associations);
        }

        return network_acl_associations
            .then(function (associations) {
                return Promise.map(associations, function (association) {
                    return ec2.replaceNetworkAclAssociation({
                        AssociationId: association.AssociationId,
                        NetworkAclId: _.get(default_network_acl_ids, association.VpcId)
                    }).promise();
                }, {concurrency: 1})
            })
            .then(function () {
                return _list_network_acl_associations()
            })
            .then(function (associations) {
                if (!_.isEmpty(associations)) {
                    return Promise.delay(15000)
                        .then(function () {
                            return _replace_network_acl_associations(associations, default_network_acl_ids);
                        });
                }
            });

    }

    return _list_network_acl_associations()
        .then(function (associations) {
            return Promise.props({
                associations: associations,
                default_network_acl_ids: _get_default_network_acl_ids(_.map(associations, 'VpcId'))
            });
        })
        .then(function (props) {
            return _replace_network_acl_associations(props.associations, props.default_network_acl_ids);
        });

}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteNetworkAcl-property
// Note: You can't delete the ACL if it's associated with any subnets. You can't delete the default network ACL.
function delete_network_acls(network_acl_ids) {
    if (_.isEmpty(network_acl_ids)) {
        return Promise.resolve();
    }
    return Promise.map(network_acl_ids, function (network_acl_id) {
        console.log(`Deleting Network ACL: ${network_acl_id}`);
        return ec2.deleteNetworkAcl({NetworkAclId: network_acl_id}).promise()
    }, {concurrency: 1})
        .then(function () {
            return list_network_acls_by_ids(network_acl_ids)
        })
        .then(function (network_acls) {
            if (!_.every(network_acls, {State: 'deleted'})) {
                return Promise.delay(15000)
                    .then(function () {
                        return delete_network_acls(network_acl_ids);
                    })
            } else {
                console.log(`Deleted Network ACLs: ${network_acl_ids.join(', ')}`);
            }
        });

}


module.exports = {
    list_network_acls: list_network_acls,
    list_network_acls_by_vpc_ids: list_network_acls_by_vpc_ids,
    list_network_acls_by_ids: list_network_acls_by_ids,
    delete_network_acls: delete_network_acls,
    replace_network_acl_associations: replace_network_acl_associations
};
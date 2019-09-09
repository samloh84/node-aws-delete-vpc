const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeNetworkAcls-property
let describe_network_acls = util.wrap(function (params) {
    return Promise.resolve(ec2.describeNetworkAcls(params).promise())
        .then(function (results) {
            return _.get(results, 'NetworkAcls');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteNetworkAcl-property
let delete_network_acl = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {NetworkAclId: params};
    }
    return Promise.resolve(ec2.deleteNetworkAcl(params).promise());
}, {message: 'Deleting Network Acl'});

let describe_network_acls_by_network_acl_ids = function (network_acl_ids) {
    if (!_.isArray(network_acl_ids)) {
        network_acl_ids = [network_acl_ids];
    }
    return describe_network_acls({NetworkAclIds: network_acl_ids});
};


let describe_network_acls_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_network_acls({Filter: [{Name: 'vpc-id', Values: vpc_ids}]});
};

let delete_network_acls_by_network_acl_ids = function (network_acl_ids) {
    if (!_.isArray(network_acl_ids)) {
        network_acl_ids = [network_acl_ids];
    }

    return replace_network_acl_associations_by_network_acl_ids(network_acl_ids)
        .then(function () {
            return util.retry({
                args: network_acl_ids,
                op: delete_network_acl,
                list: describe_network_acls_by_network_acl_ids,
                validate: function (network_acls) {
                    return _.isEmpty(network_acls);
                },
                message: 'Deleting Network Acls'
            });

        });
};

let list_default_network_acls = function (network_acls) {
    let default_network_acls = {};

    _.each(network_acls, function (network_acl) {
        if (network_acl.IsDefault) {
            _.set(default_network_acls, network_acl.VpcId, network_acl.NetworkAclId);
        }
    });

    return default_network_acls;
};

let list_network_acl_associations = function (network_acl) {
    if (_.isArray(network_acl)) {
        return _.flatten(_.map(network_acl, list_network_acl_associations));
    }

    let associations = [];

    if (!network_acl.isDefault) {
        _.each(network_acl.Associations, function (network_acl_association) {
            associations.push({
                AssociationId: network_acl_association.NetworkAclAssociationId,
                VpcId: network_acl.VpcId
            });
        });
    }

    return associations;
};


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#replaceNetworkAclAssociation-property
let replace_network_acl_association = util.wrap(function (params) {
    console.log(`Disassociating Network Acl Association ${JSON.stringify(params)}`);
    return Promise.resolve(ec2.replaceNetworkAclAssociation(params).promise());
});

let list_network_acl_association_replacements_by_network_acl_ids = function (network_acl_ids) {
    return describe_network_acls_by_network_acl_ids(network_acl_ids)
        .then(function (network_acls) {
            let default_network_acls = list_default_network_acls(network_acls);
            let network_acl_associations = list_network_acl_associations(network_acls, default_network_acls);
            return _.map(network_acl_associations, function (network_acl_association) {
                return {
                    AssociationId: network_acl_association.NetworkAclAssociationId,
                    NetworkAclId: _.get(default_network_acls, network_acl_association.VpcId)
                };
            })
        });
};

let replace_network_acl_associations_by_network_acl_ids = function (network_acl_ids) {
    if (!_.isArray(network_acl_ids)) {
        network_acl_ids = [network_acl_ids];
    }

    return util.retry({
        args: network_acl_ids,
        op: replace_network_acl_association,
        op_args: list_network_acl_association_replacements_by_network_acl_ids,
        list: list_network_acl_association_replacements_by_network_acl_ids,
        validate: _.isEmpty,
        message: 'Replacing Network Acl Associations'
    });
};


module.exports = {
    delete_network_acl: delete_network_acl,
    delete_network_acls_by_network_acl_ids: delete_network_acls_by_network_acl_ids,
    describe_network_acls: describe_network_acls,
    describe_network_acls_by_network_acl_ids: describe_network_acls_by_network_acl_ids,
    describe_network_acls_by_vpc_ids: describe_network_acls_by_vpc_ids,
    replace_network_acl: replace_network_acl,
    replace_network_acls_by_network_acl_ids: replace_network_acl_associations_by_network_acl_ids,
    list_network_acl_associations: list_network_acl_associations
};

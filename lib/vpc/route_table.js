const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeRouteTables-property
let describe_route_tables = util.wrap(function (params) {
    return Promise.resolve(ec2.describeRouteTables(params).promise())
        .then(function (results) {
            return _.get(results, 'RouteTables');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteRouteTable-property
let delete_route_table = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {RouteTableId: params};
    }
    return Promise.resolve(ec2.deleteRouteTable(params).promise());
}, {message: 'Deleting Route Table'});


let describe_route_tables_by_route_table_ids = function (route_table_ids) {
    if (!_.isArray(route_table_ids)) {
        route_table_ids = [route_table_ids];
    }
    return describe_route_tables({RouteTableIds: route_table_ids});
};

let describe_route_tables_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_route_tables({Filter: [{Name: 'vpc-id', Values: vpc_ids}]});
};


let delete_route_tables_by_route_table_ids = function (route_table_ids) {
    if (!_.isArray(route_table_ids)) {
        route_table_ids = [route_table_ids];
    }

    return disassociate_route_tables_by_route_table_ids(route_table_ids)
        .then(function () {
            return util.retry({
                op: delete_route_table,
                args: route_table_ids,
                list: describe_route_tables_by_route_table_ids,
                validate: _.isEmpty,
                message: 'Deleting Route Tables'
            });
        });

};

let list_route_table_associations = function (route_table) {
    if (_.isArray(route_table)) {
        return _.flatten(_.map(route_table, list_route_table_associations));
    }

    let associations = [];

    _.each(route_table.Associations, function (route_table_association) {
        if (route_table_association.Main) {
            return;
        }

        associations.push({AssociationId: route_table_association.RouteTableAssociationId});
    });

    return associations;
};

let list_route_table_associations_by_route_table_ids = function (route_table_ids) {
    return describe_route_tables_by_route_table_ids(route_table_ids)
        .then(list_route_table_associations);
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#disassociateRouteTable-property
let disassociate_route_table = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {AssociationId: params};
    }
    return Promise.resolve(ec2.disassociateRouteTable(params).promise());
}, {message: 'Disassociating Route Table'});


let disassociate_route_tables_by_route_table_ids = function (route_table_ids) {
    if (!_.isArray(route_table_ids)) {
        route_table_ids = [route_table_ids];
    }

    return util.retry({
        args: route_table_ids,
        op: disassociate_route_table,
        op_args: list_route_table_associations_by_route_table_ids(route_table_ids),
        list: list_route_table_associations_by_route_table_ids,
        validate: _.isEmpty,
        message: 'Revoking Route Table Associations'
    });
};


module.exports = {
    delete_route_table: delete_route_table,
    delete_route_tables_by_route_table_ids: delete_route_tables_by_route_table_ids,
    describe_route_tables: describe_route_tables,
    describe_route_tables_by_route_table_ids: describe_route_tables_by_route_table_ids,
    describe_route_tables_by_vpc_ids: describe_route_tables_by_vpc_ids,
    disassociate_route_table: disassociate_route_table,
    disassociate_route_tables_by_route_table_ids: disassociate_route_tables_by_route_table_ids,
    list_route_table_associations: list_route_table_associations
};

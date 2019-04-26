const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('./ec2.js');


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeRouteTables-property
function list_route_tables(params) {
    return ec2.describeRouteTables(params).promise()
        .then(function (response) {
            return response.RouteTables;
        });
}

function list_route_tables_by_vpc_ids(vpc_ids) {
    return list_route_tables({
        Filters: [
            {
                Name: "vpc-id",
                Values: vpc_ids
            }
        ]
    });
}

function list_route_tables_by_ids(route_table_ids) {
    return list_route_tables({
        Filters: [
            {
                Name: "route-table-id",
                Values: route_table_ids
            }
        ]
    });
}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteRouteTable-property
// Note: You must terminate all running instances in the routeTable before you can delete the routeTable.
function delete_route_tables(route_table_ids) {
    if (_.isEmpty(route_table_ids)) {
        return Promise.resolve();
    }

    return Promise.map(route_table_ids, function (route_table_id) {
        console.log(`Deleting Route Table: ${route_table_id}`);
        return ec2.deleteRouteTable({RouteTableId: route_table_id}).promise()
    }, {concurrency: 1})
        .then(function () {
            return list_route_tables_by_ids(route_table_ids)
        })
        .then(function (route_tables) {
            if (!_.every(route_tables, {State: 'deleted'})) {
                return Promise.delay(15000)
                    .then(function () {
                        return delete_route_tables(route_table_ids);
                    })
            } else {
                console.log(`Deleted Route Tables: ${route_table_ids.join(', ')}`);
            }
        });

}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#disassociateRouteTable-property
// Note: You must terminate all running instances in the routeTable before you can disassociate the routeTable.
function disassociate_route_tables(route_table_ids) {

    function _list_route_table_associations(route_tables) {
        if (_.isNil(route_tables)) {
            route_tables = list_route_tables_by_ids(route_table_ids)
        } else {
            route_tables = Promise.resolve(route_tables);
        }

        return route_tables
            .then(function (route_tables) {
                let associations = [];

                _.each(route_tables, function (route_table) {

                    _.each(route_table.Associations, function (route_table_association) {
                        if (route_table_association.Main) {
                            return;
                        }

                        associations.push({
                            AssociationId: route_table_association.RouteTableAssociationId,
                            RouteTableId: route_table_association.RouteTableId,
                            SubnetId: route_table_association.Subdirectory,
                            VpcId: route_table.VpcId,
                        });
                    });
                });
                return associations;
            })
    }

    function _disassociate_route_table_associations(route_table_associations) {
        if (!_.isNil(route_table_associations)) {
            route_table_associations = Promise.resolve(route_table_associations);
        } else {
            route_table_associations = _list_route_table_associations();
        }

        return route_table_associations
            .then(function (route_table_associations) {
                if (!_.isEmpty(route_table_associations)) {
                    return Promise.map(route_table_associations, function (association) {
                        return ec2.disassociateRouteTable({AssociationId: association.AssociationId}).promise()
                    }, {concurrency: 1})
                }
            })
            .then(function () {
                return _list_route_table_associations()
            })
            .then(function (associations) {
                if (!_.isEmpty(associations)) {
                    return Promise.delay(15000)
                        .then(function () {
                            return _disassociate_route_table_associations(associations);
                        })
                }
            })
    }


    return _disassociate_route_table_associations();

}


module.exports = {
    list_route_tables: list_route_tables,
    list_route_tables_by_vpc_ids: list_route_tables_by_vpc_ids,
    list_route_tables_by_ids: list_route_tables_by_ids,
    disassociate_route_tables: disassociate_route_tables,
    delete_route_tables: delete_route_tables
};


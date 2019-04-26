// Refer to https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.htm

const lib = require('./lib');
const Promise = require('bluebird');
Promise.longStackTraces();
const _ = require('lodash');
const commander = require('commander');


commander
    .version('0.1.0')
    .arguments('[vpc_ids...]')
    .action(delete_vpcs);

commander.parse(process.argv);

function delete_vpcs(vpc_ids) {
    if (_.isEmpty(vpc_ids)){
        console.log("No VPC IDs supplied.");
        return Promise.resolve();
    }

    console.log(`Exploring VPCs ${vpc_ids.join(', ')}`);
    return lib.vpc.list_vpcs_by_ids(vpc_ids)
        .then(function (vpcs) {
            if (_.isEmpty(vpcs)) {
                console.log("No VPCs found.");
                return Promise.resolve();
            }


            let promises = [];


            let vpc_ids = _.map(vpcs, 'VpcId');

            promises.push({vpcs: vpc_ids});

            promises.push(Promise.props({instances: lib.instance.list_instances_by_vpc_ids(vpc_ids)}));

            promises.push(Promise.props({subnets: lib.subnet.list_subnets_by_vpc_ids(vpc_ids)}));

            promises.push(Promise.props({route_tables: lib.route_table.list_route_tables_by_vpc_ids(vpc_ids)}));

            promises.push(Promise.props({internet_gateways: lib.internet_gateway.list_internet_gateways_by_vpc_ids(vpc_ids)}));

            promises.push(Promise.props({nat_gateways: lib.nat_gateway.list_nat_gateways_by_vpc_ids(vpc_ids)}));

            promises.push(Promise.props({network_acls: lib.network_acl.list_network_acls_by_vpc_ids(vpc_ids)}));

            promises.push(Promise.props({security_groups: lib.security_group.list_security_groups_by_vpc_ids(vpc_ids)}));

            return Promise.all(promises).then(function (promises) {
                return _.merge.apply(null, _.concat([], promises));
            });
        })
        .then(function (props) {
            debug_log(props);
            let instance_ids = _.map(props.instances, 'InstanceId');
            let security_group_ids = _.map(_.reject(props.security_groups, {GroupName: 'default'}), 'GroupId');
            let network_acl_ids = _.map(_.reject(props.network_acls, {IsDefault: true}), 'NetworkAclId');
            let nat_gateway_ids = _.map(props.nat_gateways, 'NatGatewayId');
            let internet_gateway_ids = _.map(props.internet_gateways, 'InternetGatewayId');
            let route_table_ids = _.map(_.reject(props.route_tables, function (route_table) {
                return _.some(route_table.Associations, {Main: true})
            }), 'RouteTableId');

            let subnet_ids = _.map(_.reject(props.subnets, {DefaultForAz: true}), 'SubnetId');

            console.log('Deleting Instances');
            return lib.instance.terminate_instances(instance_ids)
                .then(function () {
                    console.log('Revoking Security Groups');
                    return lib.security_group.revoke_security_group_rules(security_group_ids)
                })
                .then(function () {
                    console.log('Deleting Security Groups');
                    return lib.security_group.delete_security_groups(security_group_ids)
                })
                .then(function () {
                    console.log('Replacing Network ACLs');
                    return lib.network_acl.replace_network_acl_associations(network_acl_ids)
                })
                .then(function () {
                    console.log('Deleting Network ACLs');
                    return lib.network_acl.delete_network_acls(network_acl_ids)
                })
                .then(function () {
                    console.log('Deleting NAT Gateways');
                    return lib.nat_gateway.delete_nat_gateways(nat_gateway_ids)
                })
                .then(function () {
                    console.log('Detaching Internet Gateways');
                    return lib.internet_gateway.detach_internet_gateways(internet_gateway_ids)
                })
                .then(function () {
                    console.log('Deleting Internet Gateways');
                    return lib.internet_gateway.delete_internet_gateways(internet_gateway_ids)
                })
                .then(function () {
                    console.log('Disassociating Route Tables');
                    return lib.route_table.disassociate_route_tables(route_table_ids)
                })
                .then(function () {
                    console.log('Deleting Route Tables');
                    return lib.route_table.delete_route_tables(route_table_ids)
                })
                .then(function () {
                    console.log('Deleting Subnets');
                    return lib.subnet.delete_subnets(subnet_ids)
                })
                .then(function () {
                    console.log('Deleting VPCs');
                    return lib.vpc.delete_vpcs(vpc_ids)
                })
                .then(function () {
                    console.log("Finished");
                })

        })
        .catch(function (err) {
            console.error(err.stack);
            process.exit(1);
        });

}


function debug_log(obj) {
    console.error(JSON.stringify(obj, null, 4));
}
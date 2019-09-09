const Promise = require('bluebird');
const _ = require('lodash');
const autoscaling = require('./autoscaling');
const ec2 = require('./ec2');
const eks = require('./eks');
const elbv2 = require('./elbv2');
const rds = require('./rds');
const route53 = require('./route53');
const vpc = require('./vpc');
const util = require('./util');

let list_vpc_resources = function (vpc_ids) {
    return Promise.props({
        vpcs: vpc.vpc.describe_vpcs_by_vpc_ids(vpc_ids),
        subnets: vpc.subnet.describe_subnets_by_vpc_ids(vpc_ids),
        network_acls: vpc.network_acl.describe_network_acls_by_vpc_ids(vpc_ids),
        security_groups: vpc.security_group.describe_security_groups_by_vpc_ids(vpc_ids),
        internet_gateways: vpc.internet_gateway.describe_internet_gateways_by_vpc_ids(vpc_ids),
        nat_gateways: vpc.nat_gateway.describe_nat_gateways_by_vpc_ids(vpc_ids),
        route_tables: vpc.route_table.describe_route_tables_by_vpc_ids(vpc_ids),
        eks_clusters: eks.cluster.describe_clusters_by_vpc_ids(vpc_ids),
        load_balancers: elbv2.load_balancer.describe_load_balancers_by_vpc_ids(vpc_ids),
        target_groups: elbv2.target_group.describe_target_groups_by_vpc_ids(vpc_ids),
        db_instances: rds.db_instance.describe_db_instances_by_vpc_ids(vpc_ids),
        db_subnet_groups: rds.db_subnet_group.describe_db_subnet_groups_by_vpc_ids(vpc_ids),
        route53_hosted_zones: route53.hosted_zone.describe_hosted_zones_by_vpc_ids(vpc_ids),
        ec2_instances: ec2.instance.describe_instances_by_vpc_ids(vpc_ids),
    })
        .then(function (props) {
            let subnet_ids = _.map(props.subnets, 'SubnetId');
            return Promise.props(_.merge({}, props, {
                launch_templates: ec2.launch_template.describe_launch_template_versions_by_subnet_ids(subnet_ids),
                autoscaling_groups: autoscaling.autoscaling_group.describe_autoscaling_groups_by_subnet_ids(subnet_ids)
            }));
        });
};


let delete_vpc_resources = function (resources) {
    if (!_.isPlainObject(resources)) {
        resources = list_vpc_resources(resources);
    }

    return Promise.resolve(resources)
        .then(function (props) {
            let vpc_ids = _.map(props.vpcs, 'VpcId');
            let subnet_ids = _.map(props.subnets, 'SubnetId');
            let network_acl_ids = _.map(props.network_acls, 'NetworkAclId');
            let security_group_ids = _.map(props.security_groups, 'GroupId');
            let internet_gateway_ids = _.map(props.internet_gateways, 'InternetGatewayId');
            let nat_gateway_ids = _.map(props.nat_gateways, 'NatGatewayId');
            let route_table_ids = _.map(props.route_tables, 'RouteTableId');
            let eks_cluster_names = _.map(props.eks_clusters, 'ClusterName');
            let load_balancer_arns = _.map(props.load_balancers, 'LoadBalancerArn');
            let target_group_arns = _.map(props.target_groups, 'TargetGroupArn');
            let db_instance_ids = _.map(props.db_instances, 'DbInstanceId');
            let db_subnet_group_ids = _.map(props.db_subnet_groups, 'DbSubnetGroupId');
            let route53_hosted_zone_ids = _.map(props.route53_hosted_zones, 'HostedZoneId');
            let ec2_instance_ids = _.map(props.ec2_instances, 'InstanceId');
            let launch_template_ids = _.map(props.launch_templates, 'LaunchTemplateId');
            let autoscaling_group_names = _.map(props.autoscaling_groups, 'AutoScalingGroupNames');

            let promise_queue = [];
            promise_queue.push({
                fn: rds.db_instance.delete_db_instances_by_db_instance_ids,
                args: db_instance_ids
            });
            promise_queue.push({
                fn: rds.db_subnet_group.delete_db_subnet_groups_by_db_subnet_group_ids,
                args: db_subnet_group_ids
            });

            promise_queue.push({
                fn: autoscaling.autoscaling_group.delete_autoscaling_groups_by_autoscaling_group_names,
                args: autoscaling_group_names
            });

            promise_queue.push({
                fn: elbv2.load_balancer.delete_load_balancers_by_load_balancer_arns,
                args: load_balancer_arns
            });

            promise_queue.push({
                fn: elbv2.target_group.delete_target_groups_by_target_group_arns,
                args: target_group_arns
            });


            promise_queue.push({
                fn: ec2.launch_template.delete_launch_templates_by_launch_template_ids,
                args: launch_template_ids
            });

            promise_queue.push({
                fn: ec2.instance.delete_instances_by_instance_ids,
                args: ec2_instance_ids
            });

            promise_queue.push({
                fn: eks.cluster.delete_clusters_by_cluster_arns,
                args: eks_cluster_names
            });

            promise_queue.push({
                fn: route53.hosted_zone.delete_hosted_zones_by_hosted_zone_ids,
                args: route53_hosted_zone_ids
            });

            promise_queue.push({
                fn: vpc.security_group.delete_security_groups_by_security_group_ids,
                args: security_group_ids
            });

            promise_queue.push({
                fn: vpc.network_acl.delete_network_acls_by_network_acl_ids,
                args: network_acl_ids
            });

            promise_queue.push({
                fn: vpc.nat_gateway.delete_nat_gateways_by_nat_gateway_ids,
                args: nat_gateway_ids
            });

            promise_queue.push({
                fn: vpc.internet_gateway.delete_internet_gateways_by_internet_gateway_ids,
                args: internet_gateway_ids
            });

            promise_queue.push({
                fn: vpc.route_table.delete_route_tables_by_route_table_ids,
                args: route_table_ids
            });

            promise_queue.push({
                fn: vpc.subnet.delete_subnets_by_subnet_ids,
                args: subnet_ids
            });


            promise_queue.push({
                fn: vpc.vpc.delete_vpcs_by_vpc_ids,
                args: vpc_ids
            });

            return util.queue(promise_queue);
        });
};

module.exports = {
    list_vpc_resources: list_vpc_resources,
    delete_vpc_resources: delete_vpc_resources
};

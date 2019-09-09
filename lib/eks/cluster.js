const Promise = require('bluebird');
const _ = require('lodash');
const eks = require('../aws').eks;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EKS.html#describeCluster-property
let describe_cluster = util.wrap(function (params) {
    return Promise.resolve(eks.describeCluster(params).promise())
        .then(function (results) {
            return _.get(results, 'cluster');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EKS.html#listClusters-property
let list_clusters = util.wrap(function (params) {
    return Promise.resolve(eks.listClusters(params).promise())
        .then(function (results) {
            return _.get(results, 'clusters');
        });
});


let describe_clusters = function (params) {
    return list_clusters(params)
        .then(function (clusters) {
            return describe_cluster(_.map(clusters, function (cluster) {
                return {name: cluster}
            }));
        })
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EKS.html#deleteCluster-property
let delete_cluster = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {name: params};
    }
    return Promise.resolve(eks.deleteCluster(params).promise());
}, {message: 'Deleting EKS Cluster'});


let describe_clusters_by_cluster_arns = function (cluster_arns) {
    if (!_.isArray(cluster_arns)) {
        cluster_arns = [cluster_arns];
    }
    return describe_clusters()
        .then(function (clusters) {
            return _.filter(clusters, function (cluster) {
                return _.includes(cluster_arns, cluster.arn)
            });
        });
};

let describe_clusters_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_clusters()
        .then(function (clusters) {
            return _.filter(clusters, function (cluster) {
                return _.includes(vpc_ids, cluster.resourcesVpcConfig.vpcId)
            });
        });
};


let delete_clusters_by_cluster_arns = function (cluster_arns) {
    if (!_.isArray(cluster_arns)) {
        cluster_arns = [cluster_arns];
    }
    return util.retry({
        args: cluster_arns,
        op: delete_cluster,
        list: describe_clusters_by_cluster_arns,
        validate: _.isEmpty,
        message: 'Deleting EKS Clusters'
    });
};


module.exports = {
    describe_cluster: describe_cluster,
    list_clusters: list_clusters,
    delete_cluster: delete_cluster,
    describe_clusters_by_cluster_arns: describe_clusters_by_cluster_arns,
    describe_clusters_by_vpc_ids: describe_clusters_by_vpc_ids,
    delete_clusters_by_cluster_arns: delete_clusters_by_cluster_arns,
};

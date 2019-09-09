const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeLaunchTemplates-property
let describe_launch_templates = util.wrap(function (params) {
    return Promise.resolve(ec2.describeLaunchTemplates(params).promise())
        .then(function (results) {
            return _.get(results, 'LaunchTemplates');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteLaunchTemplate-property
let delete_launch_template = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {LaunchTemplateId: params};
    }
    return Promise.resolve(ec2.deleteLaunchTemplate(params).promise());
}, {message: 'Deleting LaunchTemplate'});


let describe_launch_templates_by_launch_template_ids = function (launch_template_ids) {
    if (!_.isArray(launch_template_ids)) {
        launch_template_ids = [launch_template_ids];
    }
    return describe_launch_templates({LaunchTemplateIds: launch_template_ids});
};

let describe_launch_templates_versions = function (params) {
    if (_.isString(params)) {
        params = {LaunchTemplateId: params};
    }
    return Promise.resolve(ec2.describeLaunchTemplateVersions(params).promise())
        .then(function (results) {
            return _.get(results, 'LaunchTemplateVersions');
        });
};


let describe_launch_template_versions_by_subnet_ids = function (subnet_ids) {
    if (!_.isArray(subnet_ids)) {
        subnet_ids = [subnet_ids];
    }
    return describe_launch_templates()
        .then(function (launch_templates) {
            let launch_templates_map = {};
            _.each(launch_templates, function (launch_template) {
                launch_templates_map[launch_template.LaunchTemplateId] = Promise.props({
                    launch_template: launch_template,
                    launch_template_versions: describe_launch_templates_versions(launch_template.LaunchTemplateId)
                });
            });
            return Promise.props(launch_templates_map);
        })
        .then(function (launch_templates) {
            return _.filter(launch_templates, function (launch_template) {
                return _.some(launch_template.launch_template_versions, function (launch_template_version) {
                    return _.some(launch_template_version.NetworkInterfaces, function (network_interface) {
                        return _.includes(subnet_ids, network_interface.SubnetId);
                    })
                });
            });
        });
};


let delete_launch_templates_by_launch_template_ids = function (launch_template_ids) {
    if (!_.isArray(launch_template_ids)) {
        launch_template_ids = [launch_template_ids];
    }
    return util.retry({
        args: launch_template_ids,
        op: delete_launch_template,
        list: describe_launch_templates_by_launch_template_ids,
        validate: _.isEmpty,
        message: 'Deleting LaunchTemplates'
    });
};


module.exports = {
    describe_launch_templates: describe_launch_templates,
    delete_launch_template: delete_launch_template,
    describe_launch_templates_by_launch_template_ids: describe_launch_templates_by_launch_template_ids,
    describe_launch_template_versions_by_subnet_ids: describe_launch_template_versions_by_subnet_ids,
    delete_launch_templates_by_launch_template_ids: delete_launch_templates_by_launch_template_ids,
};

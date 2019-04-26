const _ = require('lodash');
module.exports = {
    ec2: require('./ec2'),
    internet_gateway: require('./internet_gateway'),
    nat_gateway: require('./nat_gateway'),
    network_acl: require('./network_acl'),
    route_table: require('./route_table'),
    security_group: require('./security_group'),
    subnet: require('./subnet'),
    instance: require('./instances'),
    vpc: require('./vpc')
};
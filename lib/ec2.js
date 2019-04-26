// Refer to https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.htm

process.env.BLUEBIRD_DEBUG = 1;

const AWS = require('aws-sdk');

AWS.config.apiVersions = {
    ec2: '2016-11-15'
};
AWS.config.region = 'ap-southeast-1';
AWS.config.setPromisesDependency(Promise);

module.exports = new AWS.EC2();


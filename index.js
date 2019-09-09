// Refer to https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.htm

const lib = require('./lib');
const Promise = require('bluebird');
Promise.longStackTraces();
const _ = require('lodash');
const commander = require('commander');
const node_path = require('path');
const fs = require('fs');


commander.version('0.1.0');

commander
    .command('list <vpc_ids...>')
    .option('-f, --file', 'Write resource JSON file')
    .action(function (vpc_ids, command_object) {
        return lib.list_vpc_resources(vpc_ids)
            .then(function (resources) {
                let resources_json = JSON.stringify(resources, null, 4);
                console.log(resources_json);

                let file_path = _.get(command_object, 'file');
                if (!_.isNil(file_path)) {
                    file_path = node_path.resolve(process.cwd(), file_path);
                    fs.writeFileSync(file_path, resources_json, 'utf8');
                    console.log(`Wrote resources to ${file_path}`);
                }
            })
            .catch(function (err) {
                console.error(err.stack);
                process.exit(1);
            });
    });

commander
    .command('delete <vpc_ids...>')
    .option('-f, --file', 'Read resource JSON file')
    .action(function (vpc_ids, command_object) {
        let file_path = _.get(command_object, 'file');
        let resources = null;
        if (!_.isNil(file_path)) {
            try {
                file_path = node_path.resolve(process.cwd(), file_path);
                resources = JSON.parse(fs.readFileSync(file_path, 'utf8'));
                console.log(`Read resources from ${file_path}`);
            } catch (err) {
                console.error(`Could not read resources from ${file_path}: ${err.stack}`);
                process.exit(1);
            }
        } else {
            resources = vpc_ids;
        }

        return lib.delete_vpc_resources(resources)
            .catch(function (err) {
                console.error(err.stack);
                process.exit(1);
            });
    });


commander.parse(process.argv);


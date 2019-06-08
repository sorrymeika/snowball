'use strict';

const path = require('path');
const fs = require('fs-extra');

function copySync(src, dest, excludes) {
  fs.copySync(src, dest, {
    dereference: true,
    filter: file => {
      return !excludes || !excludes.includes(file);
    },
  });
}

const _execSync = require('child_process').execSync;

const projectName = process.argv[2];
if (!projectName) {
  throw new Error('must input project name!');
}

const projectDir = path.join(process.cwd(), '../' + projectName);
if (fs.existsSync(projectDir)) {
  throw new Error('project dir is already exists!');
}

function execSync(command, options) {
  _execSync(command, {
    stdio: 'inherit',
    cwd: projectDir,
    ...options
  });
}

['package.json', 'package-lock.json', 'scripts', 'config', 'public'].forEach((fileName) => {
  copySync(fileName, path.join(projectDir, fileName));
});
execSync('cp -af ../snowball/template/* ./');

execSync('npm install');
execSync('ln -s ../../snowball/src ./node_modules/snowball');
execSync('open ' + projectDir);



import test from 'ava';
import * as chalk from 'chalk';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as ncp from 'ncp';
import * as path from 'path';
import * as pify from 'pify';
import * as rimraf from 'rimraf';
import * as tmp from 'tmp';

const pkg = require('../../package.json');

const rimrafp = pify(rimraf);
const mkdirp = pify(fs.mkdir);
const execp = pify(cp.exec);
const renamep = pify(fs.rename);
const ncpp = pify(ncp.ncp);

const keep = !!process.env.GTS_KEEP_TEMPDIRS;
const stagingDir = tmp.dirSync({keep: keep, unsafeCleanup: true});
const stagingPath = stagingDir.name;
const execOpts = {
  cwd: `${stagingPath}/kitchen`
};

/**
 * Create a staging directory with temp fixtures used
 * to test on a fresh application.
 */
test.before(async () => {
  try {
    await execp('npm pack');
    const tarball = `${pkg.name}-${pkg.version}.tgz`;
    await renamep(tarball, `${stagingPath}/google-ts-style.tgz`);
    await ncpp('test/fixtures', `${stagingPath}/`);
    await execp('npm install', execOpts);
  } catch (e) {
    console.error('Failed to prepare test staging sandbox.');
    console.error(e);
    throw e;
  }
});

test.serial('init', async t => {
  await execp('./node_modules/.bin/google-ts-style init -y', execOpts);
  fs.accessSync(`${stagingPath}/kitchen/tsconfig.json`);
  t.pass();
});

test.serial('build', async t => {
  await execp('npm run compile', execOpts);
  fs.accessSync(`${stagingPath}/kitchen/build/src/server.js`);
  fs.accessSync(`${stagingPath}/kitchen/build/src/server.js.map`);
  fs.accessSync(`${stagingPath}/kitchen/build/src/server.d.ts`);
  t.pass();
});

/**
 * Verify the `gts clean` command actually removes the
 * output dir
 */
test.serial('clean', async t => {
  await execp('npm run clean', execOpts);
  t.throws(() => {
    fs.accessSync(`${stagingPath}/kitchen/build`);
  });
});


/**
 * CLEAN UP - remove the staging directory when done.
 */
test.after.always('cleanup staging', async () => {
  if (!keep) {
    stagingDir.removeCallback();
  } else {
    console.log(`${chalk.blue(`${__filename} staging area: ${stagingPath}`)}`);
  }
});

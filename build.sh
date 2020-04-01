#!/bin/bash

build_dir=../apn-build
npm run build
cp run.sh "$build_dir/bundle"
(cd "$build_dir/bundle/programs/server" && npm install)

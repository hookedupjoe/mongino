# Mongino
A Robust Application Environment

* Author - W Joseph Francis
* (c) hookedup, inc. 2023-2024
* License - LGPL
* [mongino.com](https://mongino.com/)

## Requirements
* Windows, Mac or Linux (ubuntu recommended for headless server)
* Node 14 or higher, (18 recommended)
* MongoDB, v5+ recommended

## Quick Start
* Install Node 14+
* Setup MongoDB (authentication recommended)
* Install and verify access with MongoDB Compass
* Clone this repo into the folder it will be run from
* npm install
* npm audit fixup

## To Run
* npm start
* open http://localhost:33480/ or ctrl-click the link when started.

## To Update
* Open git directory
* git pull
* npm install
* npm audit fixup

Note: If git complains about package.json changing (i.e. from audit fixup)
* restore package.json
* then "git pull" again

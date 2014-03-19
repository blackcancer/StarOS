#!/bin/sh

SITE_PATH="/var/www/"
SRV_PATH="/opt/StarOS"

echo INSTALL SERVER
sudo mkdir -p $SRV_PATH
sudo cp -R ./srv/StarOS/* $SRV_PATH
sudo chmod -R 754 $SRV_PATH
sudo mkdir /var/log/StarOS
sudo chmod -R 644 /var/log/StarOS

echo INSTALL DAEMON
sudo cp ./etc/init.d/staros /etc/init.d/
sudo chmod +x /etc/init.d/staros
sudo update-rc.d staros defaults

echo INSTALL SITE
sudo mkdir -p $SITE_PATH
sudo cp -R ./www/* $SITE_PATH
sudo chmod -R 755 $SITE_PATH

echo INSTALL NODE MODULE
cd $SRV_PATH
sudo npm install socket.io
sudo /etc/init.d/staros start
#!/bin/sh

# PHP-FPMを起動
php-fpm82 -D

# Nginxをフォアグラウンドで起動
nginx -g 'daemon off;'

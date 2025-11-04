# 軽量なAlpine LinuxベースのNginx + PHP-FPM
FROM alpine:3.19

# 必要なパッケージをインストール
RUN apk add --no-cache \
    nginx \
    php82 \
    php82-fpm \
    php82-curl \
    php82-json \
    php82-openssl \
    php82-session

# Nginxの設定
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# PHP-FPMの設定
RUN sed -i 's/listen = 127.0.0.1:9000/listen = 9000/g' /etc/php82/php-fpm.d/www.conf

# 作業ディレクトリ
WORKDIR /var/www/html

# アプリケーションファイルをコピー
COPY public_html /var/www/html
COPY lib /var/www/lib

# パーミッション設定
RUN chown -R nginx:nginx /var/www && \
    chmod -R 755 /var/www

# ログディレクトリ
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

# ポート公開
EXPOSE 80

# 起動スクリプト
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]

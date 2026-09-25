# PostgreSQL with zh_CN.UTF-8 locale (official image lacks it by default)
FROM postgres:18

RUN localedef -i zh_CN -c -f UTF-8 -A /usr/share/locale/locale.alias zh_CN.UTF-8

ENV LANG=zh_CN.UTF-8
ENV LC_ALL=zh_CN.UTF-8

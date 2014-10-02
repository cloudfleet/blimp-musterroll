# cloudfleet musterroll
#
# VERSION 0.1

FROM dockerfile/nodejs

ADD . /opt/cloudfleet/app
WORKDIR /opt/cloudfleet/app

RUN scripts/install.sh

CMD scripts/start.sh

EXPOSE 80
EXPOSE 389


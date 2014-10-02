# cloudfleet musterroll
#
# VERSION 0.1

FROM dockerfile/nodejs

ADD . /opt/cloudfleet/musterroll
WORKDIR /opt/cloudfleet/musterroll
RUN scripts/install.sh

CMD scripts/start.sh

EXPOSE 80
EXPOSE 389


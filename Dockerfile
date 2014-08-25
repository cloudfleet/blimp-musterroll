# cloudfleet musterroll
#
# VERSION 0.1

FROM dockerfile/nodejs

ADD . /opt/cloudfleet/musterroll
RUN cd /opt/cloudfleet/musterroll/; scripts/install.sh

CMD $HOME/cockpit/scripts/start.sh

EXPOSE 389
EXPOSE 80

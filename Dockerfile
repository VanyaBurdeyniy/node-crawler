FROM node:latest

EXPOSE 80

COPY . /www
WORKDIR /www
RUN npm install

CMD ["npm","test"]
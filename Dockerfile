#tiktok-signature
FROM mcr.microsoft.com/playwright:v1.46.0-jammy AS base

RUN apt install nodejs

WORKDIR /usr

ADD package.json package.json
ADD package-lock.json package-lock.json
RUN npm i
ADD . .

ENV PORT 8080
EXPOSE 8080
CMD [ "node", "listen.js" ]

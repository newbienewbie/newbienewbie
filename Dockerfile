FROM mcr.microsoft.com/dotnet/core/aspnet:3.1 AS base
WORKDIR /app
EXPOSE 3000 

## pre-build aspnetcore app
FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS build
WORKDIR /src
COPY app/*.csproj ./

## build static blogs
FROM node:10 as hexo
WORKDIR /hexo
COPY app/hexo/. ./
WORKDIR /hexo
RUN npm install
RUN npm run hexo:g

## build site
FROM build as mixup
WORKDIR /src
COPY app/. ./
COPY --from=hexo /hexo/public/. static-blog/
RUN dotnet build App.csproj -c Release -o /app/build

## publish

### COPY hexo public
FROM mixup AS prepublish
WORKDIR /src
COPY --from=hexo /hexo/public/. /hexo/public/..

### publish ASP.NET Core
FROM prepublish AS publish
WORKDIR /src
RUN dotnet publish App.csproj -c Release -o /app/publish

### Run sample
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish/. .

ENTRYPOINT ["dotnet", "App.dll"]
CMD [ "--urls", "http://0.0.0.0:5000" ]
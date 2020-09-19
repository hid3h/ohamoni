FROM ruby:2.6.3 as dev-env

RUN apt-get update -qq
RUN apt-get install vim -y
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY . /myapp

# puma.sockを配置するディレクトリを作成
RUN mkdir -p tmp/sockets

VOLUME ["/myapp"]

# メインのイメージは特に何もつけなくて良い
FROM ruby:2.6.3

RUN apt-get update -qq
RUN apt-get install vim -y
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY . /myapp

# puma.sockを配置するディレクトリを作成
RUN mkdir -p tmp/sockets

VOLUME ["/myapp"]

ENV RAILS_ENV production

# CMD bundle exec puma
CMD rails s -b 0.0.0.0

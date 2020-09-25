class Api::V1::WebhookController < ApplicationController
  def receive
    events = params['events'][0]

    message = {
      type: 'text',
      text: events['message']['text']
    }
    client = Line::Bot::Client.new { |config|
      config.channel_secret = Rails.application.credentials.line[:channel_secret]
      config.channel_token  = Rails.application.credentials.line[:channel_token]
    }
    response = client.reply_message(events['replyToken'], message)
    p response
  end

  def test
    render :json => "test"
  end
end

class Api::V1::WebhookController < ApplicationController
  # https://developers.line.biz/ja/reference/messaging-api/#webhooks
  def receive
    if validate_sinature(channel_secret: mapkun_channel_secret)
      p "maupu strt"
      MapkunFinder.excuse(events: params['events'])
    end

    if validate_sinature(channel_secret: ohamoni_channel_secret)
      p "oha strt"
      Finder.excuse(events: params['events'])
    end
  end

  def test
    render :json => "test"
  end

  private

  def validate_sinature(channel_secret:)
    http_request_body = request.raw_post # Request body string
    p "http_request_body", http_request_body
    hash = OpenSSL::HMAC::digest(OpenSSL::Digest::SHA256.new, channel_secret, http_request_body)
    signature = Base64.strict_encode64(hash)
    # Compare X-Line-Signature request header string and the signature
    p "signature", signature, request.headers['X-Line-Signature']
    signature == request.headers['X-Line-Signature']
  end

  def mapkun_channel_secret
    ENV["LINE_CHANNEL_MAPKUN_SECRET"] || Rails.application.credentials.line[:channel_mapkun_secret]
  end

  def ohamoni_channel_secret
    ENV["LINE_CHANNEL_SECRET"] || Rails.application.credentials.line[:channel_secret]
  end
end

# {
#   "events"=>[
#     {
#       "type"=>"message",
#       "replyToken"=>"b55dbb48zzzzzz7fzzzzzz",
#       "source"=>{"userId"=>"Uc7zzzzzzzzzzzzzzzz", "type"=>"user"},
#       "timestamp"=>1602378060070,
#       "mode"=>"active",
#       "message"=>{"type"=>"text", "id"=>"112345677", "text"=>"起きた"}
#     }
#   ],

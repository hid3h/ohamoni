class Api::V1::WebhookController < ApplicationController
  # https://developers.line.biz/ja/reference/messaging-api/#webhooks
  def receive
    # TODO 署名チェック

    Finder.excuse(events: params['events'])
  end

  def test
    render :json => "test"
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
